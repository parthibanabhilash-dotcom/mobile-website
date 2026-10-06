'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Plus, Star, ArrowUpRight, Check, GitCompareArrows } from 'lucide-react';
import { useState, useEffect } from 'react';
import { money, type ShopProduct } from '@/lib/catalog-shared';
import { useStore } from './store-provider';
import { Modal } from './modal';
export function ProductCard({
  product: p,
  eager = false,
}: {
  product: ShopProduct;
  eager?: boolean;
}) {
  const store = useStore();
  const [quick, setQuick] = useState(false);
  useEffect(() => store.registerProducts([p]), [p, store.registerProducts]);
  const v = p.variants[0];
  if (!v) return null;
  const discount = Math.round((1 - v.price / v.originalPrice) * 100);
  const saved = store.wishlist.includes(p.id);
  return (
    <>
      <article className="product-card">
        <div className={`product-badge ${p.badge.includes('NEW') ? 'badge-blue' : ''}`}>
          {p.badge || `${discount}% OFF`}
        </div>
        <button
          aria-label={`${saved ? 'Remove' : 'Save'} ${p.title} ${saved ? 'from' : 'to'} wishlist`}
          aria-pressed={saved}
          onClick={() => store.wish(p.id)}
          className={`card-wish ${saved ? 'saved' : ''}`}
        >
          <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
        <Link href={`/products/${p.slug}`} className="product-image">
          <Image
            src={p.images[0]}
            alt={p.title}
            width={360}
            height={360}
            loading={eager ? 'eager' : 'lazy'}
            sizes="(max-width: 600px) 45vw, (max-width: 1000px) 30vw, 22vw"
          />
        </Link>
        <div className="card-actions">
          <button onClick={() => setQuick(true)}>
            Quick view <ArrowUpRight size={13} />
          </button>
          <button
            aria-label={`Compare ${p.title}`}
            aria-pressed={store.compare.includes(p.id)}
            onClick={() => store.toggleCompare(p.id)}
          >
            <GitCompareArrows size={16} />
          </button>
        </div>
        <div className="product-info">
          <div className="brand-label">{p.brand}</div>
          <Link className="product-title" href={`/products/${p.slug}`}>
            {p.title}
          </Link>
          <p className="variant-label">
            {v.storage === 'N/A' ? p.subtitle : `${v.storage} · ${v.color}`}
          </p>
          <div className="rating">
            <Star size={12} fill="currentColor" />
            {p.rating ? p.rating.toFixed(1) : 'New'}{' '}
            <span>
              ({p.reviewCount}
              {p.demo ? ' demo' : ''})
            </span>
          </div>
          <div className="price-line">
            <strong>{money(v.price)}</strong>
            <del>{money(v.originalPrice)}</del>
          </div>
          <div className="card-bottom">
            <span className={`stock ${v.stock - v.reserved <= 0 ? 'out' : ''}`}>
              <i />
              {v.stock - v.reserved > 0 ? 'In stock' : 'Out of stock'}
            </span>
            <button
              disabled={v.stock - v.reserved <= 0}
              className="add-button"
              aria-label={`Add ${p.title} to cart`}
              onClick={() => store.add(v.id)}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </article>
      {quick && (
        <Modal open={quick} onClose={() => setQuick(false)} title="A closer look">
          <div className="quick-grid">
            <Image src={p.images[0]} alt={p.title} width={320} height={320} />
            <div>
              <span className="eyebrow">{p.brand}</span>
              <h2>{p.title}</h2>
              <p>{p.description}</p>
              <h3>{money(v.price)}</h3>
              <p className="stock">
                <Check size={14} /> {v.stock - v.reserved} available
              </p>
              <button className="button" onClick={() => store.add(v.id)}>
                Add to bag <Plus size={17} />
              </button>
              <Link
                className="text-link"
                href={`/products/${p.slug}`}
                onClick={() => setQuick(false)}
              >
                Explore all options <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
