'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
  Search,
  Bell,
  LogOut,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react';
import { useStoreReady, useStore } from './store-provider';
import { AuthForm } from './account';
import { Logo } from './header';
export function AdminShell({ children }: { children: React.ReactNode }) {
  const ready = useStoreReady();
  const store = useStore(),
    path = usePathname();
  const [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false);
  const links = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
    { href: '/admin/settings', label: 'Store settings', icon: Settings },
  ];
  if (!ready)
    return (
      <main className="container page-space">
        <div className="skeleton" style={{ height: 400 }} />
      </main>
    );
  if (!store.user)
    return (
      <main className="admin-login">
        <Logo />
        <Suspense>
          <AuthForm />
        </Suspense>
        <p>
          Administrator sign-in · Create an admin using <code>npm run admin:create</code>.
        </p>
        <Link className="text-link" href="/">
          Back to storefront <ArrowUpRight size={16} />
        </Link>
      </main>
    );
  if (store.user.role !== 'ADMIN')
    return (
      <main className="empty-state">
        <ShieldCheck size={40} />
        <h1>Administrator access required.</h1>
        <p>Your account has customer access.</p>
        <Link href="/account" className="button">
          My account
        </Link>
      </main>
    );
  return (
    <div className={`admin-shell ${collapsed ? 'collapsed' : ''}`}>
      <aside className={`admin-sidebar ${mobile ? 'mobile-open' : ''}`}>
        <div className="admin-logo">
          <Logo />
          <button
            className="icon-button"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        </div>
        <span className="admin-workspace-label">STORE WORKSPACE</span>
        <nav>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              title={l.label}
              onClick={() => setMobile(false)}
              className={
                (l.href === '/admin' ? path === l.href : path.startsWith(l.href)) ? 'active' : ''
              }
            >
              <l.icon size={20} />
              <span>{l.label}</span>
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link href="/" title="View storefront">
            <ArrowUpRight size={19} />
            <span>View storefront</span>
          </Link>
          <button onClick={() => store.logout()}>
            <LogOut size={19} />
            <span>Sign out</span>
          </button>
          <div className="admin-user">
            <span>{store.user.name[0]}</span>
            <div>
              <strong>{store.user.name}</strong>
              <small>Administrator</small>
            </div>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="admin-mobile-overlay"
          aria-label="Close menu"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="admin-body">
        <header className="admin-topbar">
          <button
            className="icon-button admin-collapse"
            aria-label="Toggle sidebar"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <button
            className="icon-button admin-mobile-toggle"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu size={21} />
          </button>
          <span className="admin-breadcrumb">
            Workspace <span>/</span>{' '}
            {links.find((l) => (l.href === '/admin' ? path === l.href : path.startsWith(l.href)))
              ?.label || 'Overview'}
          </span>
          <Link className="admin-quick-search" href="/admin/products">
            <Search size={16} /> Search products <kbd>/</kbd>
          </Link>
          <Link
            href="/admin/orders?status=PENDING"
            className="icon-button"
            aria-label="Pending orders"
          >
            <Bell size={19} />
          </Link>
          <Link href="/account" className="admin-avatar" aria-label="Account">
            {store.user.name[0]}
          </Link>
        </header>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
