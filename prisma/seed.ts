import '../scripts/env';
import { PrismaClient } from '@prisma/client';
import { demoProducts } from '../src/lib/catalog-data';
const db = new PrismaClient();
async function main() {
  for (const p of demoProducts) {
    const brand = await db.brand.upsert({
      where: { name: p.brand },
      create: { name: p.brand, slug: p.brand.toLowerCase() },
      update: {},
    });
    const category = await db.category.upsert({
      where: { name: p.category },
      create: { name: p.category, slug: p.category.toLowerCase() },
      update: {},
    });
    const { variants, images, brand: _, category: __, rating, reviewCount, demo, ...fields } = p;
    const existing = await db.product.findUnique({ where: { id: p.id } });
    if (existing) continue;
    await db.product.create({
      data: {
        ...fields,
        minPrice: Math.min(...variants.map((v) => v.price)),
        brandId: brand.id,
        categoryId: category.id,
        images: { create: images.map((url, position) => ({ url, position, alt: p.title })) },
        variants: { create: variants },
      },
    });
  }
  for (const [key, value] of Object.entries({
    freeShippingThreshold: 500000,
    shippingFee: 9900,
    lowStockThreshold: 5,
  }))
    await db.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  console.log('Demo catalog seeded. No customer reviews or admin accounts were fabricated.');
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
