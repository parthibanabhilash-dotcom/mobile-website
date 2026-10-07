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
            <a href="mailto:parthibanabhilash@gmail.com" aria-label="Email support">
              <Mail size={17} />
            </a>
            <Link prefetch={false} href="/about" aria-label="About our store">
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
        <div>
          <h2>Explore</h2>
          <Link prefetch={false} href="/shop?category=Smartphones">
            Smartphones
          </Link>
          <Link prefetch={false} href="/shop?collection=accessories">
            Accessories
          </Link>
          <Link prefetch={false} href="/shop?collection=new">
            New arrivals
          </Link>
          <Link prefetch={false} href="/shop?offers=true">
            Special offers
          </Link>
        </div>
        <div>
          <h2>Here to help</h2>
          <Link prefetch={false} href="/help">
            Help & support
          </Link>
          <Link prefetch={false} href="/help#shipping">
            Shipping & delivery
          </Link>
          <Link prefetch={false} href="/help#returns">
            Returns & warranty
          </Link>
          <Link prefetch={false} href="/account?tab=orders">
            Track your order
          </Link>
          <Link prefetch={false} href="/contact">
            Contact us
          </Link>
        </div>
        <div>
          <h2>Contact</h2>
          <p>Sample address: 24, Anna Salai, Chennai, Tamil Nadu 600002.</p>
          <p>Mon–Sat, 10 AM–7 PM IST</p>
          <a href="mailto:parthibanabhilash@gmail.com">parthibanabhilash@gmail.com</a>
          <Link prefetch={false} href="/contact">
            Contact details
          </Link>
        </div>
        <div>
          <h2>Mobile Shop</h2>
          <Link prefetch={false} href="/about">
            Our story
          </Link>
          <Link prefetch={false} href="/privacy">
            Privacy policy
          </Link>
          <Link prefetch={false} href="/terms">
            Terms & conditions
          </Link>
          <Link prefetch={false} href="/account">
            My account
          </Link>
          <Link prefetch={false} href="/admin">
            Admin portal
          </Link>
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
