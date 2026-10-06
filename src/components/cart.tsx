'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStoreReady, useStore, api } from './store-provider';
import { Modal } from './modal';
import { money } from '@/lib/catalog-shared';
import { shippingCost } from '@/lib/rules';
export function CartContents({ drawer = false }: { drawer?: boolean }) {
  const store = useStore();
  const ready = useStoreReady();
  const fees = store.settings;
  const items = store.cart.flatMap((c) => {
    const product = store.products.find((p) => p.variants.some((v) => v.id === c.variantId));
    const variant = product?.variants.find((v) => v.id === c.variantId);
    return product && variant ? [{ ...c, product, variant }] : [];
  });
  const subtotal = items.reduce((s, c) => s + c.quantity * c.variant.price, 0);
  const shipping = shippingCost(subtotal, fees.freeShippingThreshold, fees.shippingFee);
  if (!ready) return <div className="skeleton" style={{ height: 260 }} />;
  if (!items.length)
    return (
      <div className="empty-state">
        <ShoppingBag size={48} />
        <h2>Your next upgrade awaits.</h2>
        <p>Find something you’ll love and add it to your bag.</p>
        <Link className="button" href="/shop" onClick={() => store.setCartOpen(false)}>
          Explore the collection <ArrowRight size={17} />
        </Link>
      </div>
    );
  return (
    <div className={`cart-content ${drawer ? '' : 'cart-full'}`}>
      <div className="cart-items">
        <div className="shipping-note">
          <span>
            {subtotal > fees.freeShippingThreshold
              ? 'You’ve unlocked free delivery!'
              : `Add ${money(fees.freeShippingThreshold - subtotal + 100)} for free delivery`}
          </span>
          <div className="progress-track">
            <i
              style={{
                width: `${Math.min(100, (subtotal / (fees.freeShippingThreshold + 100)) * 100)}%`,
              }}
            />
          </div>
        </div>
        {items.map((c) => (
          <div className="cart-item" key={c.variantId}>
            <Link href={`/products/${c.product.slug}`} onClick={() => store.setCartOpen(false)}>
              <Image src={c.product.images[0]} alt={c.product.title} width={90} height={100} />
            </Link>
            <div className="cart-item-main">
              <Link href={`/products/${c.product.slug}`} onClick={() => store.setCartOpen(false)}>
                <strong>{c.product.title}</strong>
              </Link>
              <p>
                {c.variant.color}
                {c.variant.storage !== 'N/A' ? ` · ${c.variant.storage}` : ''}
              </p>
              <strong>{money(c.variant.price)}</strong>
              <div className="quantity-control">
                <button
                  aria-label={`Decrease quantity of ${c.product.title}`}
                  onClick={() => store.quantity(c.variantId, c.quantity - 1)}
                >
                  <Minus size={14} />
                </button>
                <span aria-live="polite">{c.quantity}</span>
                <button
                  aria-label={`Increase quantity of ${c.product.title}`}
                  onClick={() => store.quantity(c.variantId, c.quantity + 1)}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <button
              className="icon-button"
              aria-label={`Remove ${c.product.title}`}
              onClick={() => store.quantity(c.variantId, 0)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <div className="order-summary">
        <h3>Order summary</h3>
        <div>
          <span>Subtotal</span>
          <strong>{money(subtotal)}</strong>
        </div>
        <div>
          <span>Delivery</span>
          <strong>{shipping ? money(shipping) : 'Free'}</strong>
        </div>
        <div>
          <span>Taxes</span>
          <span>Included</span>
        </div>
        <div className="summary-total">
          <strong>Total</strong>
          <strong>{money(subtotal + shipping)}</strong>
        </div>
        <Link href="/checkout" className="button full" onClick={() => store.setCartOpen(false)}>
          Proceed to checkout <ArrowRight size={18} />
        </Link>
        <p className="secure-note">
          <ShieldCheck size={14} /> Secure checkout, powered by Razorpay
        </p>
      </div>
    </div>
  );
}
export function CartDrawer() {
  const { cartOpen, setCartOpen, cart } = useStore();
  return (
    <Modal
      open={cartOpen}
      onClose={() => setCartOpen(false)}
      title={`Your bag (${cart.reduce((s, c) => s + c.quantity, 0)})`}
      drawer
    >
      <CartContents drawer />
    </Modal>
  );
}
