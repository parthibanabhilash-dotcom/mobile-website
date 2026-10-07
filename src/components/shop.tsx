'use client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SlidersHorizontal, X, ArrowRight, Search } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState, useRef } from 'react';
import { useStore, api } from './store-provider';
import { ProductCard } from './product-card';
import { categories, brands, type ShopProduct } from '@/lib/catalog-shared';
import { Modal } from './modal';
export function Shop({ initial }: { initial: { products: ShopProduct[]; total: number } }) {
  const params = useSearchParams(),
    store = useStore();
  const [category, setCategory] = useState(params.get('category') || ''),
    [brand, setBrand] = useState(params.get('brand') || ''),
    [max, setMax] = useState(Number(params.get('max')) || 150000),
    [ram, setRam] = useState(params.get('ram') || ''),
    [storage, setStorage] = useState(params.get('storage') || ''),
    [sort, setSort] = useState(params.get('sort') || 'featured'),
    [inStock, setInStock] = useState(params.get('inStock') === 'true'),
    [filters, setFilters] = useState(false),
    [page, setPage] = useState(Math.max(1, Number(params.get('page')) || 1)),
    [query, setQuery] = useState(params.get('q') || '');
  const [all, setAll] = useState<ShopProduct[]>(initial.products),
    [total, setTotal] = useState(initial.total),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false);
  const offers = params.get('offers') === 'true',
    collection = params.get('collection');
  const firstQuery = useRef(true);
  const filterKey = [query, category, brand, max, ram, storage, inStock, sort].join('|');
  const previousFilters = useRef(filterKey);
  useEffect(() => {
    setCategory(params.get('category') || '');
    setBrand(params.get('brand') || '');
    setQuery(params.get('q') || '');
    setMax(Number(params.get('max')) || 150000);
    setRam(params.get('ram') || '');
    setStorage(params.get('storage') || '');
    setSort(params.get('sort') || 'featured');
    setInStock(params.get('inStock') === 'true');
    setPage(Math.max(1, Number(params.get('page')) || 1));
  }, [params]);
  useEffect(() => {
    if (firstQuery.current) {
      firstQuery.current = false;
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const search = new URLSearchParams({
          q: query,
          category,
          brand,
          max: String(max),
          ram,
          storage,
          inStock: String(inStock),
          sort,
          page: String(page),
          offers: String(offers),
          collection: collection || '',
        });
        const response = await api<{ products: ShopProduct[]; total: number }>(`catalog?${search}`);
        if (!cancelled) {
          setAll(response.products);
          setTotal(response.total);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, category, brand, max, ram, storage, inStock, sort, page, offers, collection]);
  const list = all;
  useEffect(() => {
    if (previousFilters.current !== filterKey) {
      previousFilters.current = filterKey;
      setPage(1);
    }
  }, [filterKey]);
  const filterContent = (
    <div className="filter-content">
      <div className="filter-title">
        <h3>Filters</h3>
        <button
          onClick={() => {
            setCategory('');
            setBrand('');
            setMax(150000);
            setRam('');
            setStorage('');
            setInStock(false);
          }}
        >
          Reset all
        </button>
      </div>
      <fieldset>
        <legend>Category</legend>
        {categories.map((c) => (
          <label key={c}>
            <input
              type="radio"
              name="category"
              checked={category === c}
              onChange={() => setCategory(category === c ? '' : c)}
            />
            {c}
          </label>
        ))}
        <button className="filter-clear" onClick={() => setCategory('')}>
          All categories
        </button>
      </fieldset>
      <fieldset>
        <legend>Brand</legend>
        {brands.map((b) => (
          <label key={b}>
            <input type="radio" name="brand" checked={brand === b} onChange={() => setBrand(b)} />
            {b}
          </label>
        ))}
        <button className="filter-clear" onClick={() => setBrand('')}>
          All brands
        </button>
      </fieldset>
      <fieldset>
        <legend>Price range</legend>
        <input
          aria-label="Maximum price"
          type="range"
          min="1000"
          max="150000"
          step="1000"
          value={max}
          onChange={(e) => setMax(Number(e.target.value))}
        />
        <div className="range-label">
          <span>₹0</span>
          <strong>₹{max.toLocaleString('en-IN')}</strong>
        </div>
      </fieldset>
      <label className="field">
        RAM
        <select value={ram} onChange={(e) => setRam(e.target.value)}>
          <option value="">Any RAM</option>
          {['8 GB', '12 GB'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Storage
        <select value={storage} onChange={(e) => setStorage(e.target.value)}>
          <option value="">Any storage</option>
          {['256 GB', '512 GB'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label className="checkbox-label">
        <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />{' '}
        In stock only
      </label>
    </div>
  );
  return (
    <main className="container page-space">
      <div className="breadcrumbs">
        <Link href="/">Home</Link>
        <span>/</span>
        <span>Shop</span>
      </div>
      <div className="shop-heading">
        <div>
          <span className="eyebrow">FIND YOUR NEXT FAVORITE</span>
          <h1>
            {offers
              ? 'Great tech. Better deals.'
              : category || brand || 'Your next upgrade starts here.'}
          </h1>
          <p>Thoughtfully selected tech for whatever comes next.</p>
        </div>
        <span className="subtle-pill">{total} products</span>
      </div>
      <div className="shop-layout">
        <aside className="filters-sidebar">{filterContent}</aside>
        <div>
          <div className="shop-toolbar">
            <button
              className="button button-outline mobile-filter"
              onClick={() => setFilters(true)}
            >
              <SlidersHorizontal size={16} /> Filters
            </button>
            <form className="shop-search" onSubmit={(e) => e.preventDefault()}>
              <Search size={16} />
              <input
                aria-label="Search collection"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search collection"
              />
            </form>
            <label className="sort-label">
              Sort by
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
                <option value="rating">Top rated</option>
              </select>
            </label>
          </div>
          {(category || brand) && (
            <div className="active-filters">
              {category && (
                <button onClick={() => setCategory('')}>
                  {category}
                  <X size={13} />
                </button>
              )}
              {brand && (
                <button onClick={() => setBrand('')}>
                  {brand}
                  <X size={13} />
                </button>
              )}
            </div>
          )}
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : loading ? (
            <div className="product-grid shop-product-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div className="skeleton" style={{ height: 370 }} key={i} />
              ))}
            </div>
          ) : total ? (
            <div className="product-grid shop-product-grid">
              {list.map((p, index) => (
                <Suspense
                  key={p.id}
                  fallback={<div className="skeleton" style={{ height: 360 }} />}
                >
                  <ProductCard product={p} eager={index < 2} />
                </Suspense>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={36} />
              <h2>No matches this time.</h2>
              <p>Try a different search or reset your filters.</p>
            </div>
          )}
          <div className="pagination">
            {Array.from({ length: Math.ceil(total / 9) }, (_, i) => (
              <button
                key={i}
                aria-label={`Page ${i + 1}`}
                aria-current={page === i + 1 ? 'page' : undefined}
                className={page === i + 1 ? 'active' : ''}
                onClick={() => {
                  setPage(i + 1);
                  window.scrollTo({ top: 180, behavior: 'smooth' });
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Modal
        open={filters}
        onClose={() => setFilters(false)}
        title="Find your perfect match"
        drawer
      >
        {filterContent}
        <button className="button full" onClick={() => setFilters(false)}>
          Show {total} products <ArrowRight size={16} />
        </button>
      </Modal>
    </main>
  );
}
