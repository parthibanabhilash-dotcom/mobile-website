'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Plus, Search, ArrowUpRight, UploadCloud, X, Trash2, ArrowLeft, Save } from 'lucide-react';
import { api, useStore } from './store-provider';
import {
  type ShopProduct,
  type ShopVariant,
  money,
  categories,
  brands,
} from '@/lib/catalog-shared';
import { StatusBadge } from './account';
export function AdminProducts() {
  const [list, setList] = useState<ShopProduct[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [q, setQ] = useState(''),
    [category, setCategory] = useState(''),
    [brand, setBrand] = useState(''),
    [stock, setStock] = useState(''),
    [status, setStatus] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(
      () =>
        api<{ products: ShopProduct[]; total: number }>(
          `admin/products?q=${encodeURIComponent(q)}&page=${page}&category=${encodeURIComponent(category)}&brand=${encodeURIComponent(brand)}&stock=${stock}&status=${status}`,
        )
          .then((data) => {
            if (!cancelled) {
              setList(data.products);
              setTotal(data.total);
            }
          })
          .catch((e) => {
            if (!cancelled) setError(e.message);
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          }),
      250,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, page, category, brand, stock, status]);
  useEffect(() => setPage(1), [q, category, brand, stock, status]);
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">YOUR COLLECTION, ORGANIZED</span>
          <h1>Products</h1>
          <p>Manage the tech your customers love.</p>
        </div>
        <Link className="button" href="/admin/products/new">
          <Plus size={17} /> Add product
        </Link>
      </div>
      <div className="panel" id="product-section-0">
        <div className="admin-filters">
          <label className="input-with-icon">
            <Search size={17} />
            <input
              aria-label="Search products"
              placeholder="Search products…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <select
            aria-label="Category filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Brand filter"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <select
            aria-label="Stock filter"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          >
            <option value="">All stock</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
          <select
            aria-label="Status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option>ACTIVE</option>
            <option>DRAFT</option>
            <option>ARCHIVED</option>
          </select>
        </div>
        {error && <p className="form-error">{error}</p>}
        {loading ? (
          <div className="skeleton" style={{ height: 300 }} />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="table-product">
                        <Image src={p.images[0]} alt="" width={48} height={56} />
                        <div>
                          <strong>{p.title}</strong>
                          <small>
                            {p.brand} · {p.variants.length} variants
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>{p.category}</td>
                    <td>
                      <strong>{money(p.variants[0]?.price || 0)}</strong>
                    </td>
                    <td>{p.variants.reduce((s, v) => s + v.stock - v.reserved, 0)} available</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td>
                      <Link className="text-link" href={`/admin/products/${p.id}`}>
                        Edit <ArrowUpRight size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.length && <div className="chart-empty">No products match these filters.</div>}
          </div>
        )}
        <div className="table-footer">
          <span>{total} products</span>
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>Page {page}</span>
            <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
