export const orderStatuses = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const;
export function shippingCost(subtotal: number, threshold = 500000, fee = 9900) {
  return subtotal > threshold ? 0 : fee;
}
export function canTransition(from: string, to: string): boolean {
  const allowed: Record<string, string[]> = {
    PENDING: ['CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['PACKED', 'CANCELLED'],
    PACKED: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['OUT_FOR_DELIVERY'],
    OUT_FOR_DELIVERY: ['DELIVERED'],
    DELIVERED: ['RETURNED'],
    CANCELLED: [],
    RETURNED: [],
  };
  return allowed[from]?.includes(to) ?? false;
}
export function paymentMatches(
  payment: { order_id: string; amount: number; currency: string; status: string },
  order: { razorpayOrderId: string | null; total: number; currency: string },
) {
  return (
    payment.order_id === order.razorpayOrderId &&
    payment.amount === order.total &&
    payment.currency === order.currency &&
    payment.status === 'captured'
  );
}
export function validQuantity(q: number) {
  return Number.isInteger(q) && q >= 1 && q <= 10;
}
