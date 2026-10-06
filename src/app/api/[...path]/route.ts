import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { db, demoMode } from '@/lib/db';
import {
  currentUser,
  requireUser,
  HttpError,
  checkOrigin,
  rateLimit,
  passwordHash,
  passwordMatches,
  hash,
  createSession,
  signatureValid,
} from '@/lib/security';
import { email, password, addressSchema, cartSchema, productSchema } from '@/lib/validation';
import { sendAuthToken } from '@/lib/mail';
import {
  createCheckout,
  razorpay,
  confirmPayment,
  expireReservations,
  settings,
  transitionOrder,
  recordManualRefund,
  serial,
  type GatewayPayment,
} from '@/lib/commerce';
import { productInclude, toProduct } from '@/lib/catalog';
import { demoProducts } from '@/lib/catalog-data';
import { dashboardMetrics } from '@/lib/admin-metrics';
import { Prisma } from '@prisma/client';
import { queryCatalog } from '@/lib/catalog-query';
import { orderStatuses } from '@/lib/rules';
import { paymentMatches } from '@/lib/rules';
type Context = { params: Promise<{ path: string[] }> };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
async function handler(req: Request, context: Context) {
  try {
    const { path } = await context.params;
    const route = path.join('/');
    const method = req.method;
    const url = new URL(req.url);
    if (route === 'health') {
      if (!process.env.DATABASE_URL)
        return json({ status: demoMode() ? 'demo' : 'unconfigured' }, demoMode() ? 200 : 503);
      await db.$queryRaw`SELECT 1`;
      return json({ status: 'ok' });
    }
    if (route === 'catalog' && method === 'GET') return json(await queryCatalog(url.searchParams));
    if (route === 'catalog/lookup' && method === 'GET') {
      const variants = (url.searchParams.get('variants') || '')
          .split(',')
          .filter(Boolean)
          .slice(0, 50),
        ids = (url.searchParams.get('products') || '').split(',').filter(Boolean).slice(0, 204);
      if (demoMode())
        return json({
          products: demoProducts.filter(
            (p) => ids.includes(p.id) || p.variants.some((v) => variants.includes(v.id)),
          ),
        });
      const products = await db.product.findMany({
        where: {
          status: 'ACTIVE',
          OR: [{ id: { in: ids } }, { variants: { some: { id: { in: variants } } } }],
        },
        include: productInclude,
        take: 254,
      });
      return json({ products: products.map(toProduct) });
    }
    if (route === 'settings' && method === 'GET')
      return json(
        demoMode()
          ? { freeShippingThreshold: 500000, shippingFee: 9900, lowStockThreshold: 5 }
          : await settings(),
      );
    if (route === 'auth/me' && method === 'GET')
      return json({ user: await currentUser(), demo: demoMode() });
    if (demoMode())
      throw new HttpError(
        503,
        'This is a catalog preview. Configure PostgreSQL to enable accounts, orders, and admin tools.',
      );
    if (route === 'payments/webhook') {
      if (method !== 'POST') throw new HttpError(405, 'Method not allowed');
      const body = await req.text();
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!secret || !signatureValid(body, req.headers.get('x-razorpay-signature') || '', secret))
        throw new HttpError(400, 'Invalid webhook signature');
      const event = JSON.parse(body);
      const eventId = req.headers.get('x-razorpay-event-id') || hash(body);
      if (['payment.captured', 'order.paid'].includes(event.event)) {
        const entity = event.payload?.payment?.entity;
        if (!entity?.id) throw new HttpError(400, 'Missing payment entity');
        const remote = await razorpay<GatewayPayment>(`payments/${encodeURIComponent(entity.id)}`);
        await confirmPayment(remote, eventId);
      }
      return json({ received: true });
    }
    if (route === 'cron/expire' && method === 'POST') {
      if (
        !process.env.CRON_SECRET ||
        req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
      )
        throw new HttpError(401, 'Unauthorized');
      const expired = await expireReservations();
      await Promise.all([
        db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
        db.authToken.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
        db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
      ]);
      return json({ expired });
    }
    if (method !== 'GET') checkOrigin(req);
    const body = method === 'GET' ? {} : await req.json();
    if (route.startsWith('auth/')) {
      if (method !== 'POST') throw new HttpError(405, 'Method not allowed');
      if (route === 'auth/logout') {
        const token = (await cookies()).get('mobile_session')?.value;
        if (token) await db.session.deleteMany({ where: { tokenHash: hash(token) } });
        (await cookies()).delete('mobile_session');
        return json({ ok: true });
      }
      // Rate limiting is keyed by submitted identity, never by an untrusted forwarding header.
      await rateLimit(
        `auth:${route}:${hash(String(body.email || body.token || 'unknown').toLowerCase())}`,
        10,
      );
      if (route === 'auth/register') {
        const data = z
          .object({ name: z.string().trim().min(2).max(100), email, password })
          .parse(body);
        const exists = await db.user.findUnique({ where: { email: data.email } });
        if (!exists) {
          const user = await db.user.create({
            data: {
              name: data.name,
              email: data.email,
              passwordHash: await passwordHash(data.password),
            },
          });
          await sendAuthToken(user.id, user.email, 'VERIFY');
        }
        return json({
          message:
            'If this email is available, a verification link has been sent. Please verify before signing in.',
        });
      }
      if (route === 'auth/login') {
        const data = z.object({ email, password: z.string().max(128) }).parse(body);
        const user = await db.user.findUnique({ where: { email: data.email } });
        if (!user || !(await passwordMatches(data.password, user.passwordHash)))
          throw new HttpError(401, 'Incorrect email or password.');
        if (!user.verified) throw new HttpError(403, 'Please verify your email before signing in.');
        await createSession(user.id);
        return json({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            verified: user.verified,
          },
        });
      }
      if (route === 'auth/forgot' || route === 'auth/resend') {
        const data = z.object({ email }).parse(body);
        const user = await db.user.findUnique({ where: { email: data.email } });
        if (user && (route === 'auth/forgot' || !user.verified))
          await sendAuthToken(user.id, user.email, route === 'auth/forgot' ? 'RESET' : 'VERIFY');
        return json({ message: 'If the account exists, an email has been sent.' });
      }
      if (route === 'auth/verify' || route === 'auth/reset') {
        const token = z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .parse(body.token);
        const newPassword = route === 'auth/reset' ? password.parse(body.password) : undefined;
        await serial(async (tx) => {
          const record = await tx.authToken.findUnique({ where: { tokenHash: hash(token) } });
          if (
            !record ||
            record.expiresAt < new Date() ||
            record.type !== (route === 'auth/verify' ? 'VERIFY' : 'RESET')
          )
            throw new HttpError(400, 'This link is invalid or has expired.');
          await tx.user.update({
            where: { id: record.userId },
            data: newPassword
              ? { passwordHash: await passwordHash(newPassword) }
              : { verified: true },
          });
          await tx.authToken.deleteMany({ where: { userId: record.userId, type: record.type } });
          if (newPassword) await tx.session.deleteMany({ where: { userId: record.userId } });
        });
        return json({
          message:
            route === 'auth/verify'
              ? 'Email verified. You can now sign in.'
              : 'Password updated. Please sign in.',
        });
      }
    }
    if (route === 'newsletter' && method === 'POST') {
      const data = z.object({ email, consent: z.literal(true) }).parse(body);
      await rateLimit(`newsletter:${hash(data.email)}`, 3);
      await db.newsletter.upsert({
        where: { email: data.email },
        create: { email: data.email },
        update: {},
      });
      return json({ message: 'You’re on the list. Thank you!' });
    }
    const user = await requireUser(route.startsWith('admin/'));
    if (method !== 'GET') await rateLimit(`mutation:${user.id}`, 150, 60);
    if (route === 'account' && method === 'GET') {
      const [orders, addresses, wishlist, cart] = await Promise.all([
        db.order.findMany({
          where: { userId: user.id },
          include: { items: true, payments: true, history: { orderBy: { createdAt: 'asc' } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        db.address.findMany({ where: { userId: user.id } }),
        db.wishlist.findMany({
          where: { userId: user.id },
          include: { product: { include: productInclude } },
        }),
        db.cartItem.findMany({
          where: { userId: user.id },
          include: { variant: { include: { product: { include: productInclude } } } },
        }),
      ]);
      return json({
        user,
        orders,
        addresses,
        wishlist: wishlist.map((w) => toProduct(w.product)),
        cart: cart.map((c) => ({ variantId: c.variantId, quantity: c.quantity })),
        cartProducts: cart.map((c) => toProduct(c.variant.product)),
      });
    }
    if (route === 'account/profile' && method === 'PATCH') {
      const name = z.string().trim().min(2).max(100).parse(body.name);
      await db.user.update({ where: { id: user.id }, data: { name } });
      return json({ ok: true });
    }
    if (route === 'addresses') {
      if (method === 'GET') return json(await db.address.findMany({ where: { userId: user.id } }));
      if (method === 'POST')
        return json(
          await db.address.create({ data: { ...addressSchema.parse(body), userId: user.id } }),
        );
      if (method === 'DELETE') {
        await db.address.deleteMany({ where: { id: z.string().parse(body.id), userId: user.id } });
        return json({ ok: true });
      }
    }
    if (route === 'cart') {
      if (method === 'GET')
        return json(
          await db.cartItem.findMany({
            where: { userId: user.id },
            include: { variant: { include: { product: { include: productInclude } } } },
          }),
        );
      if (method === 'PUT') {
        const data = cartSchema.parse(body);
        const unique = new Set(data.items.map((i) => i.variantId));
        if (unique.size !== data.items.length) throw new HttpError(400, 'Duplicate cart variant');
        await db.$transaction(async (tx) => {
          const variants = await tx.variant.findMany({
            where: { id: { in: [...unique] }, product: { status: 'ACTIVE' } },
          });
          if (variants.length !== unique.size) throw new HttpError(400, 'A product is unavailable');
          for (const item of data.items) {
            const v = variants.find((v) => v.id === item.variantId)!;
            if (v.stock - v.reserved < item.quantity)
              throw new HttpError(409, 'Requested quantity is unavailable');
          }
          await tx.cartItem.deleteMany({ where: { userId: user.id } });
          await tx.cartItem.createMany({
            data: data.items.map((i) => ({ ...i, userId: user.id })),
          });
        });
        return json({ ok: true });
      }
    }
    if (route === 'wishlist' && method === 'PUT') {
      const data = z.object({ productId: z.string(), saved: z.boolean() }).parse(body);
      if (data.saved)
        await db.wishlist.upsert({
          where: { userId_productId: { userId: user.id, productId: data.productId } },
          create: { userId: user.id, productId: data.productId },
          update: {},
        });
      else await db.wishlist.deleteMany({ where: { userId: user.id, productId: data.productId } });
      return json({ ok: true });
    }
    if (route === 'reviews' && method === 'POST') {
      const data = z
        .object({
          productId: z.string(),
          rating: z.number().int().min(1).max(5),
          text: z.string().trim().min(10).max(2000),
        })
        .parse(body);
      const purchase = await db.orderItem.findFirst({
        where: {
          variant: { productId: data.productId },
          order: { userId: user.id, status: 'DELIVERED', paymentStatus: 'PAID' },
        },
      });
      if (!purchase)
        throw new HttpError(403, 'Reviews are available after a verified purchase is delivered.');
      return json(
        await serial(async (tx) => {
          const review = await tx.review.upsert({
            where: { userId_productId: { userId: user.id, productId: data.productId } },
            create: { ...data, userId: user.id },
            update: { rating: data.rating, text: data.text },
          });
          const summary = await tx.review.aggregate({
            where: { productId: data.productId },
            _avg: { rating: true },
            _count: true,
          });
          await tx.product.update({
            where: { id: data.productId },
            data: { ratingScore: summary._avg.rating || 0, reviewsCount: summary._count },
          });
          return review;
        }),
      );
    }
    if (route === 'checkout' && method === 'POST') {
      const data = z.object({ addressId: z.string(), key: z.uuid() }).parse(body);
      await rateLimit(`checkout:${user.id}`, 20, 3600);
      if (!user.verified) throw new HttpError(403, 'Verify your email first');
      return json(await createCheckout(user.id, data.addressId, data.key));
    }
    if (route === 'payments/verify' && method === 'POST') {
      const data = z
        .object({
          orderId: z.string(),
          razorpay_payment_id: z.string().regex(/^pay_[a-zA-Z0-9]+$/),
          razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
        })
        .parse(body);
      const order = await db.order.findFirst({ where: { id: data.orderId, userId: user.id } });
      if (!order?.razorpayOrderId) throw new HttpError(404, 'Order not found');
      if (
        !process.env.RAZORPAY_KEY_SECRET ||
        !signatureValid(
          `${order.razorpayOrderId}|${data.razorpay_payment_id}`,
          data.razorpay_signature,
          process.env.RAZORPAY_KEY_SECRET,
        )
      )
        throw new HttpError(400, 'Payment signature verification failed');
      const remote = await razorpay<GatewayPayment>(`payments/${data.razorpay_payment_id}`);
      if (remote.status !== 'captured') return json({ status: 'PENDING', orderId: order.id }, 202);
      const confirmed = await confirmPayment(remote);
      return json({ status: 'PAID', order: confirmed });
    }
    if (route === 'payments/reconcile' && method === 'POST') {
      const id = z.string().parse(body.orderId);
      await rateLimit(`reconcile:${user.id}`, 60, 300);
      const order = await db.order.findFirst({ where: { id, userId: user.id } });
      if (!order?.razorpayOrderId) throw new HttpError(404, 'Order not found');
      if (order.paymentStatus === 'PAID') return json({ status: 'PAID' });
      const remote = await razorpay<{ items: GatewayPayment[] }>(
        `orders/${encodeURIComponent(order.razorpayOrderId)}/payments`,
      );
      const captured = remote.items.find((p) => paymentMatches(p, order));
      if (captured) await confirmPayment(captured);
      return json({ status: captured ? 'PAID' : order.paymentStatus });
    }
    if (route.startsWith('orders/') && method === 'GET') {
      const order = await db.order.findFirst({
        where: { id: path[1], ...(user.role === 'ADMIN' ? {} : { userId: user.id }) },
        include: { items: true, payments: true, history: { orderBy: { createdAt: 'asc' } } },
      });
      if (!order) throw new HttpError(404, 'Order not found');
      return json(order);
    }
    if (route === 'admin/dashboard' && method === 'GET') return json(await dashboardMetrics());
    if (route.startsWith('admin/products/') && method === 'GET') {
      const p = await db.product.findUnique({ where: { id: path[2] }, include: productInclude });
      if (!p) throw new HttpError(404, 'Product not found');
      return json({ ...toProduct(p), seoTitle: p.seoTitle, seoDescription: p.seoDescription });
    }
    if (route === 'admin/products' && method === 'GET') {
      const q = (url.searchParams.get('q') || '').slice(0, 100),
        category = url.searchParams.get('category'),
        brand = url.searchParams.get('brand'),
        status = url.searchParams.get('status'),
        stock = url.searchParams.get('stock');
      const page = Math.max(1, Math.floor(Number(url.searchParams.get('page')) || 1));
      const where = {
        ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
        ...(category ? { category: { name: category } } : {}),
        ...(brand ? { brand: { name: brand } } : {}),
        ...(status ? { status } : {}),
      };
      // Stock availability depends on two columns; select IDs using a parameterized query.
      let stockIds: string[] | undefined;
      if (stock) {
        const limit = (await settings()).lowStockThreshold;
        const rows =
          stock === 'out'
            ? await db.$queryRaw<
                { productId: string }[]
              >`SELECT DISTINCT "productId" FROM "Variant" WHERE "stock" - "reserved" <= 0`
            : stock === 'low'
              ? await db.$queryRaw<
                  { productId: string }[]
                >`SELECT DISTINCT "productId" FROM "Variant" WHERE "stock" - "reserved" <= ${limit}`
              : await db.$queryRaw<
                  { productId: string }[]
                >`SELECT DISTINCT "productId" FROM "Variant" WHERE "stock" - "reserved" > 0`;
        stockIds = rows.map((r) => r.productId);
      }
      const filtered = { ...where, ...(stockIds ? { id: { in: stockIds } } : {}) };
      const [products, total] = await Promise.all([
        db.product.findMany({
          where: filtered,
          include: productInclude,
          skip: (page - 1) * 20,
          take: 20,
          orderBy: { createdAt: 'desc' },
        }),
        db.product.count({ where: filtered }),
      ]);
      return json({ products: products.map(toProduct), total });
    }
    if (route === 'admin/products' && (method === 'POST' || method === 'PUT')) {
      const data = productSchema.parse(body);
      const id = method === 'PUT' ? z.string().parse(body.id) : undefined;
      const { brand, category, images, variants, ...fields } = data;
      const product = await serial(async (tx) => {
        const brandRecord = await tx.brand.upsert({
          where: { name: brand },
          create: { name: brand, slug: brand.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
          update: {},
        });
        const categoryRecord = await tx.category.upsert({
          where: { name: category },
          create: { name: category, slug: category.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
          update: {},
        });
        const priced = {
          ...fields,
          minPrice: Math.min(...variants.map((v) => v.price)),
          brandId: brandRecord.id,
          categoryId: categoryRecord.id,
        };
        const record = id
          ? await tx.product.update({ where: { id }, data: priced })
          : await tx.product.create({ data: priced });
        await tx.productImage.deleteMany({ where: { productId: record.id } });
        await tx.productImage.createMany({
          data: images.map((url, position) => ({
            productId: record.id,
            url,
            alt: fields.title,
            position,
          })),
        });
        const old = await tx.variant.findMany({ where: { productId: record.id } });
        const ids = new Set(variants.filter((v) => v.id).map((v) => v.id));
        if (old.some((v) => !ids.has(v.id)))
          throw new HttpError(
            400,
            'Existing variants cannot be removed. Set their stock to zero instead.',
          );
        for (const v of variants) {
          const { id: variantId, ...values } = v;
          const existing = old.find((o) => o.id === variantId);
          if (variantId && !existing) throw new HttpError(400, 'Invalid variant');
          if (existing && values.stock < existing.reserved)
            throw new HttpError(409, 'Stock cannot be less than reserved inventory');
          if (variantId) await tx.variant.update({ where: { id: variantId }, data: values });
          else await tx.variant.create({ data: { ...values, productId: record.id } });
        }
        return record;
      });
      return json(product);
    }
    if (route === 'admin/orders' && method === 'GET') {
      const status = url.searchParams.get('status');
      const q = (url.searchParams.get('q') || '').slice(0, 100);
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const where = {
        ...(status ? { status } : {}),
        ...(q ? { number: { contains: q, mode: 'insensitive' as const } } : {}),
      };
      const [orders, total] = await Promise.all([
        db.order.findMany({
          where,
          include: {
            user: { select: { name: true, email: true } },
            items: true,
            payments: true,
            history: { orderBy: { createdAt: 'asc' } },
          },
          take: 20,
          skip: (page - 1) * 20,
          orderBy: { createdAt: 'desc' },
        }),
        db.order.count({ where }),
      ]);
      return json({ orders, total });
    }
    if (route === 'admin/orders/status' && method === 'PATCH') {
      const data = z
        .object({
          id: z.string(),
          status: z.enum(orderStatuses),
          tracking: z.string().max(500).optional(),
        })
        .parse(body);
      return json(await transitionOrder(data.id, data.status, user.id, data.tracking));
    }
    if (route === 'admin/orders/refund' && method === 'POST') {
      const data = z
        .object({
          id: z.string(),
          reference: z.string().trim().min(3).max(200),
          amount: z.number().int().min(1),
        })
        .parse(body);
      return json(await recordManualRefund(data.id, data.reference, data.amount, user.id));
    }
    if (route === 'admin/settings') {
      if (method === 'GET') return json(await settings());
      if (method === 'PUT') {
        const data = z
          .object({
            freeShippingThreshold: z.number().int().min(0).max(100000000),
            shippingFee: z.number().int().min(0).max(1000000),
            lowStockThreshold: z.number().int().min(0).max(10000),
          })
          .parse(body);
        await db.$transaction(
          Object.entries(data).map(([key, value]) =>
            db.setting.upsert({ where: { key }, create: { key, value }, update: { value } }),
          ),
        );
        return json({ ok: true });
      }
    }
    throw new HttpError(404, 'Endpoint not found');
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      return json({ error: 'This email, slug, or SKU is already in use.' }, 409);
    if (e instanceof SyntaxError) return json({ error: 'Invalid JSON body' }, 400);
    if (e instanceof z.ZodError)
      return json({ error: e.issues[0]?.message || 'Invalid input' }, 400);
    console.error(
      JSON.stringify({
        event: 'api_error',
        message: e instanceof Error ? e.message : 'Unknown error',
      }),
    );
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
