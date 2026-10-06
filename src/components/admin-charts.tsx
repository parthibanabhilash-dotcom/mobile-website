'use client';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { money } from '@/lib/catalog-shared';
import type { OrderView } from './account';
const palette = ['#315bdf', '#93abf3', '#c3cff8', '#e0e7fb'];
export default function AdminCharts({
  orders,
  trends = [],
  paymentMethods = [],
  topProducts = [],
}: {
  orders: OrderView[];
  trends?: { day: string; revenue: number; orders: number; sales: number }[];
  paymentMethods?: { name: string; value: number }[];
  topProducts?: { name: string; units: number }[];
}) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(Date.now() + 19800000 - (13 - i) * 86400000);
    const key = date.toISOString().slice(0, 10);
    const row = trends.find((t) => t.day === key);
    return {
      day: new Date(key + 'T12:00:00Z').toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      }),
      revenue: row?.revenue || 0,
      orders: row?.orders || 0,
      sales: row?.sales || 0,
    };
  });
  const methods = paymentMethods,
    top = topProducts;
  return (
    <div className="admin-charts">
      <div className="panel chart-wide">
        <div className="panel-heading">
          <div>
            <h2>Revenue overview</h2>
            <p>Your store’s performance over the last 14 days</p>
          </div>
          <span className="subtle-pill">Last 14 days</span>
        </div>
        <div
          className="chart-container"
          role="img"
          aria-label={`14-day revenue trend. Total ${money(days.reduce((s, d) => s + d.revenue * 100, 0))}`}
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={days} margin={{ left: 0, right: 15, top: 15, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#315bdf" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#315bdf" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#eef0f4" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#89909e' }}
                interval={2}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#89909e' }}
                tickFormatter={(v) => `₹${Number(v) / 1000}k`}
              />
              <Tooltip />
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="revenue"
                stroke="#315bdf"
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="panel">
        <h2>Payment methods</h2>
        {methods.length ? (
          <>
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  isAnimationActive={false}
                  data={methods}
                  dataKey="value"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={4}
                >
                  {methods.map((m, i) => (
                    <Cell key={m.name} fill={palette[i % palette.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {methods.map((m, i) => (
                <span key={m.name}>
                  <i style={{ background: palette[i % palette.length] }} />
                  {m.name}
                  <b>{m.value}</b>
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="chart-empty">
            Payment distribution appears after your first verified payment.
          </div>
        )}
      </div>
      <div className="panel">
        <h2>Orders & sales trend</h2>
        <p>Orders placed and units purchased</p>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={days}>
            <CartesianGrid vertical={false} stroke="#eef0f4" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 9 }}
              interval={3}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip />
            <Bar isAnimationActive={false} dataKey="orders" fill="#315bdf" radius={[3, 3, 0, 0]} />
            <Bar isAnimationActive={false} dataKey="sales" fill="#b7c6f7" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="panel">
        <h2>Top-selling products</h2>
        <p>Verified purchases, ranked by units</p>
        {top.length ? (
          <div className="top-products">
            {top.map((p, i) => (
              <div key={p.name}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <strong>{p.name}</strong>
                <b>{p.units} sold</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="chart-empty">Your best sellers will appear here.</div>
        )}
      </div>
    </div>
  );
}
