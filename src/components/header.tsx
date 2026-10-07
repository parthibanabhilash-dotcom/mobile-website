'use client';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  Heart,
  ShoppingBag,
  UserRound,
  Menu,
  X,
  ChevronDown,
  ArrowUpRight,
  Smartphone,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useShoppingActions as useStore, api } from './store-provider';
import { categories, money, type ShopProduct } from '@/lib/catalog-shared';
import { Modal } from './modal';
import dynamic from 'next/dynamic';
const CartDrawer = dynamic(() => import('./cart').then((m) => m.CartDrawer), { ssr: false });
export function Logo() {
  return (
    <Link prefetch={false} href="/" className="logo" aria-label="Mobile Shop home">
      <span className="logo-mark">
        <Smartphone size={21} />
        <i />
      </span>
      mobile <span className="logo-light">shop</span>
      <b aria-hidden="true">®</b>
    </Link>
  );
}
export function Header() {
  const store = useStore(),
    router = useRouter();
  const [compact, setCompact] = useState(false),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState(''),
    [results, setResults] = useState<ShopProduct[]>([]),
    [searchOpen, setSearchOpen] = useState(false),
    [searchLoading, setSearchLoading] = useState(false),
    [searchError, setSearchError] = useState(''),
    [accountOpen, setAccountOpen] = useState(false),
    [categoryOpen, setCategoryOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = () => setCompact(window.scrollY > 30);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearchLoading(false);
      setSearchError('');
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setResults([]);
    setSearchLoading(true);
    setSearchError('');
    const timer = setTimeout(() => {
      fetch(`/api/catalog?q=${encodeURIComponent(query.trim())}&suggest=true`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error('Search unavailable');
          return response.json() as Promise<{ products: ShopProduct[] }>;
        })
        .then((data) => {
          if (!cancelled) setResults(data.products.slice(0, 5));
        })
        .catch(() => {
          if (!cancelled) setSearchError('Search is unavailable. Please try again.');
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);
  useEffect(() => {
    function shortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.querySelector<HTMLInputElement>('input')?.focus();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, []);
  useEffect(() => {
    function outside(e: MouseEvent) {
      if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);
  const count = store.cart.reduce((s, c) => s + c.quantity, 0);
  return (
    <>
      <div className="announcement">
        <div className="container">
          <span>
            <Truck size={13} /> Complimentary delivery on orders above{' '}
            {money(store.settings.freeShippingThreshold)}
          </span>
          <span>
            Big on innovation. Better on price.{' '}
            <Link prefetch={false} href="/shop?offers=true">
              Explore offers <ArrowRight size={12} />
            </Link>
          </span>
          <span className="announcement-right">India · INR ₹</span>
        </div>
      </div>
      <header className={`site-header ${compact ? 'compact' : ''}`}>
        <div className="header-main container">
          <button
            className="icon-button mobile-menu-button"
            aria-label="Open menu"
            onClick={() => setMobile(true)}
          >
            <Menu size={23} />
          </button>
          <Logo />
          <div
            className="category-control"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setCategoryOpen(false);
            }}
          >
            <button
              className="nav-button"
              aria-expanded={categoryOpen}
              onClick={() => setCategoryOpen(!categoryOpen)}
            >
              Categories <ChevronDown size={14} />
            </button>
            {categoryOpen && (
              <div className="nav-dropdown">
                {categories.map((c) => (
                  <Link
                    prefetch={false}
                    key={c}
                    href={`/shop?category=${encodeURIComponent(c)}`}
                    onClick={() => setCategoryOpen(false)}
                  >
                    {c}
                    <ArrowUpRight size={14} />
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="search-wrap" ref={searchRef}>
            <form
              className="search-form"
              action="/shop"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
                setSearchOpen(false);
              }}
            >
              <Search size={18} />
              <input
                name="q"
                aria-label="Search products"
                placeholder="Search for your next upgrade…"
                value={query}
                autoComplete="off"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchOpen(false);
                }}
              />
              {query && (
                <button type="button" aria-label="Clear search" onClick={() => setQuery('')}>
                  <X size={15} />
                </button>
              )}
              <kbd>⌘ K</kbd>
            </form>
            {searchOpen && query && (
              <div className="search-suggestions">
                <div className="suggestion-heading">Products for “{query}”</div>
                {results.map((p) => (
                  <Link
                    prefetch={false}
                    key={p.id}
                    href={`/products/${p.slug}`}
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery('');
                    }}
                  >
                    <Image src={p.images[0]} alt="" width={50} height={50} />
                    <div>
                      <strong>{p.title}</strong>
                      <span>
                        {p.brand} · {p.category}
                      </span>
                    </div>
                    <b>{money(p.variants[0].price)}</b>
                  </Link>
                ))}
                {searchLoading && <p role="status">Searching products…</p>}
                {searchError && <p role="alert">{searchError}</p>}
                {!searchLoading && !searchError && !results.length && (
                  <p>No matches. Try a product, brand or category.</p>
                )}
                <button
                  onClick={() => {
                    router.push(`/shop?q=${encodeURIComponent(query)}`);
                    setSearchOpen(false);
                  }}
                >
                  See all results <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
          <Link prefetch={false} href="/shop?offers=true" className="header-offers">
            Offers
            <span />
          </Link>
          <div
            className="account-control"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setAccountOpen(false);
            }}
          >
            <button
              className="icon-button"
              aria-label="Account menu"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen(!accountOpen)}
            >
              <UserRound size={21} />
            </button>
            {accountOpen && (
              <div className="nav-dropdown account-dropdown">
                <strong>
                  {store.user ? `Hi, ${store.user.name.split(' ')[0]}` : 'Welcome to Mobile Shop'}
                </strong>
                <Link prefetch={false} href="/account" onClick={() => setAccountOpen(false)}>
                  {store.user ? 'My account' : 'Sign in / Register'}
                </Link>
                <Link
                  prefetch={false}
                  href="/account?tab=orders"
                  onClick={() => setAccountOpen(false)}
                >
                  My orders
                </Link>
                {store.user?.role === 'ADMIN' && (
                  <Link prefetch={false} href="/admin">
                    Admin dashboard
                  </Link>
                )}
                {store.user && (
                  <button
                    onClick={() => {
                      store.logout();
                      setAccountOpen(false);
                    }}
                  >
                    Sign out
                  </button>
                )}
              </div>
            )}
          </div>
          <Link
            prefetch={false}
            href="/wishlist"
            className="icon-button header-wish"
            aria-label={`Wishlist, ${store.wishlist.length} items`}
          >
            <Heart size={21} />
            {store.wishlist.length > 0 && <i className="tiny-dot" />}
          </Link>
          <button
            className="icon-button cart-header"
            aria-label={`Open cart, ${count} items`}
            onClick={() => store.setCartOpen(true)}
          >
            <ShoppingBag size={21} />
            <span className="cart-count">{count}</span>
          </button>
        </div>
        <nav className="category-nav container" aria-label="Product categories">
          <Link prefetch={false} href="/shop" className="active">
            All products
          </Link>
          {categories.map((c) => (
            <Link prefetch={false} key={c} href={`/shop?category=${encodeURIComponent(c)}`}>
              {c}
            </Link>
          ))}
          <span className="nav-divider" />
          <Link prefetch={false} href="/shop?collection=new">
            New arrivals <span className="new-dot" />
          </Link>
          <Link prefetch={false} href="/shop?offers=true" className="nav-deals">
            Weekly deals <ArrowUpRight size={13} />
          </Link>
        </nav>
      </header>
      <Modal open={mobile} onClose={() => setMobile(false)} title="Explore Mobile Shop" drawer>
        <nav className="mobile-nav">
          <Link prefetch={false} href="/shop" onClick={() => setMobile(false)}>
            Shop all <ArrowRight size={18} />
          </Link>
          {categories.map((c) => (
            <Link
              prefetch={false}
              key={c}
              href={`/shop?category=${encodeURIComponent(c)}`}
              onClick={() => setMobile(false)}
            >
              {c}
              <ArrowRight size={18} />
            </Link>
          ))}
          <Link prefetch={false} href="/shop?offers=true" onClick={() => setMobile(false)}>
            Special offers
          </Link>
          <Link prefetch={false} href="/wishlist" onClick={() => setMobile(false)}>
            Wishlist
          </Link>
          <Link prefetch={false} href="/account" onClick={() => setMobile(false)}>
            My account
          </Link>
        </nav>
      </Modal>
      {store.cartOpen && <CartDrawer />}
    </>
  );
}
