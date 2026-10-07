'use client';
import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';
import { useStore, useStoreReady } from './store-provider';
import { ProductCard } from './product-card';
export function SavedProducts() {
  const store = useStore(),
    ready = useStoreReady();
  const products = store.products.filter((p) => store.wishlist.includes(p.id));
  return (
    <main className="container page-space">
      <span className="eyebrow">SAVED FOR SOMETHING SPECIAL</span>
      <h1>Your favorites, together.</h1>
      <p>Your wishlist, ready whenever you are.</p>
      {!ready ? (
        <div className="skeleton" style={{ height: 250 }} />
      ) : !products.length ? (
        <div className="empty-state">
          <Heart size={42} />
          <h2>Good things are worth saving.</h2>
          <p>Tap the heart on a product to save it here.</p>
          <Link className="button" href="/shop">
            Explore products <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}
