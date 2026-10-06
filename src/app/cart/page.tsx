import { CartContents } from '@/components/cart';
export const metadata = { title: 'Your shopping bag' };
export default function Page() {
  return (
    <main className="container page-space">
      <span className="eyebrow">GOOD CHOICES, ALL IN ONE PLACE</span>
      <h1>Your shopping bag.</h1>
      <CartContents />
    </main>
  );
}