type Draft = {
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  warranty: string;
  brand: string;
  category: string;
  specifications: Record<string, string>;
  badge: string;
  featured: boolean;
  status: string;
  seoTitle: string;
  seoDescription: string;
  images: string[];
  variants: Partial<ShopVariant>[];
};
const emptyVariant = () => ({
  sku: '',
  color: 'Midnight',
  colorHex: '#282b30',
  ram: '8 GB',
  storage: '256 GB',
  price: 10000,
  originalPrice: 12000,
  stock: 0,
});
const initial: Draft = {
  title: '',
  slug: '',
  subtitle: '',
  description: '',
  warranty: '1 year manufacturer warranty',
  brand: 'Apple',
  category: 'Smartphones',
  specifications: {},
  badge: '',
  featured: false,
  status: 'DRAFT',
  seoTitle: '',
  seoDescription: '',
  images: [],
  variants: [emptyVariant()],
};
export function ProductEditor({ id }: { id?: string }) {
  const store = useStore(),
    router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial),
    [specs, setSpecs] = useState('Display: OLED\nConnectivity: 5G'),
    [busy, setBusy] = useState(false),
    [upload, setUpload] = useState(0),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(!!id);
  useEffect(() => {
    if (id)
      api<ShopProduct & { seoTitle: string; seoDescription: string }>(`admin/products/${id}`)
        .then((p) => {
          setDraft({ ...p, seoTitle: p.seoTitle || '', seoDescription: p.seoDescription || '' });
          setSpecs(
            Object.entries(p.specifications)
              .map(([k, v]) => `${k}: ${v}`)
              .join('\n'),
          );
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
  }, [id]);
  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  function variant(index: number, key: string, value: unknown) {
    setDraft((d) => ({
      ...d,
      variants: d.variants.map((v, i) => (i === index ? { ...v, [key]: value } : v)),
    }));
  }
  async function uploadFiles(files: FileList | File[]) {
    const selected = Array.from(files);
    if (!selected.length) return;
    if (selected.length + draft.images.length > 10) {
      setError('Maximum 10 images. Remove an image before uploading more.');
      return;
    }
    if (
      selected.some(
        (file) =>
          !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      setError('Choose PNG, JPEG or WebP files up to 5 MB each.');
      return;
    }
    setError('');
    setUpload(0);
    setUploading(true);
    let urls: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const form = new FormData();
        form.set('file', files[i]);
        const url = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/admin/upload');
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              setUpload(Math.round(((i + e.loaded / e.total) / files.length) * 100));
          };
          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText);
              xhr.status < 300 ? resolve(data.url) : reject(new Error(data.error));
            } catch {
              reject(new Error('Upload failed'));
            }
          };
          xhr.onerror = () => reject(new Error('Upload failed'));
          xhr.send(form);
        });
        urls.push(url);
        setDraft((d) => ({ ...d, images: [...d.images, url] }));
      }
      store.notify('Images uploaded');
    } catch (e) {
      setError((e as Error).message);
      if (urls.length) setDraft((d) => ({ ...d, images: [...d.images, ...urls].slice(0, 10) }));
    } finally {
      setUploading(false);
      setUpload(0);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const skus = draft.variants.map((v) => v.sku?.trim().toLowerCase());
      if (new Set(skus).size !== skus.length) throw new Error('Each variant needs a unique SKU.');
      for (const [index, v] of draft.variants.entries()) {
        if (!v.price || !v.originalPrice || v.originalPrice < v.price)
          throw new Error(`Variant ${index + 1}: original price must be at least the offer price.`);
        if (!Number.isInteger(v.stock) || (v.stock || 0) < (v.reserved || 0))
          throw new Error(
            `Variant ${index + 1}: stock must be a whole number covering reserved units.`,
          );
      }
      if (draft.status === 'ACTIVE' && !draft.images.length)
        throw new Error('Add at least one product image before publishing.');
      const specifications = Object.fromEntries(
        specs
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const split = line.indexOf(':');
            if (split < 1)
              throw new Error('Specifications should use “Name: Value”, one per line.');
            return [line.slice(0, split).trim(), line.slice(split + 1).trim()];
          }),
      );
      await api('admin/products', { ...draft, id, specifications }, id ? 'PUT' : 'POST');
      store.notify(id ? 'Product updated' : 'Product created');
      router.push('/admin/products');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <div className="skeleton" style={{ height: 500 }} />;
  return (
    <>
      <Link className="text-link" href="/admin/products">
        <ArrowLeft size={16} /> Back to products
      </Link>
      <div className="dashboard-heading">
        <div>
          <h1>{id ? 'Edit product' : 'Add product'}</h1>
          <p>A clear, complete product page makes all the difference.</p>
        </div>
      </div>
      <form className="product-editor" onSubmit={save}>
        <div className="editor-summary panel">
          <div>
            <span className="eyebrow">PRODUCT PREVIEW</span>
            <h2>{draft.title || 'Your new product'}</h2>
            <p>
              {draft.brand} · {draft.category} · {draft.status}
            </p>
          </div>
          <div>
            <strong>{money(Math.min(...draft.variants.map((v) => v.price || 0)))}</strong>
            <p>
              {draft.variants.length} variants ·{' '}
              {draft.variants.reduce(
                (sum, v) => sum + Math.max(0, (v.stock || 0) - (v.reserved || 0)),
                0,
              )}{' '}
              available · {draft.images.length}/10 images
            </p>
          </div>
        </div>
        <nav className="editor-sections" aria-label="Product form sections">
          {[
            'Basic information',
            'Pricing & inventory',
            'Specifications & warranty',
            'Images',
            'SEO',
            'Status & merchandising',
          ].map((name, index) => (
            <a key={name} href={`#product-section-${index}`}>
              {name}
            </a>
          ))}
        </nav>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="panel" id="product-section-0">
          <h2>Basic information</h2>
          <div className="form-grid">
            <label className="field">
              Product title
              <input
                required
                value={draft.title}
                onChange={(e) => {
                  update('title', e.target.value);
                  if (!id)
                    update(
                      'slug',
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, ''),
                    );
                }}
              />
            </label>
            <label className="field">
              URL slug
              <input
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={draft.slug}
                onChange={(e) => update('slug', e.target.value)}
              />
            </label>
            <label className="field">
              Brand
              <input
                required
                list="brand-list"
                aria-label="Brand"
                value={draft.brand}
                onChange={(e) => update('brand', e.target.value)}
              />
              <datalist id="brand-list">
                {brands.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </datalist>
            </label>
            <label className="field">
              Category
              <input
                required
                list="category-list"
                aria-label="Category"
                value={draft.category}
                onChange={(e) => {
                  update('category', e.target.value);
                  if (!id && e.target.value !== 'Smartphones')
                    update(
                      'variants',
                      draft.variants.map((v) => ({ ...v, ram: 'N/A', storage: 'N/A' })),
                    );
                }}
              />
              <datalist id="category-list">
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </datalist>
            </label>
            <label className="field full-field">
              Short subtitle
              <input value={draft.subtitle} onChange={(e) => update('subtitle', e.target.value)} />
            </label>
            <label className="field full-field">
              Description
              <textarea
                required
                minLength={10}
                value={draft.description}
                onChange={(e) => update('description', e.target.value)}
              />
            </label>
          </div>
        </div>
        <div className="panel" id="product-section-1">
          <div className="panel-heading">
            <div>
              <h2>Pricing & inventory</h2>
              <p>Prices include tax. Stock includes reserved units.</p>
            </div>
            <button
              type="button"
              className="button button-outline"
              onClick={() => update('variants', [...draft.variants, emptyVariant()])}
            >
              <Plus size={16} /> Add variant
            </button>
          </div>
          {draft.variants.map((v, i) => (
            <div className="variant-editor" key={v.id || i}>
              <div className="panel-heading">
                <h3>
                  Variant {i + 1} {v.id && <small>· {v.reserved || 0} reserved</small>}
                </h3>
                {!v.id && draft.variants.length > 1 && (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove variant ${i + 1}`}
                    onClick={() =>
                      update(
                        'variants',
                        draft.variants.filter((_, n) => n !== i),
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="form-grid">
                {[
                  { key: 'sku', label: 'SKU' },
                  { key: 'color', label: 'Color' },
                  { key: 'ram', label: 'RAM (N/A for accessories)' },
                  { key: 'storage', label: 'Storage (N/A for accessories)' },
                ].map((f) => (
                  <label className="field" key={f.key}>
                    {f.label}
                    <input
                      required
                      value={String(v[f.key as keyof ShopVariant] ?? '')}
                      onChange={(e) => variant(i, f.key, e.target.value)}
                    />
                  </label>
                ))}
                <label className="field">
                  Color swatch
                  <input
                    type="color"
                    value={v.colorHex}
                    onChange={(e) => variant(i, 'colorHex', e.target.value)}
                  />
                </label>
                <label className="field">
                  Offer price (₹)
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={(v.price || 0) / 100}
                    onChange={(e) => variant(i, 'price', Math.round(Number(e.target.value) * 100))}
                  />
                </label>
                <label className="field">
                  Original price (₹)
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={(v.originalPrice || 0) / 100}
                    onChange={(e) =>
                      variant(i, 'originalPrice', Math.round(Number(e.target.value) * 100))
                    }
                  />
                </label>
                <label className="field">
                  Inventory units
                  <input
                    type="number"
                    required
                    min={v.reserved || 0}
                    max="100000"
                    value={v.stock}
                    onChange={(e) => variant(i, 'stock', Number(e.target.value))}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className="panel" id="product-section-2">
          <h2>Specifications & warranty</h2>
          <div className="form-grid">
            <label className="field">
              Specifications <small>One “Name: Value” per line</small>
              <textarea value={specs} onChange={(e) => setSpecs(e.target.value)} rows={6} />
            </label>
            <label className="field">
              Warranty
              <textarea
                required
                maxLength={2000}
                value={draft.warranty}
                onChange={(e) => update('warranty', e.target.value)}
                rows={6}
              />
            </label>
          </div>
        </div>
        <div className="panel" id="product-section-3">
          <h2>Images</h2>
          <label
            className="upload-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!uploading) uploadFiles(e.dataTransfer.files);
            }}
          >
            <UploadCloud size={32} />
            <strong>
              {uploading ? 'Uploading your images…' : 'Drop images here, or click to browse'}
            </strong>
            <span>PNG, JPEG, or WebP · Up to 5 MB each · Maximum 10 images</span>
            <input
              className="upload-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              disabled={uploading}
              onChange={(e) => {
                if (e.target.files) uploadFiles(e.target.files);
              }}
            />
            {uploading && (
              <div className="progress-track">
                <i style={{ width: `${upload}%` }} />
              </div>
            )}
          </label>
          <div className="upload-previews">
            {draft.images.map((url, i) => (
              <div key={`${url}-${i}`}>
                <Image
                  src={url}
                  alt={`Product preview ${i + 1}`}
                  width={100}
                  height={100}
                  unoptimized
                />
                <button
                  type="button"
                  aria-label={`Remove image ${i + 1}`}
                  onClick={() =>
                    update(
                      'images',
                      draft.images.filter((_, n) => n !== i),
                    )
                  }
                >
                  <X size={14} />
                </button>
                <span>{i === 0 ? 'Cover' : `Image ${i + 1}`}</span>
                {i > 0 && (
                  <button
                    className="cover-button"
                    type="button"
                    aria-label={`Set image ${i + 1} as cover`}
                    onClick={() =>
                      update('images', [url, ...draft.images.filter((_, n) => n !== i)])
                    }
                  >
                    Set cover
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="panel" id="product-section-4">
          <h2>SEO</h2>
          <div className="form-grid">
            <label className="field">
              Page title
              <input
                maxLength={160}
                value={draft.seoTitle}
                onChange={(e) => update('seoTitle', e.target.value)}
              />
            </label>
            <label className="field">
              Meta description
              <textarea
                maxLength={300}
                value={draft.seoDescription}
                onChange={(e) => update('seoDescription', e.target.value)}
              />
            </label>
          </div>
        </div>
        <div className="panel" id="product-section-5">
          <h2>Status & merchandising</h2>
          <div className="form-grid">
            <label className="field">
              Publication status
              <select value={draft.status} onChange={(e) => update('status', e.target.value)}>
                <option>DRAFT</option>
                <option>ACTIVE</option>
                <option>ARCHIVED</option>
              </select>
            </label>
            <label className="field">
              Badge
              <input
                maxLength={30}
                placeholder="e.g. NEW ARRIVAL"
                value={draft.badge}
                onChange={(e) => update('badge', e.target.value)}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(e) => update('featured', e.target.checked)}
              />{' '}
              Feature this product
            </label>
          </div>
        </div>
        <div className="editor-save">
          <Link href="/admin/products" className="button button-outline">
            Cancel
          </Link>
          <button className="button" disabled={busy || uploading}>
            <Save size={17} />
            {busy ? 'Saving…' : 'Save product'}
          </button>
        </div>
      </form>
    </>
  );
}
