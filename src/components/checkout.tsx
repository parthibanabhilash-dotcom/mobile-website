'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Plus,
  LockKeyhole,
  ShieldCheck,
  MapPin,
  CreditCard,
  LoaderCircle,
} from 'lucide-react';
import { useStoreReady, useStore, api } from './store-provider';
import { AuthForm, AddressForm, type Address, type OrderView } from './account';
import { money } from '@/lib/catalog-shared';
import { CartContents } from './cart';
type CheckoutOrder = {
  id: string;
  number: string;
  razorpayOrderId: string;
  total: number;
  keyId: string;
};
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: (data: any) => void) => void;
    };
  }
}
async function loadRazorpay() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Could not load secure checkout. Check your connection.'));
    document.body.appendChild(script);
  });
}
function CheckoutInner() {
  const ready = useStoreReady();
  const store = useStore(),
    router = useRouter(),
    params = useSearchParams();
  const [step, setStep] = useState(1),
    [addresses, setAddresses] = useState<Address[]>([]),
    [selected, setSelected] = useState(''),
    [addAddress, setAddAddress] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [pending, setPending] = useState(false),
    [quote, setQuote] = useState<Pick<CheckoutOrder, 'id' | 'number' | 'total'> | null>(null),
    [order, setOrder] = useState<OrderView | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const attempts = useRef(0);
  const presenting = useRef(false);
  const handledOrder = useRef<string | null>(null);
  const userId = useRef(store.user?.id);
  userId.current = store.user?.id;
  useEffect(() => {
    setQuote(null);
    setOrder(null);
    setPending(false);
    setAddresses([]);
    setSelected('');
    setBusy(false);
    setError('');
    presenting.current = false;
    handledOrder.current = null;
    if (store.user) {
      const owner = store.user.id;
      api<Address[]>('addresses')
        .then((a) => {
          if (userId.current !== owner) return;
          setAddresses(a);
          setSelected(a[0]?.id || '');
          setAddAddress(!a.length);
        })
        .catch((e) => {
          if (userId.current === owner) setError(e.message);
        });
      setStep(2);
    } else setStep(1);
  }, [store.user?.id]);
  async function readOrder(id: string) {
    const owner = userId.current;
    let current = await api<OrderView>(`orders/${id}`);
    if (userId.current !== owner) return current;
    if (current.paymentStatus === 'PENDING' && current.checkoutKey) {
      sessionStorage.setItem('mobile-checkout-key', current.checkoutKey);
      setQuote(current);
    }
    if (current.paymentStatus !== 'PAID') {
      try {
        await api('payments/reconcile', { orderId: id });
        current = await api<OrderView>(`orders/${id}`);
      } catch {}
    }
    if (userId.current !== owner) return current;
    if (current.paymentStatus === 'PAID') {
      setOrder(current);
      setStep(5);
      setPending(false);
      store.clearCart();
      sessionStorage.removeItem('mobile-checkout-key');
      if (poll.current) clearInterval(poll.current);
    }
    return current;
  }
  function startPoll(id: string) {
    setPending(true);
    attempts.current = 0;
    readOrder(id).catch(() => {});
    if (poll.current) clearInterval(poll.current);
    poll.current = setInterval(() => {
      attempts.current++;
      readOrder(id).catch(() => {});
      if (attempts.current >= 30) {
        if (poll.current) clearInterval(poll.current);
        setBusy(false);
        setPending(false);
        setError(
          'Verification is taking longer than expected. Check your order before attempting another payment.',
        );
      }
    }, 4000);
  }
  useEffect(() => {
    const id = params.get('order');
    if (id && store.user && handledOrder.current !== id && !presenting.current) {
      handledOrder.current = id;
      setStep(4);
      startPoll(id);
    }
    return () => {
      if (poll.current) clearInterval(poll.current);
    };
  }, [params, store.user?.id]);
  async function pay() {
    setBusy(true);
    setError('');
    try {
      await loadRazorpay();
      let key = sessionStorage.getItem('mobile-checkout-key');
      if (!key) {
        await api('cart', { items: store.cart }, 'PUT');
        key = crypto.randomUUID();
        sessionStorage.setItem('mobile-checkout-key', key);
      }
      const checkout = await api<CheckoutOrder>('checkout', { addressId: selected, key });
      setQuote(checkout);
      handledOrder.current = checkout.id;
      presenting.current = true;
      router.replace(`/checkout?order=${checkout.id}`, { scroll: false });
      const gateway = new window.Razorpay!({
        key: checkout.keyId,
        amount: checkout.total,
        currency: 'INR',
        name: 'Mobile Shop',
        description: checkout.number,
        order_id: checkout.razorpayOrderId,
        prefill: {
          name: store.user?.name,
          email: store.user?.email,
          contact: addresses.find((a) => a.id === selected)?.phone,
        },
        theme: { color: '#315bdf' },
        modal: {
          ondismiss: () => {
            presenting.current = false;
            setPending(false);
            setBusy(false);
            setError('Checkout closed. You can check payment status in your orders or try again.');
          },
        },
        handler: async (result: { razorpay_payment_id: string; razorpay_signature: string }) => {
          presenting.current = false;
          setPending(true);
          try {
            await api('payments/verify', { orderId: checkout.id, ...result });
            await readOrder(checkout.id);
          } catch (e) {
            setError((e as Error).message);
          }
          startPoll(checkout.id);
        },
      });
      gateway.on('payment.failed', () => {
        presenting.current = false;
        setPending(false);
        setBusy(false);
        setError('Payment did not complete. No order will be marked paid without verification.');
      });
      gateway.open();
    } catch (e) {
      presenting.current = false;
      setError((e as Error).message);
      sessionStorage.removeItem('mobile-checkout-key');
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <main className="container page-space">
        <div className="skeleton" style={{ height: 400 }} />
      </main>
    );
  return (
    <main className="container checkout-page">
      <div className="checkout-heading">
        <div>
          <span className="eyebrow">YOUR NEXT UPGRADE IS ALMOST HERE</span>
          <h1>Good choices. Secure checkout.</h1>
        </div>
        <span>
          <LockKeyhole size={16} /> Encrypted & protected
        </span>
      </div>
      <ol className="checkout-progress">
        {['Login', 'Address', 'Order summary', 'Payment', 'Confirmation'].map((label, i) => (
          <li key={label} className={step > i + 1 ? 'complete' : step === i + 1 ? 'active' : ''}>
            <span>{step > i + 1 ? <Check size={16} /> : i + 1}</span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {step === 5 && order ? (
        <div className="confirmation">
          <div className="success-icon">
            <Check size={40} />
          </div>
          <span className="eyebrow">A GREAT CHOICE, CONFIRMED</span>
          <h1>
            Payment successful.
            <br />
            {order.inventoryConflict
              ? 'Your order needs a stock review.'
              : order.status === 'CANCELLED'
                ? 'Your order was cancelled.'
                : order.status === 'RETURNED'
                  ? 'Your order was returned.'
                  : 'Your order is confirmed.'}
          </h1>
          <p>
            {order.inventoryConflict
              ? 'Your payment is verified. Our team will contact you about an inventory issue.'
              : ['CANCELLED', 'RETURNED'].includes(order.status)
                ? 'Payment and refund statuses are recorded separately. View your order for the latest details.'
                : 'We’re getting your next upgrade ready. Follow its journey in your account.'}
          </p>
          <div className="confirmation-details">
            <span>
              Order number<strong>{order.number}</strong>
            </span>
            <span>
              Payment ID<strong>{order.payments[0]?.providerId || 'Verified by Razorpay'}</strong>
            </span>
          </div>
          <div className="hero-buttons">
            <Link className="button" href={`/account/orders/${order.id}`}>
              View order <ArrowRight size={16} />
            </Link>
            <Link href="/shop" className="button button-outline">
              Continue shopping
            </Link>
          </div>
        </div>
      ) : step === 1 ? (
        <div className="checkout-login">
          <AuthForm onSuccess={() => setStep(2)} />
        </div>
      ) : !store.cart.length && !pending ? (
        <CartContents />
      ) : (
        <div className="checkout-grid">
          <div className="panel checkout-panel">
            {step === 2 ? (
              <>
                <div className="panel-heading">
                  <h2>
                    <MapPin size={22} /> Where should it go?
                  </h2>
                  <button className="text-link" onClick={() => setAddAddress(!addAddress)}>
                    <Plus size={16} /> New address
                  </button>
                </div>
                {addAddress ? (
                  <AddressForm
                    onCancel={addresses.length ? () => setAddAddress(false) : undefined}
                    onSaved={(a) => {
                      setAddresses([...addresses, a]);
                      setSelected(a.id);
                      setAddAddress(false);
                    }}
                  />
                ) : (
                  <>
                    <div className="checkout-addresses">
                      {addresses.map((a) => (
                        <label
                          className={`address-card ${selected === a.id ? 'selected' : ''}`}
                          key={a.id}
                        >
                          <input
                            type="radio"
                            name="address"
                            checked={selected === a.id}
                            onChange={() => setSelected(a.id)}
                          />
                          <div>
                            <span className="subtle-pill">{a.label}</span>
                            <h3>{a.name}</h3>
                            <p>
                              {a.line1}, {a.line2}
                              <br />
                              {a.city}, {a.state} {a.pincode}
                              <br />
                              {a.phone}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <button className="button" disabled={!selected} onClick={() => setStep(3)}>
                      Continue to summary <ArrowRight size={16} />
                    </button>
                  </>
                )}
              </>
            ) : step === 3 ? (
              <>
                <h2>One last look.</h2>
                <p>Check your items and delivery address before payment.</p>
                {store.cart.map((c) => {
                  const p = store.products.find((p) =>
                    p.variants.some((v) => v.id === c.variantId),
                  );
                  const v = p?.variants.find((v) => v.id === c.variantId);
                  return p && v ? (
                    <div className="order-product" key={c.variantId}>
                      <Image src={p.images[0]} alt={p.title} width={70} height={80} />
                      <div>
                        <strong>{p.title}</strong>
                        <p>
                          {v.color} · {v.storage} · Qty {c.quantity}
                        </p>
                      </div>
                      <strong>{money(v.price * c.quantity)}</strong>
                    </div>
                  ) : null;
                })}
                <h3>Delivering to</h3>
                <p>
                  {addresses.find((a) => a.id === selected)?.line1},{' '}
                  {addresses.find((a) => a.id === selected)?.city}
                </p>
                <div className="form-actions">
                  <button className="button button-outline" onClick={() => setStep(2)}>
                    <ArrowLeft size={16} /> Address
                  </button>
                  <button className="button" onClick={() => setStep(4)}>
                    Continue to payment <ArrowRight size={16} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="payment-icon">
                  <CreditCard size={28} />
                </span>
                <h2>{pending ? 'Checking your payment.' : 'A secure finish.'}</h2>
                <p>
                  {pending
                    ? 'We’re confirming your payment with Razorpay. This page will update after backend verification.'
                    : 'Pay securely with UPI, cards, net banking, or supported wallets through Razorpay.'}
                </p>
                {pending ? (
                  <>
                    <LoaderCircle className="spinner" size={30} />
                    <Link className="text-link" href="/account?tab=orders">
                      Check my orders <ArrowRight size={16} />
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="payment-methods">
                      <span>UPI</span>
                      <span>VISA</span>
                      <span>Mastercard</span>
                      <span>Net banking</span>
                    </div>
                    <button className="button full" disabled={busy} onClick={pay}>
                      {busy ? 'Preparing secure checkout…' : 'Pay securely with Razorpay'}
                      <LockKeyhole size={17} />
                    </button>
                    <button
                      className="text-link"
                      disabled={busy || !!params.get('order')}
                      onClick={() => setStep(3)}
                    >
                      <ArrowLeft size={15} /> Back to summary
                    </button>
                    {quote && (
                      <p>
                        Reserved order {quote.number} · Total {money(quote.total)}.{' '}
                        <Link className="text-link" href={`/account/orders/${quote.id}`}>
                          Review saved items and address
                        </Link>
                      </p>
                    )}
                    <p className="secure-note">
                      <ShieldCheck size={14} /> Payments are confirmed only after server
                      verification.
                    </p>
                  </>
                )}
              </>
            )}
          </div>
          <aside>
            <CartContents drawer />
          </aside>
        </div>
      )}
    </main>
  );
}
export function Checkout() {
  return (
    <Suspense>
      <CheckoutInner />
    </Suspense>
  );
}
