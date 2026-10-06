import { Suspense } from 'react';
import { Shop } from '@/components/shop';
import { queryCatalog } from '@/lib/catalog-query';
export const metadata = { title: 'Shop the collection' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const values = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (typeof value === 'string') query.set(key, value);
  const initial = await queryCatalog(query);
  return (
    <Suspense>
      <Shop initial={initial} />
    </Suspense>
  );
}
