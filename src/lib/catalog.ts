import { db, demoMode } from './db';
import { demoProducts, type ShopProduct } from './catalog-data';
import type { Prisma } from '@prisma/client';
import { cache } from 'react';
const include = {
  brand: true,
  category: true,
  images: { orderBy: { position: 'asc' as const } },
  variants: { orderBy: { price: 'asc' as const } },
};
type FullProduct = Prisma.ProductGetPayload<{ include: typeof include }>;
export function toProduct(p: FullProduct): ShopProduct {
  return {
    ...p,
    brand: p.brand.name,
    category: p.category.name,
    specifications: p.specifications as Record<string, string>,
    images: p.images.map((i) => i.url),
    rating: p.ratingScore,
    reviewCount: p.reviewsCount,
  };
}
export const getProducts = cache(async (): Promise<ShopProduct[]> => {
  if (demoMode()) return demoProducts;
  return (
    await db.product.findMany({
      where: { status: 'ACTIVE' },
      include,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  ).map(toProduct);
});
export async function getProduct(slug: string) {
  if (demoMode()) return demoProducts.find((p) => p.slug === slug);
  const p = await db.product.findUnique({ where: { slug }, include });
  return p?.status === 'ACTIVE' ? toProduct(p) : undefined;
}
export { include as productInclude };
