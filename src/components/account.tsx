'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  UserRound,
  ShoppingBag,
  MapPin,
  Heart,
  CreditCard,
  LogOut,
  ArrowRight,
  Package,
  Plus,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { useStoreReady, useStore, api } from './store-provider';
import { money } from '@/lib/catalog-shared';
export type Address = {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  label: string;
};
export type OrderView = {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  refundStatus: string;
  checkoutKey?: string;
  refundReference: string | null;
  refundAmount: number;
  total: number;
  subtotal: number;
  shipping: number;
  createdAt: string;
  tracking: string;
  inventoryConflict: boolean;
  address: Address;
  items: {
    id: string;
    title: string;
    image: string;
    variantLabel: string;
    quantity: number;
    price: number;
  }[];
  payments: {
    id: string;
    providerId: string;
    amount: number;
    method: string;
    status: string;
    createdAt: string;
  }[];
  history: { id: string; status: string; note: string; createdAt: string }[];
  user?: { name: string; email: string };
};
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}
export function AuthForm({ onSuccess }: { onSuccess?: () => void }) {
  const params = useSearchParams(),
    store = useStore();
  const [mode, setMode] = useState(params.get('mode') || 'login'),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await api(`auth/${mode}`, { name, email, password, token: params.get('token') });
      if (mode === 'login') {
        await store.refreshUser();
        onSuccess?.();
        store.notify('Welcome back. Your next upgrade awaits.');
      } else {
        setMessage(data.message);
        if (mode === 'verify' || mode === 'reset') setMode('login');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-card">
      <span className="auth-icon">
        <UserRound size={27} />
      </span>
      <span className="eyebrow">YOUR WORLD OF TECH</span>
      <h1>
        {mode === 'register'
          ? 'Make yourself at home.'
          : mode === 'forgot'
            ? 'Let’s get you back in.'
            : mode === 'verify'
              ? 'One last step.'
              : mode === 'reset'
                ? 'A fresh start.'
                : mode === 'resend'
                  ? 'Check your inbox.'
                  : 'Good to see you again.'}
      </h1>
      <p>
        {mode === 'register'
          ? 'Create an account for a more personal shopping experience.'
          : mode === 'verify'
            ? 'Verify your email to unlock your account.'
            : mode === 'reset'
              ? 'Choose a new password for your account.'
              : 'Your orders, favorites, and next upgrade. All in one place.'}
      </p>
      <form onSubmit={submit}>
        {mode === 'register' && (
          <label className="field">
            Full name
            <input
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}
        {!['verify', 'reset'].includes(mode) && (
          <label className="field">
            Email address
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        )}
        {['login', 'register', 'reset'].includes(mode) && (
          <label className="field">
            Password
            <input
              id="account-password"
              aria-label="Password"
              aria-describedby={mode === 'login' ? undefined : 'password-hint'}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'login' ? 1 : 10}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode !== 'login' && <small id="password-hint">At least 10 characters.</small>}
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="form-success" role="status">
            {message}
          </p>
        )}
        <button className="button full" disabled={busy}>
          {busy
            ? 'Please wait…'
            : mode === 'login'
              ? 'Sign in'
              : mode === 'register'
                ? 'Create account'
                : mode === 'verify'
                  ? 'Verify email'
                  : mode === 'reset'
                    ? 'Update password'
                    : 'Send email'}
          <ArrowRight size={17} />
        </button>
      </form>
      <div className="auth-links">
        {mode === 'login' ? (
          <>
            <button onClick={() => setMode('forgot')}>Forgot password?</button>
            <button onClick={() => setMode('resend')}>Resend verification</button>
            <span>
              New here?{' '}
              <button
                onClick={() => {
                  setMode('register');
                  setMessage('');
                }}
              >
                Create an account
              </button>
            </span>
          </>
        ) : (
          <button
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Back to sign in
          </button>
        )}
      </div>
      <p className="secure-note">
        <ShieldCheck size={14} /> Your details stay protected.
      </p>
    </div>
  );
}
export function AddressForm({
  onSaved,
  onCancel,
}: {
  onSaved: (address: Address) => void;
  onCancel?: () => void;
}) {
  const store = useStore();
  const ready = useStoreReady();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <form
      className="address-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const form = new FormData(e.currentTarget);
        try {
          const address = await api<Address>('addresses', Object.fromEntries(form));
          onSaved(address);
          store.notify('Address saved');
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        {[
          { key: 'name', label: 'Full name', auto: 'name' },
          { key: 'phone', label: 'Mobile number', auto: 'tel' },
          { key: 'line1', label: 'Street address', auto: 'address-line1' },
          { key: 'line2', label: 'Apartment / landmark (optional)', auto: 'address-line2' },
          { key: 'city', label: 'City', auto: 'address-level2' },
          { key: 'state', label: 'State', auto: 'address-level1' },
          { key: 'pincode', label: 'Pincode', auto: 'postal-code' },
        ].map((f) => (
          <label className="field" key={f.key}>
            {f.label}
            <input
              name={f.key}
              autoComplete={f.auto}
              required={f.key !== 'line2'}
              maxLength={f.key === 'phone' ? 10 : f.key === 'pincode' ? 6 : 200}
              inputMode={['phone', 'pincode'].includes(f.key) ? 'numeric' : 'text'}
              pattern={
                f.key === 'phone'
                  ? '[6-9][0-9]{9}'
                  : f.key === 'pincode'
                    ? '[1-9][0-9]{5}'
                    : undefined
              }
            />
          </label>
        ))}
        <label className="field">
          Label
          <select name="label">
            <option>Home</option>
            <option>Work</option>
            <option>Other</option>
          </select>
        </label>
      </div>
      <p className="tax-note">Delivery within India only.</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="button" disabled={busy}>
          {busy ? 'Saving…' : 'Save address'}
        </button>
        {onCancel && (
          <button type="button" className="button button-outline" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
function AccountInner() {
  const ready = useStoreReady();
  const store = useStore(),
    params = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') || 'overview'),
    [data, setData] = useState<{ orders: OrderView[]; addresses: Address[] } | null>(null),
    [addressForm, setAddressForm] = useState(false),
    [error, setError] = useState(''),
    [name, setName] = useState('');
  useEffect(() => {
    if (store.user) {
      setName(store.user.name);
      api('account')
        .then(setData)
        .catch((e) => setError(e.message));
    }
  }, [store.user]);
  useEffect(() => {
    if (params.get('tab')) setTab(params.get('tab')!);
  }, [params]);
  if (!ready)
    return (
      <main className="container page-space">
        <div className="skeleton" style={{ height: 400 }} />
      </main>
    );
  if (!store.user)
    return (
      <main className="auth-page container">
        <AuthForm />
      </main>
    );
  const user = store.user;
  const menu = [
    { id: 'overview', icon: UserRound, label: 'Overview' },
    { id: 'orders', icon: ShoppingBag, label: 'My orders' },
    { id: 'addresses', icon: MapPin, label: 'Saved addresses' },
    { id: 'payments', icon: CreditCard, label: 'Payment history' },
    { id: 'profile', icon: UserRound, label: 'Profile settings' },
  ];
  return (
    <main className="container page-space">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">YOUR PERSONAL TECH SPACE</span>
          <h1>Hello, {user.name.split(' ')[0]}.</h1>
          <p>Everything you need, right where you need it.</p>
        </div>
        <Link className="button button-outline" href="/shop">
          Keep exploring <ArrowRight size={16} />
        </Link>
      </div>
      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="profile-summary">
            <span>
              {user.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </span>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
            <span className="stock">
              <ShieldCheck size={12} /> Verified account
            </span>
          </div>
          <nav>
            {menu.map((m) => (
              <button
                className={tab === m.id ? 'active' : ''}
                key={m.id}
                onClick={() => setTab(m.id)}
              >
                <m.icon size={18} />
                {m.label}
              </button>
            ))}
            <Link href="/wishlist">
              <Heart size={18} /> My wishlist <b>{store.wishlist.length}</b>
            </Link>
            {user.role === 'ADMIN' && (
              <Link href="/admin">
                <ShieldCheck size={18} /> Admin portal
              </Link>
            )}
            <button onClick={() => store.logout()}>
              <LogOut size={18} /> Sign out
            </button>
          </nav>
        </aside>
        <div className="account-main">
          {error && <p className="form-error">{error}</p>}
          {!data ? (
            <div className="skeleton" style={{ height: 300 }} />
          ) : tab === 'overview' ? (
            <>
              <div className="stats-grid">
                <div>
                  <span>
                    <Package size={20} />
                  </span>
                  <strong>{data.orders.length}</strong>
                  <p>Total orders</p>
                </div>
                <div>
                  <span>
                    <TruckIcon />
                  </span>
                  <strong>
                    {
                      data.orders.filter(
                        (o) =>
                          !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(o.status) &&
                          o.paymentStatus === 'PAID',
                      ).length
                    }
                  </strong>
                  <p>On the way</p>
                </div>
                <div>
                  <span>
                    <Heart size={20} />
                  </span>
                  <strong>{store.wishlist.length}</strong>
                  <p>Saved favorites</p>
                </div>
              </div>
              <div className="panel">
                <div className="panel-heading">
                  <h2>Recent orders</h2>
                  <button className="text-link" onClick={() => setTab('orders')}>
                    View all <ArrowRight size={15} />
                  </button>
                </div>
                <OrderList orders={data.orders.slice(0, 4)} />
              </div>
              <div className="account-banner">
                <div>
                  <span className="eyebrow">READY FOR SOMETHING NEW?</span>
                  <h2>
                    Make your next upgrade
                    <br />a great one.
                  </h2>
                </div>
                <Link className="button" href="/shop">
                  Find your next favorite <ArrowRight size={16} />
                </Link>
              </div>
            </>
          ) : tab === 'orders' ? (
            <div className="panel">
              <h2>My orders</h2>
              <OrderList orders={data.orders} />
            </div>
          ) : tab === 'addresses' ? (
            <div className="panel">
              <div className="panel-heading">
                <h2>Saved addresses</h2>
                <button className="button button-outline" onClick={() => setAddressForm(true)}>
                  <Plus size={16} /> Add address
                </button>
              </div>
              {addressForm ? (
                <AddressForm
                  onCancel={() => setAddressForm(false)}
                  onSaved={(address) => {
                    setData({ ...data, addresses: [...data.addresses, address] });
                    setAddressForm(false);
                  }}
                />
              ) : (
                <div className="address-grid">
                  {data.addresses.map((a) => (
                    <div className="address-card" key={a.id}>
                      <span className="subtle-pill">{a.label}</span>
                      <h3>{a.name}</h3>
                      <p>
                        {a.line1}
                        <br />
                        {a.line2 && (
                          <>
                            {a.line2}
                            <br />
                          </>
                        )}
                        {a.city}, {a.state} {a.pincode}
                        <br />
                        {a.phone}
                      </p>
                      <button
                        className="text-link danger"
                        onClick={async () => {
                          try {
                            await api('addresses', { id: a.id }, 'DELETE');
                            setData({
                              ...data,
                              addresses: data.addresses.filter((v) => v.id !== a.id),
                            });
                          } catch (e) {
                            store.notify((e as Error).message);
                          }
                        }}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  ))}
                  {!data.addresses.length && <p>No saved addresses yet.</p>}
                </div>
              )}
            </div>
          ) : tab === 'payments' ? (
            <div className="panel">
              <h2>Payment history</h2>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Payment ID</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.flatMap((o) =>
                      o.payments.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <Link href={`/account/orders/${o.id}`}>{o.number}</Link>
                          </td>
                          <td>{p.providerId}</td>
                          <td>{p.method}</td>
                          <td>{money(p.amount)}</td>
                          <td>
                            <StatusBadge status={p.status} />
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
              {!data.orders.some((o) => o.payments.length) && <p>No payments yet.</p>}
            </div>
          ) : (
            <div className="panel">
              <h2>Profile settings</h2>
              <form
                className="profile-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api('account/profile', { name }, 'PATCH');
                    await store.refreshUser();
                    store.notify('Profile updated');
                  } catch (e) {
                    store.notify((e as Error).message);
                  }
                }}
              >
                <label className="field">
                  Full name
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="field">
                  Email
                  <input readOnly value={user.email} />
                </label>
                <button className="button">Save changes</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
function TruckIcon() {
  return <Package size={20} />;
}
export function OrderList({ orders }: { orders: OrderView[] }) {
  return orders.length ? (
    <div className="order-list">
      {orders.map((o) => (
        <Link className="order-row" key={o.id} href={`/account/orders/${o.id}`}>
          <span className="order-icon">
            <Package size={22} />
          </span>
          <div>
            <strong>{o.number}</strong>
            <small>
              {new Date(o.createdAt).toLocaleDateString('en-IN')} · {o.items.length} item
              {o.items.length !== 1 ? 's' : ''}
            </small>
          </div>
          <StatusBadge status={o.status} />
          <strong>{money(o.total)}</strong>
          <ArrowRight size={16} />
        </Link>
      ))}
    </div>
  ) : (
    <div className="empty-state compact-empty">
      <Package size={35} />
      <h3>Your story starts with an upgrade.</h3>
      <p>Your orders will appear here.</p>
      <Link href="/shop" className="text-link">
        Discover the collection <ArrowRight size={15} />
      </Link>
    </div>
  );
}
export function Account() {
  return (
    <Suspense>
      <AccountInner />
    </Suspense>
  );
}
