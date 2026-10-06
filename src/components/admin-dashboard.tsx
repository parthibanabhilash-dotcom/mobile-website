'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  IndianRupee,
  ShoppingBag,
  Users,
  Package,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import { api } from './store-provider';
import { money } from '@/lib/catalog-shared';
import { StatusBadge, type OrderView } from './account';
const Charts = dynamic(() => import('./admin-charts'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 350 }} />,
});
export function AdminDashboard() {
  const [data, setData] = useState<{
      orders: OrderView[];
      customers: number;
      products: number;
      lowStock: number;
      pending: number;
      revenue: number;
      orderCount: number;
      trends: { day: string; revenue: number; orders: number; sales: number }[];
      paymentMethods: { name: string; value: number }[];
      topProducts: { name: string; units: number }[];
    } | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    api('admin/dashboard')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  const stats = data
    ? [
        {
          icon: IndianRupee,
          label: 'Total revenue',
          value: money(data.revenue),
          note: 'Verified payments, less recorded refunds',
        },
        { icon: ShoppingBag, label: 'Orders', value: data.orderCount, note: 'All customer orders' },
        {
          icon: Users,
          label: 'Customers',
          value: data.customers,
          note: 'Registered customer accounts',
        },
        { icon: Package, label: 'Products', value: data.products, note: 'Across your catalog' },
        {
          icon: AlertTriangle,
          label: 'Low stock',
          value: data.lowStock,
          note: 'Variants that need attention',
        },
        {
          icon: Clock,
          label: 'Pending fulfilment',
          value: data.pending,
          note: 'Orders awaiting the next step',
        },
      ]
    : [];
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">A CLEAR VIEW OF YOUR BUSINESS</span>
          <h1>Store overview</h1>
          <p>Good to see you. Here’s what’s happening at Mobile Shop.</p>
        </div>
        <Link className="button" href="/admin/products/new">
          <Plus size={16} /> Add product
        </Link>
      </div>
      {error ? (
        <p className="form-error">{error}</p>
      ) : !data ? (
        <div className="skeleton" style={{ height: 400 }} />
      ) : (
        <>
          <div className="admin-stats">
            {stats.map(({ icon: Icon, label, value, note }) => (
              <div className="admin-stat" key={label}>
                <span>
                  <Icon size={20} />
                </span>
                <p>{label}</p>
                <strong>{value}</strong>
                <small>{note}</small>
              </div>
            ))}
          </div>
          <Charts
            orders={data.orders}
            trends={data.trends}
            paymentMethods={data.paymentMethods}
            topProducts={data.topProducts}
          />
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>Recent orders</h2>
                <p>Your latest customer purchases</p>
              </div>
              <Link className="text-link" href="/admin/orders">
                View all orders <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.orders.slice(0, 6).map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/admin/orders/${o.id}`}>
                          <strong>{o.number}</strong>
                        </Link>
                      </td>
                      <td>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>{o.items.length}</td>
                      <td>
                        <strong>{money(o.total)}</strong>
                      </td>
                      <td>
                        <StatusBadge status={o.paymentStatus} />
                      </td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                      <td>
                        <Link href={`/admin/orders/${o.id}`} aria-label={`View ${o.number}`}>
                          <ArrowUpRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.orders.length && (
                <div className="chart-empty">Orders will appear when customers check out.</div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
