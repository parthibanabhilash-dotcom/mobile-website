import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/components/store-provider';
import { SiteFrame } from '@/components/site-frame';
import { Footer } from '@/components/footer';
export const metadata: Metadata = {
  title: { default: 'Mobile Shop — Your next upgrade starts here', template: '%s | Mobile Shop' },
  description:
    'Discover smartphones, audio, wearables, and everyday essentials. Genuine products, thoughtful service, and secure checkout.',
};
export const dynamic = 'force-dynamic';
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <StoreProvider products={[]}>
          <SiteFrame footer={<Footer />}>{children}</SiteFrame>
        </StoreProvider>
      </body>
    </html>
  );
}
