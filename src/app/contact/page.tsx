import Link from 'next/link';
import { Mail, MapPin, Clock, ArrowRight } from 'lucide-react';
export const metadata = {
  title: 'Contact us',
  description: 'Contact Mobile Shop for help with products, orders and warranty.',
};
export default function ContactPage() {
  return (
    <main className="container page-space contact-page">
      <span className="eyebrow">WE’RE HERE TO HELP</span>
      <h1>Let’s talk tech.</h1>
      <p className="contact-intro">
        Questions about a phone, an order or a warranty? Get in touch with Mobile Shop.
      </p>
      <div className="contact-grid">
        <section className="panel">
          <Mail size={28} />
          <h2>Email us</h2>
          <p>
            Include your order number when asking about a purchase. Never send passwords or payment
            details.
          </p>
          <a className="text-link" href="mailto:parthibanabhilash@gmail.com">
            parthibanabhilash@gmail.com <ArrowRight size={16} />
          </a>
        </section>
        <section className="panel">
          <MapPin size={28} />
          <h2>Store address</h2>
          <address>
            Mobile Shop
            <br />
            24, Anna Salai
            <br />
            Chennai, Tamil Nadu 600002
            <br />
            India
          </address>
          <small className="contact-sample">
            Sample address for the preview. Confirm our actual location before visiting.
          </small>
        </section>
        <section className="panel">
          <Clock size={28} />
          <h2>Opening hours</h2>
          <p>
            Monday–Saturday
            <br />
            10 AM–7 PM IST
          </p>
          <p>Sunday: closed</p>
          <small>Provisional hours; final store details will be updated.</small>
        </section>
      </div>
      <section className="info-banner">
        <h2>Need a quick answer?</h2>
        <p>Find shipping and warranty information, or check the latest status of your order.</p>
        <div className="contact-actions">
          <Link className="button" href="/help">
            Help & support
          </Link>
          <Link className="button button-outline" href="/account?tab=orders">
            Track your order
          </Link>
        </div>
      </section>
    </main>
  );
}
