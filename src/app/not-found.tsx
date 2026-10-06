import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="container empty-state">
      <span className="eyebrow">404</span>
      <h1>This page wandered off.</h1>
      <p>There’s plenty more to explore.</p>
      <Link href="/shop" className="button">
        Back to the collection
      </Link>
    </main>
  );
}
