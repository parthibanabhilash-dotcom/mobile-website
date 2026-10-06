import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { db } from './db';
import { HttpError } from './security';
import { shippingCost, paymentMatches, canTransition } from './rules';
import { sendMail } from './mail';
type Tx = Prisma.TransactionClient;
export async function serial<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  for (let i = 0; i < 4; i++) {
    try {
      return await db.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2034', 'P2002'].includes(e.code) &&
        i < 3
      )
        continue;
      throw e;
    }
  }
  throw new Error('Transaction retry failed');
}
export async function settings() {
  const values = await db.setting.findMany();
  const get = (key: string, fallback: number) =>
    values.find((v) => v.key === key)?.value ?? fallback;
  return {
    freeShippingThreshold: get('freeShippingThreshold', 500000),
    shippingFee: get('shippingFee', 9900),
    lowStockThreshold: get('lowStockThreshold', 5),
  };
}
function paymentConfig() {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret)
    throw new HttpError(503, 'Razorpay test credentials have not been configured.');
  if (!key.startsWith('rzp_test_') && process.env.PAYMENTS_LIVE_ENABLED !== 'true')
    throw new HttpError(503, 'Live payments are disabled.');
  return { key, secret };
}
export async function razorpay<T>(resource: string, body?: unknown): Promise<T> {
  const { key, secret } = paymentConfig();
  let base = 'https://api.razorpay.com/v1';
  // Isolated integration tests may use a loopback gateway. Production always uses Razorpay.
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.TEST_RAZORPAY_API_URL &&
    key.startsWith('rzp_test_')
  ) {
    const testURL = new URL(process.env.TEST_RAZORPAY_API_URL);
    if (!['127.0.0.1', 'localhost'].includes(testURL.hostname))
      throw new Error('Test gateway must use loopback');
    base = testURL.toString().replace(/\/$/, '');
  }
  const response = await fetch(`${base}/${resource}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });
  if (!response.ok) {
    console.error(JSON.stringify({ event: 'razorpay_error', status: response.status }));
    throw new HttpError(502, 'Payment service unavailable. Please try again.');
  }
  return response.json();
}
export async function releaseReservations(tx: Tx, orderId: string) {
  const active = await tx.reservation.findMany({ where: { orderId, status: 'ACTIVE' } });
  for (const r of active) {
    await tx.variant.update({
      where: { id: r.variantId },
      data: { reserved: { decrement: r.quantity } },
    });
    await tx.reservation.update({ where: { id: r.id }, data: { status: 'RELEASED' } });
  }
}
export async function expireReservations() {
  const expired = await db.reservation.findMany({
    where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
    select: { orderId: true },
    distinct: ['orderId'],
    take: 100,
  });
  for (const { orderId } of expired) {
    await serial(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (order && order.paymentStatus !== 'PAID') {
        await releaseReservations(tx, orderId);
        await tx.order.update({ where: { id: orderId }, data: { paymentStatus: 'EXPIRED' } });
      }
    });
  }
  return expired.length;
}
export async function createCheckout(userId: string, addressId: string, key: string) {
  const config = paymentConfig();
  await expireReservations();
  const existing = await db.order.findUnique({ where: { checkoutKey: key } });
  if (existing) {
    if (existing.userId !== userId) throw new HttpError(403, 'Invalid checkout.');
    if (['FAILED', 'EXPIRED'].includes(existing.paymentStatus))
      throw new HttpError(409, 'This checkout expired. Start a new checkout.');
    if (!existing.razorpayOrderId)
      throw new HttpError(409, 'Checkout is being prepared. Refresh your orders before retrying.');
    const active = await db.reservation.count({
      where: { orderId: existing.id, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    });
    if (!active && existing.paymentStatus !== 'PAID')
      throw new HttpError(409, 'Checkout reservation expired. Start again.');
    return { ...existing, keyId: config.key };
  }
  const address = await db.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw new HttpError(400, 'Select a saved address.');
  const fees = await settings();
  const order = await serial(async (tx) => {
    const cart = await tx.cartItem.findMany({
      where: { userId },
      include: {
        variant: {
          include: { product: { include: { images: { orderBy: { position: 'asc' }, take: 1 } } } },
        },
      },
    });
    if (!cart.length) throw new HttpError(400, 'Your cart is empty.');
    let subtotal = 0;
    for (const item of cart) {
      const v = item.variant;
      if (v.product.status !== 'ACTIVE' || v.stock - v.reserved < item.quantity)
        throw new HttpError(409, `${v.product.title} is no longer available in this quantity.`);
      subtotal += v.price * item.quantity;
    }
    const shipping = shippingCost(subtotal, fees.freeShippingThreshold, fees.shippingFee);
    if (subtotal + shipping > 2147483647)
      throw new HttpError(
        400,
        'Order exceeds the checkout limit. Please split it into smaller orders.',
      );
    const created = await tx.order.create({
      data: {
        userId,
        number: `MS-${new Date().getFullYear()}-${randomBytes(5).toString('hex').toUpperCase()}`,
        checkoutKey: key,
        address: JSON.parse(JSON.stringify(address)),
        subtotal,
        shipping,
        total: subtotal + shipping,
        items: {
          create: cart.map((c) => ({
            variantId: c.variantId,
            title: c.variant.product.title,
            image: c.variant.product.images[0]?.url || '/products/iphone-pro.webp',
            variantLabel: [c.variant.color, c.variant.ram, c.variant.storage]
              .filter((v) => v !== 'N/A')
              .join(' · '),
            quantity: c.quantity,
            price: c.variant.price,
          })),
        },
        history: {
          create: { status: 'PENDING', note: 'Order placed. Awaiting verified payment.' },
        },
      },
    });
    for (const item of cart) {
      await tx.variant.update({
        where: { id: item.variantId },
        data: { reserved: { increment: item.quantity } },
      });
      await tx.reservation.create({
        data: {
          orderId: created.id,
          variantId: item.variantId,
          quantity: item.quantity,
          expiresAt: new Date(Date.now() + 15 * 60000),
        },
      });
    }
    return created;
  });
  try {
    const remote = await razorpay<{ id: string }>('orders', {
      amount: order.total,
      currency: 'INR',
      receipt: order.number,
      notes: { local_order_id: order.id },
    });
    const updated = await db.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: remote.id },
    });
    return { ...updated, keyId: config.key };
  } catch (e) {
    await serial(async (tx) => {
      await releaseReservations(tx, order.id);
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'FAILED' } });
    });
    throw e;
  }
}
export type GatewayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
};
export async function confirmPayment(payment: GatewayPayment, eventId?: string) {
  let newlyConfirmed = false;
  const result = await serial(async (tx) => {
    newlyConfirmed = false;
    if (eventId && (await tx.webhookEvent.findUnique({ where: { id: eventId } }))) return null;
    const order = await tx.order.findUnique({
      where: { razorpayOrderId: payment.order_id },
      include: { reservations: true, items: true },
    });
    if (!order) throw new HttpError(404, 'Payment order not found.');
    if (!paymentMatches(payment, order))
      throw new HttpError(409, 'Payment is not captured or does not match this order.');
    if (eventId) await tx.webhookEvent.create({ data: { id: eventId } });
    const existing = await tx.payment.findUnique({ where: { providerId: payment.id } });
    if (existing) return order;
    await tx.payment.create({
      data: {
        orderId: order.id,
        providerId: payment.id,
        amount: payment.amount,
        method: payment.method,
        status: 'CAPTURED',
      },
    });
    if (order.paymentStatus === 'PAID') {
      await tx.orderHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          note: 'Additional captured payment requires manual reconciliation.',
        },
      });
      return order;
    }
    let conflict = order.status === 'CANCELLED';
    // Re-check available stock when a capture arrives after a reservation expired.
    for (const item of order.items) {
      const variant = await tx.variant.findUniqueOrThrow({ where: { id: item.variantId } });
      const reservation = order.reservations.find(
        (r) => r.variantId === item.variantId && r.status === 'ACTIVE',
      );
      if (variant.stock - (variant.reserved - (reservation?.quantity || 0)) < item.quantity)
        conflict = true;
    }
    if (!conflict) {
      for (const item of order.items) {
        const reservation = order.reservations.find(
          (r) => r.variantId === item.variantId && r.status === 'ACTIVE',
        );
        await tx.variant.update({
          where: { id: item.variantId },
          data: {
            stock: { decrement: item.quantity },
            reserved: { decrement: reservation?.quantity || 0 },
          },
        });
        if (reservation)
          await tx.reservation.update({
            where: { id: reservation.id },
            data: { status: 'CONSUMED' },
          });
      }
    } else await releaseReservations(tx, order.id);
    await tx.cartItem.deleteMany({
      where: { userId: order.userId, variantId: { in: order.items.map((i) => i.variantId) } },
    });
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        status: conflict ? order.status : 'CONFIRMED',
        inventoryConflict: conflict,
        history: {
          create: {
            status: conflict ? order.status : 'CONFIRMED',
            note: conflict
              ? 'Payment verified. Manual inventory/fulfilment review required.'
              : 'Payment captured and verified. Order confirmed.',
          },
        },
      },
    });
    newlyConfirmed = true;
    return updated;
  });
  if (newlyConfirmed && result) {
    try {
      const user = await db.user.findUniqueOrThrow({ where: { id: result.userId } });
      await sendMail(
        user.email,
        `Mobile Shop · ${result.number}`,
        `Your payment has been verified. ${result.inventoryConflict ? 'Your order requires a stock review. Our team will contact you.' : 'Your order is confirmed.'}\nOrder: ${result.number}\nView your order: ${process.env.APP_URL || 'http://localhost:3000'}/account/orders/${result.id}`,
      );
    } catch (e) {
      console.error(
        JSON.stringify({
          event: 'order_email_failed',
          orderId: result.id,
          message: e instanceof Error ? e.message : 'Unknown',
        }),
      );
    }
  }
  return result;
}
export async function transitionOrder(
  orderId: string,
  to: string,
  actorId: string,
  tracking?: string,
) {
  if (tracking !== undefined) {
    const current = await db.order.findUnique({ where: { id: orderId } });
    if (current?.status === to) {
      return serial(async (tx) => {
        const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
        if (order.status !== to)
          throw new HttpError(409, 'Order status changed. Refresh before updating tracking.');
        if (order.paymentStatus !== 'PAID' || ['CANCELLED', 'RETURNED'].includes(to))
          throw new HttpError(409, 'Tracking cannot be updated for this order.');
        return tx.order.update({
          where: { id: orderId },
          data: {
            tracking,
            history: { create: { status: to, note: 'Tracking information updated.', actorId } },
          },
        });
      });
    }
  }
  return serial(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, reservations: true },
    });
    if (!order) throw new HttpError(404, 'Order not found.');
    if (!canTransition(order.status, to))
      throw new HttpError(409, 'This order status transition is not permitted.');
    if (to !== 'CANCELLED' && order.paymentStatus !== 'PAID')
      throw new HttpError(409, 'Payment must be verified first.');
    if (order.inventoryConflict && to !== 'CANCELLED')
      throw new HttpError(409, 'Cancel and manually refund this inventory-conflicted order.');
    if (to === 'CANCELLED') {
      await releaseReservations(tx, orderId);
      if (order.paymentStatus === 'PAID' && !order.inventoryConflict)
        for (const item of order.items)
          await tx.variant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
    }
    return tx.order.update({
      where: { id: orderId },
      data: {
        status: to,
        ...(tracking !== undefined ? { tracking } : {}),
        history: {
          create: {
            status: to,
            note: `Status updated to ${to.toLowerCase().replaceAll('_', ' ')}.`,
            actorId,
          },
        },
      },
    });
  });
}
// History is the append-only audit ledger; totals are updated in the same serial transaction.
export async function recordManualRefund(
  orderId: string,
  reference: string,
  amount: number,
  actorId: string,
) {
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    reference.trim().length < 3 ||
    reference.length > 200
  )
    throw new HttpError(400, 'Invalid refund details.');
  const prefix = `Manual refund ${JSON.stringify(reference.trim())} · `;
  const note = `${prefix}${amount} paise recorded.`;
  return serial(async (tx) => {
    const previous = await tx.orderHistory.findFirst({ where: { note: { startsWith: prefix } } });
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new HttpError(404, 'Order not found.');
    if (previous) {
      if (previous.orderId === orderId && previous.note === note) return order;
      throw new HttpError(409, 'This refund reference has already been recorded.');
    }
    if (
      order.paymentStatus !== 'PAID' ||
      !['CANCELLED', 'RETURNED'].includes(order.status) ||
      amount > order.total - order.refundAmount
    )
      throw new HttpError(409, 'Refund exceeds the remaining amount or is not permitted.');
    const total = order.refundAmount + amount;
    return tx.order.update({
      where: { id: orderId },
      data: {
        refundStatus: total === order.total ? 'REFUNDED' : 'PARTIAL',
        refundAmount: total,
        refundReference: reference.trim(),
        history: { create: { status: order.status, note, actorId } },
      },
    });
  });
}
