import { describe, it, expect } from 'vitest';
import { shippingCost, canTransition, paymentMatches, validQuantity } from '../src/lib/rules';
import { addressSchema, productSchema, cartSchema } from '../src/lib/validation';
import { demoProducts } from '../src/lib/catalog-data';
import { money } from '../src/lib/catalog-shared';
describe('commerce boundaries', () => {
  it('displays fractional rupees without rounding away paid paise', () => {
    expect(money(199999)).toBe('₹1,999.99');
    expect(money(9900)).toBe('₹99');
    expect(money(1)).toBe('₹0.01');
  });
  it('charges shipping at the threshold and waives it above the threshold', () => {
    expect(shippingCost(499900)).toBe(9900);
    expect(shippingCost(500000)).toBe(9900);
    expect(shippingCost(500100)).toBe(0);
    expect(shippingCost(300000, 200000, 19900)).toBe(0);
  });
  it('permits sequential fulfilment, cancellation before shipping, and returns after delivery', () => {
    expect(canTransition('CONFIRMED', 'PROCESSING')).toBe(true);
    expect(canTransition('PENDING', 'DELIVERED')).toBe(false);
    expect(canTransition('PACKED', 'CANCELLED')).toBe(true);
    expect(canTransition('SHIPPED', 'CANCELLED')).toBe(false);
    expect(canTransition('DELIVERED', 'RETURNED')).toBe(true);
    expect(canTransition('RETURNED', 'CONFIRMED')).toBe(false);
  });
  it('requires captured status and exact order, amount, and currency', () => {
    const order = { razorpayOrderId: 'order_test', total: 100000, currency: 'INR' };
    const payment = { order_id: 'order_test', amount: 100000, currency: 'INR', status: 'captured' };
    expect(paymentMatches(payment, order)).toBe(true);
    for (const change of [
      { status: 'authorized' },
      { order_id: 'order_other' },
      { amount: 99999 },
      { currency: 'USD' },
    ])
      expect(paymentMatches({ ...payment, ...change }, order)).toBe(false);
  });
  it('rejects malformed quantities and Indian address values', () => {
    for (const n of [0, -1, 1.5, 11, NaN]) expect(validQuantity(n)).toBe(false);
    expect(validQuantity(10)).toBe(true);
    expect(cartSchema.safeParse({ items: [{ variantId: 'v', quantity: 0 }] }).success).toBe(false);
    const valid = {
      name: 'Aarav Sharma',
      phone: '9876543210',
      line1: '123 Main Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    };
    expect(addressSchema.safeParse(valid).success).toBe(true);
    expect(addressSchema.safeParse({ ...valid, phone: '123' }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, pincode: '000000' }).success).toBe(false);
  });
  it('rejects inverted prices and requires product images', () => {
    const p = demoProducts[0];
    expect(productSchema.safeParse({ ...p, seoTitle: '', seoDescription: '' }).success).toBe(true);
    expect(productSchema.safeParse({ ...p, images: [] }).success).toBe(false);
    expect(
      productSchema.safeParse({ ...p, variants: [{ ...p.variants[0], originalPrice: 1 }] }).success,
    ).toBe(false);
  });
});
