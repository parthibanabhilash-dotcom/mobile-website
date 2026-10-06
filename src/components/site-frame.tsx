'use client';
import { usePathname } from 'next/navigation';
import { Header } from './header';
import { Suspense } from 'react';
export function SiteFrame({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const admin = usePathname().startsWith('/admin');
  return (
    <>
      {!admin && (
        <Suspense fallback={null}>
          <Header />
        </Suspense>
      )}
      <div id="main-content">{children}</div>
      {!admin && footer}
    </>
  );
}
