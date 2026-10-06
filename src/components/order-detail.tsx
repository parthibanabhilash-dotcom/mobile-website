'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Package, ExternalLink } from 'lucide-react';
import { api } from './store-provider';
import { StatusBadge, type OrderView } from './account';
import { money } from '@/lib/catalog-shared';
const timeline = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];
export function OrderContent({ order: o }: { order: OrderView }) {
  const index = timeline.indexOf(o.status);
  return (
    <>
      <div className="panel order-timeline">
        <h2>Your order’s journey</h2>
        <div className="timeline-steps">
          {timeline.map((status, i) => (
            <div key={status} className={i <= index ? 'complete' : ''}>
              <span>{i <= index ? <Check size={16} /> : i + 1}</span>
              <small>{status === 'PENDING' ? 'Order placed' : status.replaceAll('_', ' ')}</small>
            </div>
          ))}
        </div>
        {['CANCELLED', 'RETURNED'].includes(o.status) && <StatusBadge status={o.status} />}
        <div className="history-list">
          {o.history.map((h) => (
            <div key={h.id}>
              <i />
              <div>
                <strong>{h.note}</strong>
                <small>{new Date(h.createdAt).toLocaleString('en-IN')}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="order-detail-grid">
        <div className="panel">
          <h2>What’s in your order</h2>
          {o.items.map((item) => (
            <div className="order-product" key={item.id}>
              <Image src={item.image} alt={item.title} width={80} height={90} />
              <div>
                <strong>{item.title}</strong>
                <p>{item.variantLabel}</p>
                <small>Quantity: {item.quantity}</small>
              </div>
              <strong>{money(item.price * item.quantity)}</strong>
            </div>
          ))}
          <div className="order-summary">
            <div>
              <span>Subtotal</span>
              <strong>{money(o.subtotal)}</strong>
            </div>
            <div>
              <span>Delivery</span>
              <strong>{o.shipping ? money(o.shipping) : 'Free'}</strong>
            </div>
            <div className="summary-total">
              <strong>Total (tax included)</strong>
              <strong>{money(o.total)}</strong>
            </div>
          </div>
        </div>
        <div>
          <div className="panel">
            <h2>Delivery address</h2>
            <strong>{o.address.name}</strong>
            <p>
              {o.address.line1}
              <br />
              {o.address.line2 && (
                <>
                  {o.address.line2}
                  <br />
                </>
              )}
              {o.address.city}, {o.address.state} {o.address.pincode}
              <br />
              {o.address.phone}
            </p>
            {o.tracking && (
              <>
                <h3>Tracking information</h3>
                <p className="tracking">{o.tracking}</p>
              </>
            )}
          </div>
          <div className="panel payment-panel">
            <h2>Payment details</h2>
            <StatusBadge status={o.paymentStatus} />
            {o.payments.map((p) => (
              <div key={p.id}>
                <p>
                  {p.method.toUpperCase()} · {money(p.amount)}
                </p>
                <small>Payment ID: {p.providerId}</small>
              </div>
            ))}
            {o.refundStatus !== 'NONE' && (
              <>
                <p>
                  Refund: {money(o.refundAmount)} · {o.refundStatus}
                </p>
                <small>Reference: {o.refundReference}</small>
              </>
            )}
            {o.inventoryConflict && (
              <p className="form-error">
                Your payment is verified. Our team must resolve a stock conflict before fulfilment.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
export function OrderDetail({ id }: { id: string }) {
  const [order, setOrder] = useState<OrderView | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    api<OrderView>(`orders/${id}`)
      .then((o) => {
        if (alive) setOrder(o);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [id]);
  return (
    <main className="container page-space">
      <Link className="text-link" href="/account?tab=orders">
        <ArrowLeft size={16} /> Back to orders
      </Link>
      {error ? (
        <div className="empty-state">
          <h2>{error}</h2>
          <Link href="/account" className="button">
            My account
          </Link>
        </div>
      ) : !order ? (
        <div className="skeleton" style={{ height: 400 }} />
      ) : (
        <>
          <div className="dashboard-heading">
            <div>
              <span className="eyebrow">EVERY STEP, RIGHT HERE</span>
              <h1>{order.number}</h1>
              <p>Placed {new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <OrderContent order={order} />
        </>
      )}
    </main>
  );
}
