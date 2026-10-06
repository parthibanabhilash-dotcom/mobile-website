'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Search, ArrowLeft, Save, RefreshCw } from 'lucide-react';
import { api, useStore } from './store-provider';
import { StatusBadge, type OrderView } from './account';
import { OrderContent } from './order-detail';
import { money } from '@/lib/catalog-shared';
import { orderStatuses, canTransition } from '@/lib/rules';
import { Modal } from './modal';
export function AdminOrders() {
  const [orders, setOrders] = useState<OrderView[]>([]),
    [q, setQ] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      setLoading(true);
      api<{ orders: OrderView[]; total: number }>(
        `admin/orders?q=${encodeURIComponent(q)}&status=${status}&page=${page}`,
      )
        .then((data) => {
          if (alive) {
            setOrders(data.orders);
            setTotal(data.total);
          }
        })
        .catch((e) => {
          if (alive) setError(e.message);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q, status, page]);
  useEffect(() => setPage(1), [q, status]);
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">EVERY ORDER. EVERY STEP.</span>
          <h1>Orders</h1>
          <p>Keep every customer’s upgrade moving.</p>
        </div>
        <span className="subtle-pill">{total} orders</span>
      </div>
      <div className="panel">
        <div className="admin-filters">
          <label className="input-with-icon">
            <Search size={17} />
            <input
              aria-label="Search orders"
              placeholder="Search by order number…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <select
            value={status}
            aria-label="Filter order status"
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {orderStatuses.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll('_', ' ')}
              </option>
            ))}
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
                  <th>Order number</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/orders/${o.id}`}>
                        <strong>{o.number}</strong>
                        {o.inventoryConflict && (
                          <small className="danger">Inventory review required</small>
                        )}
                      </Link>
                    </td>
                    <td>
                      <strong>{o.user?.name}</strong>
                      <small>{o.user?.email}</small>
                    </td>
                    <td>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>{money(o.total)}</td>
                    <td>
                      <StatusBadge status={o.paymentStatus} />
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td>
                      <Link href={`/admin/orders/${o.id}`} aria-label={`Open ${o.number}`}>
                        <ArrowUpRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!orders.length && <div className="chart-empty">No orders found.</div>}
          </div>
        )}
        <div className="table-footer">
          <span>{total} orders</span>
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
export function AdminOrderDetail({ id }: { id: string }) {
  const store = useStore();
  const [order, setOrder] = useState<OrderView | null>(null),
    [error, setError] = useState(''),
    [status, setStatus] = useState(''),
    [tracking, setTracking] = useState(''),
    [busy, setBusy] = useState(false),
    [refund, setRefund] = useState(false);
  async function load() {
    const o = await api<OrderView>(`orders/${id}`);
    setOrder(o);
    setTracking(o.tracking);
    setStatus('');
  }
  useEffect(() => {
    let active = true;
    api<OrderView>(`orders/${id}`)
      .then((o) => {
        if (!active) return;
        setOrder(o);
        setTracking(o.tracking);
        setStatus('');
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <>
      <Link className="text-link" href="/admin/orders">
        <ArrowLeft size={16} /> Back to orders
      </Link>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!order ? (
        <div className="skeleton" style={{ height: 400 }} />
      ) : (
        <>
          <div className="dashboard-heading">
            <div>
              <span className="eyebrow">ORDER DETAILS</span>
              <h1>{order.number}</h1>
              <p>Placed {new Date(order.createdAt).toLocaleString('en-IN')}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <div className="panel order-actions">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError('');
                try {
                  await api('admin/orders/status', { id, status, tracking }, 'PATCH');
                  await load();
                  store.notify('Order status updated');
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="field">
                Next status
                <select
                  aria-label="Next status"
                  required
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">Select next status</option>
                  {order.paymentStatus === 'PAID' &&
                    !order.inventoryConflict &&
                    !['CANCELLED', 'RETURNED'].includes(order.status) && (
                      <option value={order.status}>Update tracking only</option>
                    )}
                  {orderStatuses
                    .filter((s) => canTransition(order.status, s))
                    .map((s) => (
                      <option value={s} key={s}>
                        {s.replaceAll('_', ' ')}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field">
                Tracking information
                <input
                  maxLength={500}
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="Carrier and tracking number"
                />
              </label>
              <button className="button" disabled={busy || !status}>
                <Save size={16} />
                {busy ? 'Updating…' : 'Update order'}
              </button>
            </form>
            {['CANCELLED', 'RETURNED'].includes(order.status) &&
              order.paymentStatus === 'PAID' &&
              order.refundStatus !== 'REFUNDED' && (
                <button className="button button-outline" onClick={() => setRefund(true)}>
                  <RefreshCw size={16} /> Record manual refund
                </button>
              )}
          </div>
          <OrderContent order={order} />
          <Modal open={refund} onClose={() => setRefund(false)} title="Record a processed refund">
            <p>
              Process the refund in Razorpay first, then record its reference here. This form does
              not initiate a refund.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                setBusy(true);
                try {
                  await api('admin/orders/refund', {
                    id,
                    reference: form.get('reference'),
                    amount: Math.round(Number(form.get('amount')) * 100),
                  });
                  await load();
                  setRefund(false);
                  store.notify('Refund recorded');
                } catch (e) {
                  store.notify((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="field">
                Razorpay / bank refund reference
                <input required name="reference" minLength={3} maxLength={200} />
              </label>
              <label className="field">
                Amount (₹)
                <input
                  required
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={(order.total - order.refundAmount) / 100}
                  defaultValue={(order.total - order.refundAmount) / 100}
                />
              </label>
              <label className="checkbox-label">
                <input type="checkbox" required /> I confirm this refund has already been processed.
              </label>
              <button className="button full" disabled={busy}>
                Record refund
              </button>
            </form>
          </Modal>
        </>
      )}
    </>
  );
}
export function AdminSettings() {
  const store = useStore();
  const [fees, setFees] = useState<{
      freeShippingThreshold: number;
      shippingFee: number;
      lowStockThreshold: number;
    } | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api('admin/settings')
      .then(setFees)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">THE DETAILS THAT KEEP THINGS RUNNING</span>
          <h1>Store settings</h1>
          <p>Shipping and stock alerts, in one place.</p>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      {fees ? (
        <form
          className="panel settings-panel"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api('admin/settings', fees, 'PUT');
              store.notify('Store settings updated');
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Delivery & inventory</h2>
          <label className="field">
            Free shipping above (₹)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={fees.freeShippingThreshold / 100}
              onChange={(e) =>
                setFees({
                  ...fees,
                  freeShippingThreshold: Math.round(Number(e.target.value) * 100),
                })
              }
            />
          </label>
          <label className="field">
            Standard shipping fee (₹)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={fees.shippingFee / 100}
              onChange={(e) =>
                setFees({ ...fees, shippingFee: Math.round(Number(e.target.value) * 100) })
              }
            />
          </label>
          <label className="field">
            Low-stock alert threshold (units)
            <input
              required
              type="number"
              min="0"
              value={fees.lowStockThreshold}
              onChange={(e) => setFees({ ...fees, lowStockThreshold: Number(e.target.value) })}
            />
          </label>
          <p className="tax-note">INR · India-only delivery · Tax-inclusive catalog prices</p>
          <button className="button" disabled={busy}>
            <Save size={16} />
            {busy ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      ) : (
        <div className="skeleton" style={{ height: 300 }} />
      )}
    </>
  );
}
