import { Suspense } from 'react';
import { Shop } from '@/components/shop';
import { queryCatalog } from '@/lib/catalog-query';
import Loading from '../loading';
export const metadata = { title: 'Shop the collection' };
async function CatalogContent({
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
export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <CatalogContent {...props} />
    </Suspense>
  );
}
