'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
  Heart,
  Star,
  Check,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
  Truck,
  ShieldCheck,
  ZoomIn,
  ChevronDown,
} from 'lucide-react';
import { money, type ShopProduct } from '@/lib/catalog-shared';
import { useStore, api } from './store-provider';
import { useRouter } from 'next/navigation';
import { Modal } from './modal';
import { ProductCard } from './product-card';
export function ProductDetail({
  product: p,
  reviews = [],
}: {
  product: ShopProduct;
  reviews?: { id: string; rating: number; text: string; name: string }[];
}) {
  const store = useStore(),
    router = useRouter();
  const [variantId, setVariantId] = useState(p.variants[0].id),
    [quantity, setQuantity] = useState(1),
    [image, setImage] = useState(0),
    [zoom, setZoom] = useState(false),
    [tab, setTab] = useState('Description'),
    [reviewText, setReviewText] = useState(''),
    [rating, setRating] = useState(5);
  useEffect(() => store.registerProducts([p]), [p, store.registerProducts]);
  const v = p.variants.find((v) => v.id === variantId)!;
  const colors = [...new Set(p.variants.map((v) => v.color))];
  const rams = [...new Set(p.variants.filter((a) => a.color === v.color).map((a) => a.ram))];
  const storages = [
    ...new Set(
      p.variants.filter((a) => a.color === v.color && a.ram === v.ram).map((a) => a.storage),
    ),
  ];
  function choose(field: 'color' | 'ram' | 'storage', value: string) {
    const candidate = p.variants.find(
      (a) =>
        a[field] === value &&
        (field === 'color' || a.color === v.color) &&
        (field !== 'storage' || a.ram === v.ram),
    );
    if (candidate) {
      setVariantId(candidate.id);
      setQuantity(1);
    }
  }
  return (
    <main className="container page-space">
      <div className="breadcrumbs">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href={`/shop?category=${p.category}`}>{p.category}</Link>
        <span>/</span>
        <span>{p.title}</span>
      </div>
      <div className="detail-grid">
        <div className="gallery">
          <button
            className="gallery-main"
            onClick={() => setZoom(true)}
            aria-label={`Zoom image of ${p.title}`}
          >
            <Image
              src={p.images[image]}
              alt={`${p.title}, ${v.color}`}
              width={580}
              height={600}
              sizes="(max-width: 768px) 85vw, 45vw"
              loading="eager"
              fetchPriority="high"
            />
            <span>
              <ZoomIn size={18} />
            </span>
          </button>
          <div className="gallery-thumbnails">
            {p.images.map((url, i) => (
              <button
                aria-label={`View product image ${i + 1}`}
                aria-pressed={image === i}
                className={image === i ? 'active' : ''}
                onClick={() => setImage(i)}
                key={`${url}-${i}`}
              >
                <Image src={url} alt="" width={70} height={75} />
              </button>
            ))}
          </div>
        </div>
        <div className="detail-info">
          <span className="eyebrow">
            {p.brand} · {p.badge}
          </span>
          <h1>{p.title}</h1>
          <p>{p.subtitle}</p>
          <div className="rating detail-rating">
            <Star size={15} fill="currentColor" /> {p.rating ? p.rating.toFixed(1) : 'New'}{' '}
            <span>
              {p.reviewCount} {p.demo ? 'sample ratings' : 'customer reviews'}
            </span>
          </div>
          <div className="detail-price">
            <strong>{money(v.price)}</strong>
            <del>{money(v.originalPrice)}</del>
            <span>Save {Math.round((1 - v.price / v.originalPrice) * 100)}%</span>
          </div>
          <p className="tax-note">Inclusive of all taxes</p>
          <div className="stock">
            <i />
            {v.stock - v.reserved > 0
              ? `${v.stock - v.reserved <= 5 ? 'Only a few left' : 'In stock'} · Ready for your next upgrade`
              : 'Currently out of stock'}
          </div>
          <div className="variant-picker">
            <h2 className="option-heading">
              Color <span>— {v.color}</span>
            </h2>
            <div className="color-options">
              {colors.map((color) => (
                <button
                  key={color}
                  title={color}
                  aria-label={color}
                  aria-pressed={v.color === color}
                  className={v.color === color ? 'active' : ''}
                  onClick={() => choose('color', color)}
                >
                  <i style={{ background: p.variants.find((a) => a.color === color)?.colorHex }} />
                </button>
              ))}
            </div>
            {rams[0] !== 'N/A' && (
              <>
                <h2 className="option-heading">Memory</h2>
                <div className="option-buttons">
                  {rams.map((r) => (
                    <button
                      key={r}
                      className={v.ram === r ? 'active' : ''}
                      aria-pressed={v.ram === r}
                      onClick={() => choose('ram', r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </>
            )}
            {storages[0] !== 'N/A' && (
              <>
                <h2 className="option-heading">Storage</h2>
                <div className="option-buttons">
                  {storages.map((s) => (
                    <button
                      key={s}
                      className={v.storage === s ? 'active' : ''}
                      aria-pressed={v.storage === s}
                      onClick={() => choose('storage', s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="detail-buy">
            <div className="quantity-control">
              <button
                aria-label="Decrease quantity"
                disabled={quantity === 1}
                onClick={() => setQuantity(quantity - 1)}
              >
                <Minus size={16} />
              </button>
              <span>{quantity}</span>
              <button
                aria-label="Increase quantity"
                disabled={quantity >= Math.min(10, v.stock - v.reserved)}
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              className="button"
              disabled={v.stock - v.reserved < quantity}
              onClick={() => store.add(v.id, quantity)}
            >
              <ShoppingBag size={18} /> Add to bag
            </button>
            <button
              className="button button-dark"
              disabled={v.stock - v.reserved < quantity}
              onClick={() => {
                if (store.add(v.id, quantity)) router.push('/checkout');
              }}
            >
              Buy now <ArrowRight size={17} />
            </button>
          </div>
          <div className="detail-secondary">
            <button aria-pressed={store.wishlist.includes(p.id)} onClick={() => store.wish(p.id)}>
              <Heart size={17} fill={store.wishlist.includes(p.id) ? 'currentColor' : 'none'} />{' '}
              Save to wishlist
            </button>
          </div>
          <div className="detail-perks">
            <span>
              <Truck size={19} />
              <div>
                <strong>Carefully delivered</strong>
                <small>Free delivery above {money(store.settings.freeShippingThreshold)}</small>
              </div>
            </span>
            <span>
              <ShieldCheck size={19} />
              <div>
                <strong>Genuine. Guaranteed.</strong>
                <small>Manufacturer warranty included</small>
              </div>
            </span>
          </div>
        </div>
      </div>
      <section className="detail-tabs">
        <div role="tablist">
          {['Description', 'Specifications', 'Warranty', 'Reviews'].map((t) => (
            <button
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={tab === t ? 'active' : ''}
              key={t}
            >
              {t}
              <ChevronDown size={14} />
            </button>
          ))}
        </div>
        <div className="detail-panel" role="tabpanel" aria-label={tab}>
          {tab === 'Description' ? (
            <>
              <h2>A little more extraordinary.</h2>
              <p>{p.description}</p>
            </>
          ) : tab === 'Specifications' ? (
            <dl className="specifications">
              {Object.entries(p.specifications).map(([k, value]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              <div>
                <dt>Selected configuration</dt>
                <dd>
                  {v.color} · {v.ram} · {v.storage}
                </dd>
              </div>
            </dl>
          ) : tab === 'Warranty' ? (
            <>
              <h2>Peace of mind, included.</h2>
              <p>{p.warranty}</p>
              <Link href="/help#returns" className="text-link">
                Returns & support <ArrowRight size={15} />
              </Link>
            </>
          ) : (
            <>
              <h2>Customer reviews</h2>
              {reviews.length ? (
                reviews.map((r) => (
                  <article className="customer-review" key={r.id}>
                    <strong>
                      {r.name} · {'★'.repeat(r.rating)}
                    </strong>
                    <p>{r.text}</p>
                    <span className="stock">
                      <Check size={13} /> Verified purchase
                    </span>
                  </article>
                ))
              ) : (
                <p>
                  No verified reviews yet. Be the first to share your experience after delivery.
                </p>
              )}
              <form
                className="review-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api('reviews', { productId: p.id, rating, text: reviewText });
                    store.notify('Your review has been saved.');
                    setReviewText('');
                    router.refresh();
                  } catch (e) {
                    store.notify((e as Error).message);
                  }
                }}
              >
                <label className="field">
                  Your rating
                  <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} stars
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Share your experience
                  <textarea
                    minLength={10}
                    maxLength={2000}
                    required
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  />
                </label>
                <button className="button">Submit review</button>
                <small>Available to signed-in customers with a delivered purchase.</small>
              </form>
            </>
          )}
        </div>
      </section>
      <section>
        <div className="section-title">
          <div>
            <span className="eyebrow">KEEP EXPLORING</span>
            <h2>You might also love.</h2>
          </div>
          <Link href="/shop">
            View collection <ArrowRight size={16} />
          </Link>
        </div>
        <div className="product-grid">
          {store.products
            .filter((a) => a.id !== p.id && a.category === p.category)
            .slice(0, 4)
            .map((a) => (
              <ProductCard key={a.id} product={a} />
            ))}
        </div>
      </section>
      <Modal open={zoom} onClose={() => setZoom(false)} title={p.title}>
        <div className="zoom-image">
          <Image src={p.images[image]} alt={p.title} width={900} height={900} />
        </div>
      </Modal>
    </main>
  );
}
