import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Smartphone,
  Headphones,
  Watch,
  Zap,
  Shield,
  Truck,
  BadgeCheck,
  RefreshCw,
  Star,
  Check,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { Countdown, Newsletter, Collections } from './home-interactions';
import { ProductCard } from './product-card';
import { categories, money, type ShopProduct } from '@/lib/catalog-shared';
const categoryIcons = [Smartphone, Headphones, Watch, Zap, Shield];
export function SectionTitle({
  eyebrow,
  title,
  link = '/shop',
  linkText = 'View all products',
}: {
  eyebrow: string;
  title: string;
  link?: string;
  linkText?: string;
}) {
  return (
    <div className="section-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <Link href={link}>
        {linkText}
        <ArrowUpRight size={17} />
      </Link>
    </div>
  );
}
export function Home({
  products,
  settings,
}: {
  products: ShopProduct[];
  settings: { freeShippingThreshold: number };
}) {
  const accessories = products.filter((p) => p.category !== 'Smartphones');
  const hero = products.find((p) => p.slug === 'iphone-16-pro') || products[0];
  return (
    <main>
      <section className="hero container">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span /> THE NEXT GENERATION IS HERE
          </span>
          <h1>
            Extraordinary tech.
            <br />
            Everyday <span>possibilities.</span>
          </h1>
          <p>
            Discover the phones you love, the innovation you need,
            <br className="desktop-break" /> and prices that make your next upgrade feel right.
          </p>
          <div className="hero-buttons">
            <Link href="/shop" className="button">
              Find your next phone <ArrowUpRight size={17} />
            </Link>
            <Link href="/shop?offers=true" className="button button-outline">
              Explore offers <ArrowRight size={16} />
            </Link>
          </div>
          <div className="hero-proof">
            <div className="mini-avatars">
              <span>AK</span>
              <span>RS</span>
              <span>MP</span>
            </div>
            <div>
              <div className="five-stars">★★★★★</div>
              <p>
                Made for people who love tech <span>· Demo store</span>
              </p>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="hero-watermark" aria-hidden="true">
            PRO
          </span>
          <div className="hero-phone-back">
            <Image
              src="/products/iphone-pro.webp"
              alt="Desert titanium smartphone, rear camera detail"
              width={310}
              height={430}
              loading="eager"
              fetchPriority="high"
            />
          </div>
          <div className="hero-phone-front">
            <Image
              src="/products/phone-front.webp"
              alt="Smartphone with flowing blue wallpaper"
              width={290}
              height={430}
              loading="eager"
              fetchPriority="high"
            />
          </div>
          <div className="floating-feature">
            <span className="feature-icon">
              <Sparkles size={18} />
            </span>
            <div>
              <strong>Brilliance. Built in.</strong>
              <span>Discover iPhone 16 Pro</span>
            </div>
            <ArrowUpRight size={16} />
          </div>
          <div className="hero-price">
            <span>iPhone 16 Pro</span>
            <strong>From {money(hero?.variants[0]?.price || 11290000)}</strong>
            <span className="hero-price-note">256 GB · Desert Titanium</span>
          </div>
          <div className="hero-page">
            <span className="active" />
            <span />
            <span />
            <b>01 / 03</b>
          </div>
        </div>
      </section>
      <section className="trust-strip container">
        <div>
          <BadgeCheck />
          <span>
            <strong>100% authentic</strong>
            <small>Only the real deal</small>
          </span>
        </div>
        <div>
          <Truck />
          <span>
            <strong>Fast, free delivery</strong>
            <small>On orders above {money(settings.freeShippingThreshold)}</small>
          </span>
        </div>
        <div>
          <Shield />
          <span>
            <strong>Secure payments</strong>
            <small>Protected by Razorpay</small>
          </span>
        </div>
        <div>
          <RefreshCw />
          <span>
            <strong>Here to help</strong>
            <small>Thoughtful after-sales support</small>
          </span>
        </div>
      </section>
      <div className="container home-sections">
        <section className="category-section">
          <SectionTitle
            eyebrow="FIND YOUR EVERYDAY ESSENTIALS"
            title="A little something for every you."
            linkText="Explore categories"
          />
          <div className="category-grid">
            {categories.map((c, i) => {
              const Icon = categoryIcons[i];
              return (
                <Link
                  href={`/shop?category=${encodeURIComponent(c)}`}
                  key={c}
                  className={`category-tile category-${i}`}
                >
                  <span>
                    <Icon size={29} strokeWidth={1.4} />
                  </span>
                  <div>
                    <strong>{c}</strong>
                    <small>
                      {i === 0
                        ? 'Your next upgrade'
                        : i === 1
                          ? 'Tune into your world'
                          : i === 2
                            ? 'More than a timepiece'
                            : i === 3
                              ? 'Power your every day'
                              : 'Make it your own'}
                    </small>
                  </div>
                  <ArrowUpRight size={15} />
                </Link>
              );
            })}
          </div>
        </section>
        <section className="brands-section">
          <div className="brand-heading">
            THE BRANDS YOU LOVE.
            <br />
            <strong>All in one place.</strong>
          </div>
          <div className="brand-logos">
            <Link href="/shop?brand=Apple" className="apple-brand">
              <span>●</span> Apple
            </Link>
            <Link href="/shop?brand=Samsung" className="samsung-brand">
              SAMSUNG
            </Link>
            <Link href="/shop?brand=Google" className="google-brand">
              Google
            </Link>
            <Link href="/shop?brand=OnePlus" className="oneplus-brand">
              1+ OnePlus
            </Link>
            <Link href="/shop?brand=Anker" className="anker-brand">
              ANKER
            </Link>
          </div>
        </section>
        <section className="collection-section">
          <SectionTitle eyebrow="HANDPICKED. HARD TO RESIST." title="Meet your next upgrade." />
          <Suspense fallback={<div className="skeleton" style={{ height: 400 }} />}>
            <Collections products={products} />
          </Suspense>
        </section>
        <section className="promo-grid">
          <Link href="/shop?brand=Samsung" className="promo-card promo-samsung">
            <div>
              <span className="eyebrow">GALAXY. A WORLD OF POSSIBILITIES.</span>
              <h2>
                Go beyond
                <br />
                the ordinary.
              </h2>
              <p>Discover the Samsung Galaxy collection.</p>
              <span className="promo-link">
                Explore Galaxy <ArrowUpRight size={17} />
              </span>
            </div>
            <Image
              src="/products/galaxy.webp"
              alt="Samsung Galaxy smartphone"
              width={270}
              height={330}
            />
            <span className="promo-watermark" aria-hidden="true">
              Galaxy
            </span>
          </Link>
          <Link href="/shop?category=Audio" className="promo-card promo-audio">
            <div>
              <span className="eyebrow">LESS NOISE. MORE YOU.</span>
              <h2>
                Your world.
                <br />
                Your soundtrack.
              </h2>
              <p>Audio that feels as good as it sounds.</p>
              <span className="promo-link">
                Find your sound <ArrowUpRight size={17} />
              </span>
            </div>
            <Image
              src="/products/earbuds.webp"
              alt="Premium wireless earbuds"
              width={260}
              height={280}
            />
          </Link>
        </section>
        <section className="accessories-section">
          <SectionTitle
            eyebrow="SMALL DETAILS. BIG DIFFERENCE."
            title="Better together."
            link="/shop?collection=accessories"
            linkText="Shop accessories"
          />
          <div className="product-grid">
            {accessories.slice(0, 4).map((p) => (
              <Suspense key={p.id} fallback={<div className="skeleton" style={{ height: 360 }} />}>
                <ProductCard product={p} />
              </Suspense>
            ))}
          </div>
        </section>
        <section className="deal-section">
          <div className="deal-image">
            <span className="deal-label">
              <Zap size={14} /> DEAL OF THE DAY
            </span>
            <Image src="/products/iphone-blue.webp" alt="Blue iPhone 16" width={300} height={330} />
            <span className="deal-orbit" />
          </div>
          <div className="deal-copy">
            <span className="eyebrow">A GREAT UPGRADE. AN EVEN BETTER DEAL.</span>
            <h2>
              Big possibilities.
              <br />A little less on the price.
            </h2>
            <p>Meet iPhone 16. Powerful, colorful, and ready for whatever comes next.</p>
            <div className="deal-price">
              <strong>₹74,900</strong>
              <del>₹79,900</del>
              <span>Save ₹5,000</span>
            </div>
            <Suspense fallback={null}>
              <Countdown />
            </Suspense>
            <Link href="/products/iphone-16" className="button">
              Make it yours <ArrowUpRight size={17} />
            </Link>
            <small>Demonstration promotion · Subject to availability</small>
          </div>
        </section>
        <section className="featured-section">
          <SectionTitle eyebrow="WORTH A SECOND LOOK" title="Featured favorites." />
          <div className="product-grid">
            {products
              .filter((p) => p.featured)
              .slice(2, 6)
              .map((p) => (
                <Suspense
                  key={p.id}
                  fallback={<div className="skeleton" style={{ height: 360 }} />}
                >
                  <ProductCard product={p} />
                </Suspense>
              ))}
          </div>
        </section>
        <section className="why-section">
          <div>
            <span className="eyebrow">GOOD TECH. GREAT EXPERIENCE.</span>
            <h2>
              More than a store.
              <br />
              Your upgrade partner.
            </h2>
            <p>
              From finding the right phone to getting it safely into your hands, we make every step
              feel effortless.
            </p>
            <Link href="/about" className="text-link">
              Get to know Mobile Shop <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="why-grid">
            {[
              {
                icon: BadgeCheck,
                title: 'Authentic, always.',
                text: 'Genuine products with manufacturer warranty.',
              },
              {
                icon: Truck,
                title: 'Delivered with care.',
                text: 'Careful packing and transparent order tracking.',
              },
              {
                icon: Shield,
                title: 'Shop with confidence.',
                text: 'Secure payments and clear pricing.',
              },
              {
                icon: Headphones,
                title: 'Real people. Real help.',
                text: 'Support for your purchase and beyond.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title}>
                <Icon size={23} />
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="reviews-section">
          <SectionTitle
            eyebrow="THE LITTLE THINGS MAKE A DIFFERENCE"
            title="Good experiences. Happy people."
            link="/about"
            linkText="Our promise"
          />
          <div className="reviews-grid">
            {[
              {
                name: 'Aarav Sharma',
                initials: 'AS',
                text: 'Finding the right phone was refreshingly simple. The comparison helped me pick exactly what I needed.',
                city: 'Bengaluru',
              },
              {
                name: 'Priya Mehta',
                initials: 'PM',
                text: 'A clean shopping experience, clear pricing, and all my favorite brands in one place. Just how it should be.',
                city: 'Mumbai',
              },
              {
                name: 'Rohan Kapoor',
                initials: 'RK',
                text: 'From browsing to checkout, everything felt thoughtfully designed. My next upgrade starts here.',
                city: 'New Delhi',
              },
            ].map((r) => (
              <article key={r.name}>
                <div className="review-stars">
                  ★★★★★ <span>Sample review</span>
                </div>
                <p>“{r.text}”</p>
                <div className="review-person">
                  <span>{r.initials}</span>
                  <div>
                    <strong>{r.name}</strong>
                    <small>{r.city} · Demonstration</small>
                  </div>
                  <Check size={16} />
                </div>
              </article>
            ))}
          </div>
        </section>
        <Suspense fallback={null}>
          <Newsletter />
        </Suspense>
      </div>
    </main>
  );
}
