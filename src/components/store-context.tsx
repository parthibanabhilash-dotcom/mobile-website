'use client';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  startTransition,
  type ReactNode,
} from 'react';
import type { ShopProduct } from '@/lib/catalog-shared';
export type CartEntry = { variantId: string; quantity: number };
export type Customer = { id: string; name: string; email: string; role: string; verified: boolean };
type StoreSettings = {
  freeShippingThreshold: number;
  shippingFee: number;
  lowStockThreshold: number;
};
type Store = {
  products: ShopProduct[];
  registerProducts: (products: ShopProduct[]) => void;
  settings: StoreSettings;
  cart: CartEntry[];
  wishlist: string[];
  user: Customer | null;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  add: (variantId: string, quantity?: number) => boolean;
  quantity: (id: string, q: number) => void;
  wish: (id: string) => void;
  notify: (text: string) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  clearCart: () => void;
};
const Context = createContext<Store | null>(null);
const ShoppingContext = createContext<Omit<Store, 'products'> | null>(null);
export function useShoppingActions() {
  const store = useContext(ShoppingContext);
  if (!store) throw new Error('Shopping provider is missing');
  return store;
}
const ReadyContext = createContext(false);
export const useStoreReady = () => useContext(ReadyContext);
export async function api<T = any>(path: string, body?: unknown, method?: string): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: method || (body ? 'POST' : 'GET'),
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
export function StoreProvider({
  products: initialProducts,
  children,
}: {
  products: ShopProduct[];
  children: ReactNode;
}) {
  const [products, setProducts] = useState(initialProducts),
    [settings, setSettings] = useState<StoreSettings>({
      freeShippingThreshold: 500000,
      shippingFee: 9900,
      lowStockThreshold: 5,
    });
  const [cart, setCart] = useState<CartEntry[]>([]),
    [wishlist, setWishlist] = useState<string[]>([]),
    [user, setUser] = useState<Customer | null>(null),
    [ready, setReady] = useState(false),
    [cartOpen, setCartOpen] = useState(false),
    [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    productsRef = useRef(initialProducts),
    queue = useRef(Promise.resolve()),
    cartRef = useRef(cart),
    wishRef = useRef(wishlist);
  cartRef.current = cart;
  wishRef.current = wishlist;
  const notify = useCallback((text: string) => {
    setToast(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 4000);
  }, []);
  const registerProducts = useCallback((incoming: ShopProduct[]) => {
    const map = new Map(productsRef.current.map((p) => [p.id, p]));
    let changed = false;
    for (const p of incoming)
      if (map.get(p.id) !== p && JSON.stringify(map.get(p.id)) !== JSON.stringify(p)) {
        map.set(p.id, p);
        changed = true;
      }
    if (changed) {
      const next = [...map.values()];
      productsRef.current = next;
      startTransition(() => setProducts(next));
    }
  }, []);
  const refreshUser = useCallback(async () => {
    const { user: next } = await api<{ user: Customer | null }>('auth/me');
    if (!next) {
      setUser(null);
      return;
    }
    const data = await api('account');
    registerProducts([...data.wishlist, ...(data.cartProducts || [])]);
    const owner = localStorage.getItem('mobile-cart-owner');
    let merged: CartEntry[] = data.cart.map((c: CartEntry) => ({
      variantId: c.variantId,
      quantity: c.quantity,
    }));
    if (owner !== next.id) {
      for (const item of cartRef.current) {
        const existing = merged.find((c) => c.variantId === item.variantId);
        if (existing) existing.quantity = Math.min(10, existing.quantity + item.quantity);
        else merged.push(item);
      }
      try {
        await api('cart', { items: merged }, 'PUT');
      } catch (e) {
        merged = data.cart.map((c: CartEntry) => ({
          variantId: c.variantId,
          quantity: c.quantity,
        }));
        notify(`Signed in. ${(e as Error).message}`);
      }
    }
    setCart(merged);
    cartRef.current = merged;
    const ids: string[] = data.wishlist.map((p: ShopProduct) => p.id);
    if (owner !== next.id)
      for (const id of wishRef.current.filter((id) => !ids.includes(id))) {
        try {
          await api('wishlist', { productId: id, saved: true }, 'PUT');
          ids.push(id);
        } catch {}
      }
    setWishlist(ids);
    wishRef.current = ids;
    localStorage.setItem('mobile-cart-owner', next.id);
    setUser(next);
  }, [registerProducts, notify]);
  useEffect(() => {
    registerProducts(initialProducts);
  }, [initialProducts, registerProducts]);
  useEffect(() => {
    let alive = true;
    async function init() {
      let saved: { cart?: CartEntry[]; wishlist?: string[] } = {};
      try {
        saved = JSON.parse(localStorage.getItem('mobile-shop') || '{}');
      } catch {}
      const valid = (Array.isArray(saved.cart) ? saved.cart : [])
          .filter(
            (c) =>
              typeof c.variantId === 'string' &&
              Number.isInteger(c.quantity) &&
              c.quantity > 0 &&
              c.quantity <= 10,
          )
          .slice(0, 50),
        wishes = (Array.isArray(saved.wishlist) ? saved.wishlist : [])
          .filter((id) => typeof id === 'string')
          .slice(0, 200);
      if (valid.length) setCart(valid);
      cartRef.current = valid;
      if (wishes.length) setWishlist(wishes);
      wishRef.current = wishes;
      setReady(true);
      const loadSavedProducts = async () => {
        if (valid.length || wishes.length) {
          const lookup = await api<{ products: ShopProduct[] }>(
            `catalog/lookup?variants=${encodeURIComponent(valid.map((v) => v.variantId).join(','))}&products=${encodeURIComponent(wishes.join(','))}`,
          );
          if (alive) registerProducts(lookup.products);
        }
      };
      const loadSettings = async () => {
        const config = await api<StoreSettings>('settings');
        if (alive)
          setSettings((old) =>
            Object.keys(config).every(
              (key) => config[key as keyof StoreSettings] === old[key as keyof StoreSettings],
            )
              ? old
              : config,
          );
      };
      await Promise.allSettled([loadSavedProducts(), refreshUser(), loadSettings()]);
      if (alive) setReady(true);
    }
    init();
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refreshUser, registerProducts]);
  useEffect(() => {
    if (ready) localStorage.setItem('mobile-shop', JSON.stringify({ cart, wishlist }));
  }, [cart, wishlist, ready]);
  function persist(next: CartEntry[]) {
    setCart(next);
    cartRef.current = next;
    if (user)
      queue.current = queue.current.then(async () => {
        try {
          await api('cart', { items: next }, 'PUT');
        } catch (e) {
          notify((e as Error).message);
          try {
            const server = await api<CartEntry[]>('cart');
            const authoritative = server.map((c) => ({
              variantId: c.variantId,
              quantity: c.quantity,
            }));
            setCart(authoritative);
            cartRef.current = authoritative;
          } catch {}
        }
      });
  }
  function add(id: string, q = 1) {
    const product = productsRef.current.find((p) => p.variants.some((v) => v.id === id)),
      variant = product?.variants.find((v) => v.id === id),
      old = cartRef.current.find((c) => c.variantId === id)?.quantity || 0;
    if (
      !product ||
      !variant ||
      !Number.isInteger(q) ||
      q < 1 ||
      old + q > Math.min(10, variant.stock - variant.reserved)
    ) {
      notify('This quantity is unavailable.');
      return false;
    }
    persist(
      cartRef.current.some((c) => c.variantId === id)
        ? cartRef.current.map((c) => (c.variantId === id ? { ...c, quantity: c.quantity + q } : c))
        : [...cartRef.current, { variantId: id, quantity: q }],
    );
    notify(`${product.title} added to your bag`);
    return true;
  }
  function quantity(id: string, q: number) {
    const variant = productsRef.current.flatMap((p) => p.variants).find((v) => v.id === id);
    if (
      q > 0 &&
      (!variant || !Number.isInteger(q) || q > Math.min(10, variant.stock - variant.reserved))
    ) {
      notify('This quantity is unavailable.');
      return;
    }
    persist(
      q <= 0
        ? cartRef.current.filter((c) => c.variantId !== id)
        : cartRef.current.map((c) => (c.variantId === id ? { ...c, quantity: q } : c)),
    );
  }
  function wish(id: string) {
    const saved = !wishRef.current.includes(id);
    if (saved && wishRef.current.length >= 200) {
      notify('Your wishlist can hold up to 200 favorites.');
      return;
    }
    const next = saved ? [...wishRef.current, id] : wishRef.current.filter((p) => p !== id);
    setWishlist(next);
    wishRef.current = next;
    if (user)
      queue.current = queue.current.then(async () => {
        try {
          await api('wishlist', { productId: id, saved }, 'PUT');
        } catch (e) {
          notify((e as Error).message);
          setWishlist((old) => (saved ? old.filter((p) => p !== id) : [...old, id]));
        }
      });
    notify(saved ? 'Saved to your wishlist' : 'Removed from your wishlist');
  }
  async function logout() {
    await queue.current;
    await api('auth/logout', {});
    setUser(null);
    setCart([]);
    cartRef.current = [];
    setWishlist([]);
    wishRef.current = [];
    localStorage.removeItem('mobile-cart-owner');
    sessionStorage.removeItem('mobile-checkout-key');
    notify('You’ve signed out');
  }
  const shopping = useMemo(
    () => ({
      registerProducts,
      settings,
      cart,
      wishlist,
      user,
      cartOpen,
      setCartOpen,
      add,
      quantity,
      wish,
      notify,
      refreshUser,
      logout,
      clearCart: () => {
        setCart([]);
        cartRef.current = [];
      },
    }),
    [registerProducts, settings, cart, wishlist, user, cartOpen, notify, refreshUser],
  );
  const value = useMemo(() => ({ ...shopping, products }), [shopping, products]);
  return (
    <ReadyContext.Provider value={ready}>
      <ShoppingContext.Provider value={shopping}>
        <Context.Provider value={value}>
          {children}
          <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
            <span className="toast-check">✓</span>
            {toast}
          </div>
        </Context.Provider>
      </ShoppingContext.Provider>
    </ReadyContext.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error('StoreProvider missing');
  return store;
}
