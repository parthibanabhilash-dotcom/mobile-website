import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/catalog';
import { ProductDetail } from '@/components/product-detail';
import { db, demoMode } from '@/lib/db';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  return {
    title: p?.seoTitle || p?.title || 'Product',
    description: p?.seoDescription || p?.description,
  };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const reviews = demoMode()
    ? []
    : await db.review.findMany({
        where: { productId: p.id },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
  return (
    <ProductDetail
      product={p}
      reviews={reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        text: r.text,
        name: r.user.name,
      }))}
    />
  );
}
