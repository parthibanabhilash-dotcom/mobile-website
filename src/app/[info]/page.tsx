import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ArrowUpRight } from 'lucide-react';
const titles: Record<string, string> = {
  about: 'Good tech. Thoughtfully brought together.',
  help: 'A little help, right when you need it.',
  privacy: 'Your privacy matters.',
  terms: 'Clear terms. Confident choices.',
};
export async function generateMetadata({ params }: { params: Promise<{ info: string }> }) {
  const { info } = await params;
  return { title: titles[info] || 'Page' };
}
export default async function Page({ params }: { params: Promise<{ info: string }> }) {
  const { info } = await params;
  if (!titles[info]) notFound();
  return (
    <main className="container page-space">
      <div className="info-page">
        <span className="eyebrow">MOBILE SHOP · HERE FOR YOUR NEXT UPGRADE</span>
        <h1>{titles[info]}</h1>
        {info === 'about' ? (
          <>
            <p>
              Mobile Shop brings smartphones and everyday electronics into a clean, considered
              shopping experience. Find a favorite, explore your options, and follow your order from
              checkout to delivery.
            </p>
            <div className="info-banner">
              <h2>Technology should feel effortless.</h2>
              <p>
                Our focus is simple: authentic products, clear pricing, secure payments, and
                thoughtful support.
              </p>
            </div>
            <h2>A store taking shape.</h2>
            <p>
              This application uses a provisional brand and demonstration catalog. Product
              specifications, images, reviews, and promotional offers must be replaced with verified
              store content before launch.
            </p>
            <Link className="button" href="/shop">
              Explore the collection <ArrowUpRight size={16} />
            </Link>
          </>
        ) : info === 'help' ? (
          <>
            <p>Find answers to common questions, or follow your order in your account.</p>
            {[
              {
                id: 'shipping',
                q: 'Where do you deliver?',
                a: 'Delivery is currently available within India. Shipping is ₹99, with complimentary delivery on orders above ₹5,000 by default. The current shipping charge is shown at checkout. Tracking is entered by our fulfilment team once your order ships.',
              },
              {
                id: 'payments',
                q: 'How are payments confirmed?',
                a: 'Checkout is powered by Razorpay. An order is marked paid only after the server verifies a matching captured payment. If verification takes longer, your order remains available in your account.',
              },
              {
                id: 'returns',
                q: 'How do returns and warranty work?',
                a: 'Manufacturer warranty details appear on each product page. Contact support to request cancellation or a return. Requests are reviewed and processed manually. Approved refunds are processed separately and then recorded in your order history.',
              },
              {
                id: 'account',
                q: 'How do I access my account?',
                a: 'Register with your email and a password of at least 10 characters. Verify your email using the link we send, then sign in. You can request a password reset on the sign-in page.',
              },
              {
                id: 'contact',
                q: 'How do I contact support?',
                a: 'Email parthibanabhilash@gmail.com or visit our Contact us page for opening hours and provisional store details.',
              },
            ].map((item) => (
              <details key={item.id} id={item.id}>
                <summary>
                  {item.q}
                  <ChevronDown size={17} />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
            <div className="info-banner">
              <h2>Following an order?</h2>
              <Link className="text-link" href="/account?tab=orders">
                See your order’s journey <ArrowUpRight size={16} />
              </Link>
            </div>
          </>
        ) : info === 'privacy' ? (
          <>
            <p>
              Draft policy for the demonstration store. The operator must review and publish a
              complete policy before launch.
            </p>
            <h2>Information used by this application</h2>
            <p>
              Account names and email addresses, password hashes, saved addresses, order records,
              reviews, wishlist items, and payment references are stored to provide shopping and
              account services. Card details are handled by Razorpay rather than stored by this
              application.
            </p>
            <h2>Cookies and local storage</h2>
            <p>
              A secure session cookie supports sign-in. Local storage remembers the shopping cart,
              wishlist, and product comparison choices. Newsletter subscriptions require consent.
            </p>
            <h2>Contact and your requests</h2>
            <p>
              Before launch, the operator must provide a real privacy contact, retention periods,
              deletion procedures, legal basis, and details of applicable service providers.
            </p>
          </>
        ) : (
          <>
            <p>
              Draft terms for the demonstration store. Final business policies and legal details
              must be reviewed before live selling.
            </p>
            <h2>Shopping and prices</h2>
            <p>
              Prices are displayed in Indian rupees and include tax. Availability and totals are
              rechecked at checkout. Demonstration catalog content and sample promotions are not
              binding offers.
            </p>
            <h2>Payment and fulfilment</h2>
            <p>
              Payments are verified through Razorpay. Fulfilment and payment have separate statuses.
              Delivery within India is managed manually, with tracking details available in your
              account.
            </p>
            <h2>Returns, cancellations, and warranty</h2>
            <p>
              Cancellation and return requests require manual review. Manufacturer warranty details
              appear on each product page. Refunds must be processed by the store and recorded
              separately.
            </p>
            <h2>Before launch</h2>
            <p>
              The operator must add its business identity, support contact, delivery commitments,
              cancellation windows, return eligibility, dispute process, and applicable
              jurisdiction.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
