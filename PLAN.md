# Mobile Shop — Premium Full-Stack E-Commerce

## Summary

Build a new Next.js application with TypeScript, Tailwind CSS, PostgreSQL, and Prisma. Deliver a complete storefront, customer account, separate admin interface, and backend-verified Razorpay test checkout.

Use provisional “Mobile Shop” branding, INR pricing, Indian addresses, email/password accounts, and manual fulfilment.

## Design and Shopping Experience

- Establish a shared design system: soft neutral backgrounds, dark typography, restrained blue accents, rounded cards, subtle shadows, consistent spacing, and modern icons.
- Create a responsive sticky header with categories, search, offers, compare, account, wishlist, and cart count. Use a compact scroll state and sliding mobile menu.
- Build every requested homepage section. Group product collections into compact grids and tabs to keep the page spacious without excessive repetition.
- Seed a clearly identified demonstration catalog of smartphones and accessories. Use optimized product images; label sample reviews and promotional content as demonstrations.
- Build searchable category and brand pages with sorting, pagination, price and specification filters, and mobile filter drawers.
- Implement premium product cards with pricing, discounts, ratings, stock, wishlist, quick view, and cart actions. Keep actions accessible on touch screens and through keyboard focus.
- Build product details with image gallery, zoom, valid color/RAM/storage combinations, variant-specific pricing and stock, quantity selection, purchase actions, and description/specification/warranty/review panels.
- Support comparison of up to four products, persistent wishlist, cart drawer, and full cart page.
- Use 150–500 ms CSS transitions for menus, cards, drawers, accordions, toasts, and checkout steps. Respect reduced motion and avoid large animation libraries.

## Accounts, Checkout, and Data

