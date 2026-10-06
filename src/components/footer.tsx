import Link from 'next/link';
import { ArrowUpRight, Instagram, Youtube, ShieldCheck, Mail } from 'lucide-react';
import { Logo } from './header';
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>
            Your favorite tech.
            <br />A better way to shop.
          </p>
          <div className="footer-social">
            <a href="mailto:support@mobile-shop.local" aria-label="Email support">
              <Mail size={17} />
            </a>
            <Link href="/about" aria-label="About our store">
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
        <div>
          <h2>Explore</h2>
          <Link href="/shop?category=Smartphones">Smartphones</Link>
          <Link href="/shop?collection=accessories">Accessories</Link>
          <Link href="/shop?collection=new">New arrivals</Link>
          <Link href="/shop?offers=true">Special offers</Link>
          <Link href="/compare">Compare products</Link>
        </div>
        <div>
          <h2>Here to help</h2>
          <Link href="/help">Help & support</Link>
          <Link href="/help#shipping">Shipping & delivery</Link>
          <Link href="/help#returns">Returns & warranty</Link>
          <Link href="/account?tab=orders">Track your order</Link>
          <Link href="/help#contact">Contact us</Link>
        </div>
        <div>
          <h2>Mobile Shop</h2>
          <Link href="/about">Our story</Link>
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms & conditions</Link>
          <Link href="/account">My account</Link>
          <Link href="/admin">Admin portal</Link>
        </div>
        <div className="footer-assurance">
          <ShieldCheck size={27} />
          <h2>A little peace of mind.</h2>
          <p>
            Genuine products.
            <br />
            Secure payments.
            <br />
            Thoughtful support.
          </p>
          <span>
            Razorpay <b>UPI</b> <b>VISA</b>
          </span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Mobile Shop. All rights reserved.</span>
        <span>Provisional brand · Sample catalog & promotions</span>
        <span>
          Made for your next upgrade. <ArrowUpRight size={13} />
        </span>
      </div>
    </footer>
  );
}
