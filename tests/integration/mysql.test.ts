import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
const enabled = !!process.env.TEST_DATABASE_URL;
const prefix = `mysql-${randomUUID()}`;
let db: PrismaClient;
let productId = '',
  variantId = '',
  userId = '';
describe.skipIf(!enabled)('MySQL query and enforcement compatibility', () => {
  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL!);
    if (url.protocol !== 'mysql:' || !url.pathname.includes('_test'))
      throw new Error('Use a dedicated MySQL _test database.');
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    ({ db } = await import('../../src/lib/db'));
    const brand = await db.brand.create({ data: { name: prefix, slug: prefix } });
    const category = await db.category.create({ data: { name: prefix, slug: prefix } });
    const product = await db.product.create({
      data: {
        title: prefix + ' MixedCASE',
        slug: prefix,
        subtitle: 'Compatibility test',
        description: 'x'.repeat(10000),
        warranty: 'w'.repeat(2000),
        seoDescription: 's'.repeat(300),
        specifications: { test: 'yes' },
        brandId: brand.id,
        categoryId: category.id,
        variants: {
          create: {
            sku: prefix,
            color: 'Black',
            colorHex: '#000000',
            ram: '8 GB',
            storage: '256 GB',
            price: 10000,
            originalPrice: 12000,
            stock: 5,
            reserved: 1,
          },
        },
      },
      include: { variants: true },
    });
    productId = product.id;
    variantId = product.variants[0].id;
    userId = (
      await db.user.create({
        data: {
          name: 'Metric test',
          email: prefix + '@example.test',
          passwordHash: 'fixture-only',
        },
      })
    ).id;
  });
  afterAll(async () => {
    if (!db) return;
    await db.order.deleteMany({ where: { userId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.product.deleteMany({ where: { id: productId } });
    await db.brand.deleteMany({ where: { slug: prefix } });
    await db.category.deleteMany({ where: { slug: prefix } });
    await db.rateLimit.deleteMany({ where: { key: { startsWith: prefix } } });
    await db.$disconnect();
  });
  it('searches case-insensitively and combines variant stock/offer predicates', async () => {
    const { queryCatalog } = await import('../../src/lib/catalog-query');
    const result = await queryCatalog(
      new URLSearchParams({
        q: prefix.toUpperCase(),
        inStock: 'true',
        offers: 'true',
        ram: '8 GB',
      }),
    );
    expect(result.products.map((p) => p.id)).toEqual([productId]);
    expect(result.products[0].description).toHaveLength(10000);
  });
  it('enforces inventory check constraints without persisting invalid stock', async () => {
    await expect(
      db.variant.update({ where: { id: variantId }, data: { reserved: 6 } }),
    ).rejects.toThrow();
    expect((await db.variant.findUniqueOrThrow({ where: { id: variantId } })).reserved).toBe(1);
  });
  it('atomically limits concurrent requests and resets expired buckets', async () => {
    const { rateLimit } = await import('../../src/lib/security');
    const key = prefix + ':concurrent';
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => rateLimit(key, 3, 60)),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(2);
    expect((await db.rateLimit.findUniqueOrThrow({ where: { key } })).count).toBe(5);
    await db.rateLimit.update({ where: { key }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await rateLimit(key, 3, 60);
    expect((await db.rateLimit.findUniqueOrThrow({ where: { key } })).count).toBe(1);
    await rateLimit(prefix + ':long:' + 'a'.repeat(254), 3, 60);
  });
  it('groups dashboard orders by India day and serializes MySQL aggregates', async () => {
    const date = new Date();
    date.setUTCHours(18, 45, 0, 0);
    date.setUTCDate(date.getUTCDate() - 1);
    await db.order.create({
      data: {
        userId,
        number: prefix,
        checkoutKey: prefix,
        address: {},
        subtotal: 10000,
        shipping: 0,
        total: 10000,
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        createdAt: date,
      },
    });
    const { dashboardMetrics } = await import('../../src/lib/admin-metrics');
    const metrics = await dashboardMetrics();
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
    expect(metrics.trends.find((t) => t.day === day)?.revenue).toBeGreaterThanOrEqual(100);
    expect(() => JSON.stringify(metrics)).not.toThrow();
  });
});
