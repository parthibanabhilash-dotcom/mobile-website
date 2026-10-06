import { db } from './db';
import { settings } from './commerce';
export async function dashboardMetrics() {
  const config = await settings();
  const start = new Date(Date.now() - 14 * 86400000);
  const [
    orders,
    orderCount,
    customers,
    products,
    pending,
    revenue,
    lowStock,
    trends,
    methods,
    topProducts,
  ] = await Promise.all([
    db.order.findMany({
      include: { items: true, payments: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.order.count(),
    db.user.count({ where: { role: 'CUSTOMER' } }),
    db.product.count(),
    db.order.count({
      where: {
        OR: [
          { status: 'PENDING', paymentStatus: 'PENDING' },
          { status: { in: ['CONFIRMED', 'PROCESSING', 'PACKED'] } },
        ],
      },
    }),
    db.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { total: true, refundAmount: true },
    }),
    db.$queryRaw<
      { count: bigint }[]
    >`SELECT count(*) AS count FROM \`Variant\` WHERE \`stock\` - \`reserved\` <= ${config.lowStockThreshold}`,
    db.$queryRaw<
      { day: string; revenue: bigint; orders: number; sales: bigint }[]
    >`SELECT DATE_FORMAT(DATE_ADD(o.\`createdAt\`, INTERVAL 330 MINUTE), '%Y-%m-%d') AS day, SUM(CASE WHEN o.\`paymentStatus\` = 'PAID' THEN o.\`total\` - o.\`refundAmount\` ELSE 0 END) AS revenue, COUNT(*) AS orders, SUM(CASE WHEN o.\`paymentStatus\` = 'PAID' THEN COALESCE((SELECT SUM(i.\`quantity\`) FROM \`OrderItem\` i WHERE i.\`orderId\` = o.\`id\`),0) ELSE 0 END) AS sales FROM \`Order\` o WHERE o.\`createdAt\` >= ${start} GROUP BY day ORDER BY day`,
    db.payment.groupBy({ by: ['method'], where: { status: 'CAPTURED' }, _count: true }),
    db.orderItem.groupBy({
      by: ['title'],
      where: { order: { paymentStatus: 'PAID' } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
  ]);
  return {
    orders,
    orderCount,
    customers,
    products,
    pending,
    revenue: (revenue._sum.total || 0) - (revenue._sum.refundAmount || 0),
    lowStock: Number(lowStock[0].count),
    trends: trends.map((t) => ({
      ...t,
      orders: Number(t.orders),
      revenue: Number(t.revenue) / 100,
      sales: Number(t.sales),
    })),
    paymentMethods: methods.map((m) => ({ name: m.method, value: m._count })),
    topProducts: topProducts.map((p) => ({ name: p.title, units: p._sum.quantity || 0 })),
  };
}
