'use client';
import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { useShoppingActions as useStore, api } from './store-provider';
import { ProductCard } from './product-card';
import type { ShopProduct } from '@/lib/catalog-shared';
export function Countdown() {
  const [time, setTime] = useState({ hours: '12', minutes: '00', seconds: '00' });
  useEffect(() => {
    const end = Date.now() + 12 * 3600000;
    const update = () => {
      const left = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setTime({
        hours: String(Math.floor(left / 3600)).padStart(2, '0'),
        minutes: String(Math.floor((left % 3600) / 60)).padStart(2, '0'),
        seconds: String(left % 60).padStart(2, '0'),
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      className="countdown"
      aria-label={`Offer ends in ${time.hours} hours ${time.minutes} minutes`}
    >
      {Object.entries(time).map(([key, value]) => (
        <div key={key}>
          <strong>{value}</strong>
          <span>{key}</span>
        </div>
      ))}
    </div>
  );
}
export function Newsletter() {
  const { notify } = useStore();
  const [email, setEmail] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <section className="newsletter">
      <div>
        <span className="eyebrow">STAY ONE STEP AHEAD</span>
        <h2>
          Your next upgrade.
          <br />
          Our first update.
        </h2>
        <p>Fresh launches, exclusive offers, and a little tech inspiration.</p>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const result = await api('newsletter', { email, consent: true });
            notify(result.message);
            setEmail('');
          } catch (e) {
            notify((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="newsletter-input">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            placeholder="Enter your email address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="button" disabled={busy}>
            {busy ? 'Joining…' : 'Keep me updated'}
            <ArrowRight size={16} />
          </button>
        </div>
        <label className="consent">
          <input type="checkbox" required /> I agree to receive offers and can unsubscribe at any
          time.
        </label>
      </form>
    </section>
  );
}

export function Collections({ products }: { products: ShopProduct[] }) {
  const [collection, setCollection] = useState('Latest smartphones');
  const smartphones = products.filter((p) => p.category === 'Smartphones');
  const featured = (
    collection === 'Trending accessories'
      ? products.filter((p) => p.category !== 'Smartphones')
      : collection === 'Best sellers'
        ? smartphones
            .filter((p) => p.badge === 'BEST SELLER' || p.badge === 'POPULAR')
            .concat(smartphones.filter((p) => p.badge !== 'BEST SELLER' && p.badge !== 'POPULAR'))
        : collection === 'New arrivals'
          ? smartphones
              .filter((p) => p.badge.includes('NEW'))
              .concat(smartphones.filter((p) => !p.badge.includes('NEW')))
          : smartphones
  ).slice(0, 4);

  return (
    <>
      {' '}
      <div className="collection-tabs" role="tablist" aria-label="Product collections">
        {['Latest smartphones', 'New arrivals', 'Best sellers', 'Trending accessories'].map(
          (tab) => (
            <button
              role="tab"
              aria-selected={collection === tab}
              key={tab}
              className={collection === tab ? 'active' : ''}
              onClick={() => setCollection(tab)}
            >
              {tab}
            </button>
          ),
        )}
      </div>
      <div className="product-grid" role="tabpanel" aria-label={collection}>
        {featured.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </>
  );
}