- Implement registration, email verification, sign-in, password reset, secure sessions, and customer/admin authorization. Require sign-in before ordering; preserve the shopping cart through authentication.
- Provide customer profile, order statistics, recent orders, order details and timeline, saved addresses, wishlist, and payment history. Allow verified purchasers to submit reviews.
- Implement checkout steps: Login → Address → Order Summary → Payment → Confirmation. Revalidate inventory, prices, and shipping on the server before payment.
- Store products, variants, images, categories, brands, users, addresses, carts, wishlists, reviews, orders, payments, inventory reservations, and order-status history. Store money as integer paise and retain purchased item/address snapshots.
- Reserve stock transactionally during payment initiation for 15 minutes. Release expired reservations through a scheduled job; handle delayed payments without overselling and flag fulfilment conflicts for admin resolution.
- Create Razorpay orders server-side. Validate callback signatures, verify payment capture and matching amount/currency/order through the backend, and process signed webhooks idempotently. Show a pending verification state until confirmation succeeds. This follows [Razorpay’s verification guidance](https://razorpay.com/docs/server-integration/python/test-app/) and [webhook validation guidance](https://github.com/razorpay/markdown-docs/blob/master/webhooks/validate-test.md).
- Keep payment and fulfilment states separate. Never infer payment success from the browser callback alone. Confirmation displays the order number, payment ID, Continue Shopping, and View Order.
- Provide validated server interfaces for catalog search, account actions, cart/wishlist updates, checkout creation, payment verification/webhooks, and admin operations. Enforce ownership, role checks, rate limits, and server-side validation.

## Admin and Operations

- Build a separate `/admin` layout with collapsible sidebar, responsive navigation, dashboard metrics, searchable tables, filters, status badges, modal forms, and notifications.
- Calculate revenue, orders, customers, products, low stock, and pending orders from database records. Include sales/orders/revenue trends, payment-method distribution, and top-selling products.
- Implement product creation and editing with grouped Basic Information, Pricing, Inventory, Specifications, Images, SEO, and Status sections. Include variant inventory and drag-and-drop image uploads with previews and progress.
- Implement order filtering and details with payment information, customer/address snapshots, tracking entry, and an audited timeline for all requested fulfilment statuses.
- Support admin-managed cancellations and returns. Record refunds only after manual processing with a reference; keep refund status separate from cancellation and return status.
- Use S3-compatible object storage for uploads and SMTP for transactional email, with local development storage and a development mail inbox.
- Include migrations, seed data, environment-variable documentation, local PostgreSQL setup, an explicit admin bootstrap command, health checks, and structured operational logs. Never seed public default admin credentials.

## Validation and Defaults

- Test variant selection, totals, shipping thresholds, stock concurrency, reservation expiry, order transitions, access control, and payment idempotency.
- Exercise Razorpay test success, failure, dismissal, invalid signatures, amount mismatches, duplicate/out-of-order webhooks, delayed capture, and page refresh during verification.
- Run end-to-end customer purchase and admin fulfilment flows, including search, comparison, wishlist, account recovery, uploads, cancellation, and refund recording.
- Verify layouts at 360, 768, 1024, and 1440 px; keyboard operation, focus management, accessible forms, contrast, reduced motion, and touch-friendly controls.
- Use server-rendered catalog pages, optimized/lazy-loaded images, skeletons, 250 ms debounced search, paginated queries, indexed filters, and code-split charts. Target Lighthouse scores of at least 90 for performance and accessibility on representative storefront pages.
- Default to tax-inclusive prices, free shipping above ₹5,000 and ₹99 below, configurable in admin. Use a configurable low-stock threshold of five units.
- Include newsletter subscription storage and consent, without a marketing campaign integration. Exclude automated refunds, carrier integrations, GST invoice automation, cash on delivery, and international selling.
- Deliver a locally runnable application and deployment instructions. Live launch requires production branding/content, PostgreSQL, storage, email, Razorpay credentials, and a public webhook endpoint; live payments remain disabled until configured and verified.

MODERN UI / UX REQUIREMENTS

Design the entire Mobile Shop E-Commerce Website with a premium, modern, stylish, and professional appearance similar to a high-quality technology retail platform.

The website should feel clean, fast, elegant, and visually attractive.

Use:

- Clean white or soft neutral background
- Premium dark text
- Modern accent colors
- Soft gradients
- Rounded cards
- Subtle shadows
- Glassmorphism only where appropriate
- Spacious layouts
- High-quality product images
- Clear typography
- Modern icons
- Consistent spacing
- Professional mobile-store visual style

Avoid:

- Overcrowded layouts
- Too many bright colors
- Excessive gradients
- Heavy neon effects
- Unnecessary animations
- Old-fashioned bootstrap-style UI
- Large empty sections
- Cluttered product cards

HOMEPAGE DESIGN

Create a visually impressive homepage with:

- Modern sticky header
- Search bar
- Category navigation
- Wishlist icon
- Cart icon with item count
- Customer account menu

Hero section should contain:

- Premium mobile phone promotional banner
- Headline
- Short promotional text
- Shop Now button
- Explore Offers button
- Modern product visual

Below hero section add:

- Shop by Category
- Popular Brands
- Latest Smartphones
- New Arrivals
- Best Sellers
- Special Offers
- Trending Accessories
- Featured Products
- Deal of the Day
- Why Shop With Us
- Customer Reviews
- Newsletter
- Modern Footer

PRODUCT CARDS

Create premium product cards with:

- Product image
- Brand
- Product title
- Rating
- Original price
- Offer price
- Discount badge
- Stock status
- Wishlist button
- Add to Cart button
- Quick View option

On hover:

- Product image slightly zooms
- Card lifts slightly
- Shadow becomes stronger
- Buttons smoothly appear
- Wishlist icon animates subtly

ANIMATIONS

Use modern, smooth, lightweight animations throughout the website.

Include:

- Fade-in animations
- Slide-up animations
- Smooth hover transitions
- Button micro-interactions
- Card hover effects
- Image zoom effects
- Dropdown animations
- Modal animations
- Smooth page transitions
- Cart drawer animation
- Wishlist interaction animation
- Loading skeleton animations
- Toast notification animations
- Accordion transitions
- Mobile menu slide animation
- Smooth scroll behavior

Animations must remain subtle and professional.

Do not make the website feel like a gaming website.

Use animations only where they improve user experience.

Animation duration should generally remain between approximately 150ms and 500ms.

Respect the user's `prefers-reduced-motion` accessibility setting.

HEADER

Create a premium sticky header.

Desktop header:

Logo | Categories | Search | Offers | Compare | Account | Wishlist | Cart

When scrolling:

- Header becomes slightly compact
- Apply subtle shadow or glass effect
- Maintain smooth transition

Mobile header:

- Logo
- Search
- Account
- Cart
- Hamburger menu

Mobile menu should open using a smooth slide animation.

SEARCH EXPERIENCE

Create a modern search experience.

When customer types:

- Show instant product suggestions
- Product thumbnail
- Product name
- Price
- Category
- Brand

Use a polished dropdown animation.

PRODUCT DETAILS PAGE

Product details page must have:

- Large image gallery
- Thumbnail navigation
- Image zoom
- Product title
- Rating
- Pricing
- Discount
- Stock status
- Color options
- RAM options
- Storage options
- Quantity selector
- Add to Cart
- Buy Now
- Wishlist
- Compare

Create tabs or accordions for:

- Description
- Specifications
- Warranty
- Reviews

Add subtle transition animations when options change.

CART EXPERIENCE

Create a modern cart drawer or cart page.

When a customer clicks Add to Cart:

- Show smooth add-to-cart animation
- Update cart count instantly
- Display toast confirmation

Cart should show:

- Product image
- Product title
- Variant
- Quantity
- Price
- Remove button

Use smooth quantity update animations.

CHECKOUT UI

Checkout must be minimal and distraction-free.

Use a step-based layout:

1. Login
2. Address
3. Order Summary
4. Payment
5. Confirmation

Show progress indicator.

Use smooth transitions between checkout sections.

RAZORPAY

Razorpay payment should be integrated professionally.

After successful payment:

Show an animated success state with:

Payment Successful
Order Confirmed
Order Number
Payment ID
Continue Shopping
View Order

Do not mark an order as paid until backend verification succeeds.

CUSTOMER DASHBOARD

Design customer dashboard with:

- Modern sidebar
- Profile summary
- Order statistics
- Recent orders
- Saved addresses
- Wishlist
- Payment history

Use subtle card animations.

ADMIN DASHBOARD DESIGN

Create a separate modern admin interface.

Use:

- Collapsible sidebar
- Clean top navigation
- Dashboard cards
- Responsive tables
- Charts
- Search
- Filters
- Status badges
- Modal forms
- Toast notifications

Dashboard should visually display:

- Revenue
- Orders
- Customers
- Products
- Low Stock
- Pending Orders

Use attractive charts for:

- Sales trend
- Orders trend
- Revenue trend
- Payment method distribution
- Top-selling products

ADMIN PRODUCT MANAGEMENT UI

Products page should contain:

- Search
- Category Filter
- Brand Filter
- Stock Filter
- Status Filter
- Add Product button

Use modern responsive data tables.

Add Product and Edit Product pages should have clearly grouped sections:

Basic Information
Pricing
Inventory
Specifications
Images
SEO
Status

Provide drag-and-drop image upload with image preview.

Use smooth upload progress indicators.

ADMIN ORDER MANAGEMENT UI

Orders should appear in a modern table.

Use colored status badges for:

Pending
Confirmed
Processing
Packed
Shipped
Out for Delivery
Delivered
Cancelled
Returned

Clicking an order should open a professional order-details page or side panel.

Show a visual order timeline.

Example:

Order Placed
↓
Confirmed
↓
Processing
↓
Packed
↓
Shipped
↓
Out for Delivery
↓
Delivered

RESPONSIVE DESIGN

The complete website must be fully responsive.

Optimize separately for:

- Desktop
- Laptop
- Tablet
- Mobile

Do not simply shrink desktop layouts.

Create proper mobile layouts.

On mobile:

- Large touch targets
- Bottom-friendly navigation where appropriate
- Responsive product grids
- Slide-out filters
- Compact checkout
- Mobile-friendly admin tables

PERFORMANCE

Animations must not reduce website performance.

Use:

- Lazy-loaded images
- Optimized product images
- Modern image formats where supported
- Code splitting if applicable
- Skeleton loading
- Efficient API requests
- Pagination
- Debounced search
- Optimized database queries

Avoid unnecessary large animation libraries.

ACCESSIBILITY

Maintain:

- Good color contrast
- Keyboard navigation
- Visible focus states
- Accessible forms
- Proper labels
- Alt text
- Reduced-motion support

FINAL DESIGN GOAL

The final result should feel like a premium 2026 mobile and electronics e-commerce platform.

It should combine:

Modern Design +
Premium Mobile Shopping Experience +
Smooth Professional Animations +
Fast Performance +
Responsive Layout +
Powerful Customer Account +
Professional Admin Dashboard +
Secure Razorpay Checkout

Every visual interaction should feel polished, smooth, and production-ready.





Read progress.md and continue from the saved state. Complete the remaining checks and fixes. Keep live payments disabled.