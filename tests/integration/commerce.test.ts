import { beforeAll, beforeEach, afterAll, afterEach, describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type * as Commerce from '../../src/lib/commerce';
vi.mock('../../src/lib/mail', () => ({ sendMail: vi.fn() }));
const enabled = !!process.env.TEST_DATABASE_URL;
let db: PrismaClient, commerce: typeof Commerce;
const prefix = `test-${randomUUID()}`;
let users: string[] = [],
  addresses: string[] = [],
  variantId = '',
  productId = '';
let remote = 0;
describe.skipIf(!enabled)('MySQL transaction and gateway integration', () => {
  beforeAll(async () => {
    if (!new URL(process.env.TEST_DATABASE_URL!).pathname.includes('_test'))
      throw new Error('Use a dedicated database with _test in its name.');
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.RAZORPAY_KEY_ID = 'rzp_test_fixture';
    process.env.RAZORPAY_KEY_SECRET = 'fixture-secret';
    ({ db } = await import('../../src/lib/db'));
    commerce = await import('../../src/lib/commerce');
    const brand = await db.brand.create({ data: { name: prefix, slug: prefix } });
    const category = await db.category.create({ data: { name: prefix, slug: prefix } });
    const p = await db.product.create({
      data: {
        slug: prefix,
        title: 'Test phone',
        subtitle: 'Test',
        description: 'Integration test phone',
        specifications: {},
        brandId: brand.id,
        categoryId: category.id,
        minPrice: 100000,
        variants: {
          create: {
            sku: prefix,
            color: 'Black',
            colorHex: '#000000',
            ram: '8 GB',
            storage: '256 GB',
            price: 100000,
            originalPrice: 120000,
            stock: 2,
          },
        },
      },
      include: { variants: true },
    });
    productId = p.id;
    variantId = p.variants[0].id;
    for (let i = 0; i < 2; i++) {
      const user = await db.user.create({
        data: {
          email: `${prefix}-${i}@example.test`,
          name: 'Test Customer',
          passwordHash: 'not-a-login-hash',
          verified: true,
        },
      });
      users.push(user.id);
      const a = await db.address.create({
        data: {
          userId: user.id,
          name: 'Test Customer',
          phone: '9876543210',
          line1: '10 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
      });
      addresses.push(a.id);
    }
  });
  beforeEach(async () => {
    await db.payment.deleteMany({ where: { order: { userId: { in: users } } } });
    await db.order.deleteMany({ where: { userId: { in: users } } });
    await db.cartItem.deleteMany({ where: { userId: { in: users } } });
    await db.variant.update({ where: { id: variantId }, data: { stock: 2, reserved: 0 } });
    for (const userId of users)
      await db.cartItem.create({ data: { userId, variantId, quantity: 1 } });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, options: { body?: string }) => {
        const body = JSON.parse(options.body || '{}');
        return new Response(
          JSON.stringify({
            id: `order_${prefix.replaceAll('-', '')}${++remote}`,
            amount: body.amount,
            currency: body.currency,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());
  afterAll(async () => {
    if (!db) return;
    await db.payment.deleteMany({ where: { order: { userId: { in: users } } } });
    await db.order.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.product.deleteMany({ where: { id: productId } });
    await db.brand.deleteMany({ where: { slug: prefix } });
    await db.category.deleteMany({ where: { slug: prefix } });
    await db.webhookEvent.deleteMany({ where: { id: { startsWith: prefix } } });
    await db.$disconnect();
  });
  const payment = (o: { razorpayOrderId: string | null; total: number }) => ({
    id: `pay_${prefix.replaceAll('-', '')}${remote}`,
    order_id: o.razorpayOrderId!,
    amount: o.total,
    currency: 'INR',
    status: 'captured',
    method: 'upi',
  });
  it('calculates trusted totals and reuses a checkout key without reserving twice', async () => {
    const key = randomUUID();
    const order = await commerce.createCheckout(users[0], addresses[0], key);
    expect(order.subtotal).toBe(100000);
    expect(order.shipping).toBe(9900);
    expect(order.total).toBe(109900);
    const repeated = await commerce.createCheckout(users[0], addresses[0], key);
    expect(repeated.id).toBe(order.id);
    expect((await db.variant.findUniqueOrThrow({ where: { id: variantId } })).reserved).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('prevents two shoppers from reserving the final unit', async () => {
    await db.variant.update({ where: { id: variantId }, data: { stock: 1 } });
    const results = await Promise.allSettled(
      users.map((user, i) => commerce.createCheckout(user, addresses[i], randomUUID())),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    const v = await db.variant.findUniqueOrThrow({ where: { id: variantId } });
    expect(v.reserved).toBe(1);
    expect(v.stock).toBe(1);
  });
  it('handles concurrent duplicate captures without consuming inventory twice', async () => {
    const o = await commerce.createCheckout(users[0], addresses[0], randomUUID());
    const p = payment(o);
    await Promise.all([
      commerce.confirmPayment(p, `${prefix}-same`),
      commerce.confirmPayment(p, `${prefix}-same`),
    ]);
    const updated = await db.order.findUniqueOrThrow({
      where: { id: o.id },
      include: { payments: true },
    });
    expect(updated.paymentStatus).toBe('PAID');
    expect(updated.status).toBe('CONFIRMED');
    expect(updated.payments).toHaveLength(1);
    const v = await db.variant.findUniqueOrThrow({ where: { id: variantId } });
    expect(v.stock).toBe(1);
    expect(v.reserved).toBe(0);
  });
  it('rejects amount mismatches and authorized-only payments', async () => {
    const o = await commerce.createCheckout(users[0], addresses[0], randomUUID());
    await expect(commerce.confirmPayment({ ...payment(o), amount: o.total - 1 })).rejects.toThrow(
      'does not match',
    );
    await expect(
      commerce.confirmPayment({ ...payment(o), status: 'authorized' }),
    ).rejects.toThrow();
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).paymentStatus).toBe(
      'PENDING',
    );
  });
  it('releases expired stock and flags a late captured payment if stock was sold', async () => {
    await db.variant.update({ where: { id: variantId }, data: { stock: 1 } });
    const o = await commerce.createCheckout(users[0], addresses[0], randomUUID());
    await db.reservation.updateMany({
      where: { orderId: o.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await commerce.expireReservations();
    expect((await db.variant.findUniqueOrThrow({ where: { id: variantId } })).reserved).toBe(0);
    await db.variant.update({ where: { id: variantId }, data: { stock: 0 } });
    await commerce.confirmPayment(payment(o));
    const updated = await db.order.findUniqueOrThrow({ where: { id: o.id } });
    expect(updated.inventoryConflict).toBe(true);
    expect(updated.paymentStatus).toBe('PAID');
    expect(updated.status).toBe('PENDING');
    expect((await db.variant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(0);
  });
  it('rolls back inventory reservations when remote order creation fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 503 })),
    );
    await expect(commerce.createCheckout(users[0], addresses[0], randomUUID())).rejects.toThrow(
      'Payment service unavailable',
    );
    expect((await db.variant.findUniqueOrThrow({ where: { id: variantId } })).reserved).toBe(0);
    const o = await db.order.findFirstOrThrow({ where: { userId: users[0] } });
    expect(o.paymentStatus).toBe('FAILED');
  });
  it('restores inventory once on paid cancellation and blocks illegal transitions', async () => {
    const o = await commerce.createCheckout(users[0], addresses[0], randomUUID());
    await commerce.confirmPayment(payment(o));
    await commerce.transitionOrder(o.id, 'CANCELLED', users[0]);
    expect((await db.variant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(2);
    await expect(commerce.transitionOrder(o.id, 'CANCELLED', users[0])).rejects.toThrow(
      'not permitted',
    );
  });
  it('audits partial manual refunds, ignores duplicates, and prevents over-refunding', async () => {
    const o = await commerce.createCheckout(users[0], addresses[0], randomUUID());
    await commerce.confirmPayment(payment(o));
    await commerce.transitionOrder(o.id, 'CANCELLED', users[0]);
    const reference = prefix + '-refund';
    const part = await commerce.recordManualRefund(o.id, reference, 50000, users[0]);
    expect(part.refundStatus).toBe('PARTIAL');
    const repeated = await commerce.recordManualRefund(o.id, reference, 50000, users[0]);
    expect(repeated.refundAmount).toBe(50000);
    await expect(commerce.recordManualRefund(o.id, reference, 40000, users[0])).rejects.toThrow(
      'already been recorded',
    );
    await expect(
      commerce.recordManualRefund(o.id, reference + '-excess', o.total, users[0]),
    ).rejects.toThrow('remaining amount');
    const full = await commerce.recordManualRefund(
      o.id,
      reference + '-rest',
      o.total - 50000,
      users[0],
    );
    expect(full.refundStatus).toBe('REFUNDED');
    expect(full.refundAmount).toBe(o.total);
    expect(
      await db.orderHistory.count({
        where: { orderId: o.id, note: { startsWith: 'Manual refund' } },
      }),
    ).toBe(2);
  });
  it('does not enable live payment keys without explicit activation', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_live_fixture';
    delete process.env.PAYMENTS_LIVE_ENABLED;
    await expect(commerce.createCheckout(users[0], addresses[0], randomUUID())).rejects.toThrow(
      'Live payments are disabled',
    );
    process.env.RAZORPAY_KEY_ID = 'rzp_test_fixture';
  });
});
