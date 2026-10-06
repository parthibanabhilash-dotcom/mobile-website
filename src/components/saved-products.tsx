'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, GitCompareArrows, X, ArrowRight } from 'lucide-react';
import { useStoreReady, useStore } from './store-provider';
import { ProductCard } from './product-card';
import { money } from '@/lib/catalog-shared';
export function SavedProducts({ compare = false }: { compare?: boolean }) {
  const store = useStore();
  const ready = useStoreReady();
  const products = store.products.filter((p) =>
    (compare ? store.compare : store.wishlist).includes(p.id),
  );
  return (
    <main className="container page-space">
      <span className="eyebrow">
        {compare ? 'A CLEARER WAY TO CHOOSE' : 'SAVED FOR SOMETHING SPECIAL'}
      </span>
      <h1>{compare ? 'Find your perfect match.' : 'Your favorites, together.'}</h1>
      <p>
        {compare
          ? 'Compare up to four products side by side.'
          : 'All the tech you’ve had your eye on.'}
      </p>
      {!ready ? (
        <div className="skeleton" style={{ height: 300 }} />
      ) : !products.length ? (
        <div className="empty-state">
          {compare ? <GitCompareArrows size={42} /> : <Heart size={42} />}
          <h2>
            {compare ? 'A little comparison goes a long way.' : 'Good things are worth saving.'}
          </h2>
          <p>
            {compare
              ? 'Add products using the compare button.'
              : 'Tap the heart on a product to keep it here.'}
          </p>
          <Link href="/shop" className="button">
            Explore products <ArrowRight size={16} />
          </Link>
        </div>
      ) : compare ? (
        <div className="table-scroll">
          <table className="compare-table">
            <thead>
              <tr>
                <th>At a glance</th>
                {products.map((p) => (
                  <th key={p.id}>
                    <button
                      className="icon-button"
                      aria-label={`Remove ${p.title} from compare`}
                      onClick={() => store.toggleCompare(p.id)}
                    >
                      <X size={16} />
                    </button>
                    <Image src={p.images[0]} alt={p.title} width={180} height={200} />
                    <Link href={`/products/${p.slug}`}>{p.title}</Link>
                    <span>{money(p.variants[0].price)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                'Brand',
                'Price',
                'Memory',
                'Storage',
                'Warranty',
                ...new Set(products.flatMap((p) => Object.keys(p.specifications))),
              ].map((key) => (
                <tr key={key}>
                  <th>{key}</th>
                  {products.map((p) => (
                    <td key={p.id}>
                      {key === 'Brand'
                        ? p.brand
                        : key === 'Price'
                          ? money(p.variants[0].price)
                          : key === 'Memory'
                            ? p.variants[0].ram
                            : key === 'Storage'
                              ? p.variants[0].storage
                              : key === 'Warranty'
                                ? p.warranty
                                : p.specifications[key] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th>Ready to upgrade?</th>
                {products.map((p) => (
                  <td key={p.id}>
                    <button className="button" onClick={() => store.add(p.variants[0].id)}>
                      Add to bag
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
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
