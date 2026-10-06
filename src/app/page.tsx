import { Home } from '@/components/home';
import { getProducts } from '@/lib/catalog';
import { settings } from '@/lib/commerce';
import { demoMode } from '@/lib/db';
export default async function Page() {
  const [products, config] = await Promise.all([
    getProducts(),
    demoMode() ? Promise.resolve({ freeShippingThreshold: 500000 }) : settings(),
  ]);
  return <Home products={products} settings={config} />;
}
