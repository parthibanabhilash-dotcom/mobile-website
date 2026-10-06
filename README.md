# Mobile Shop

A complete Next.js storefront and admin workspace for an India-based mobile and electronics retailer. TypeScript, Tailwind CSS, MySQL, Prisma, and server-verified Razorpay checkout.

## Run the storefront

Requires Node.js 22+. On this workspace, a portable runtime is available under `.tools`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1
```

Or, with Node on PATH:

```sh
npm ci
npm run db:generate
npm run dev
```

Open **http://localhost:3000**. Without `DATABASE_URL`, development mode shows a clearly labeled sample catalog. Accounts, admin mutations, newsletters, and payments require a database; the preview never creates pretend paid orders. For an explicit production preview, set `DEMO_MODE=true`.

This workspace already has Node.js, a loopback-only MySQL instance on port **3307**, a migrated `mobile_shop` database, demonstration catalog, and an ignored `.env`. The startup script restarts this portable database if needed. Development emails are written to `.mail/`. Existing local accounts were preserved during the PostgreSQL-to-MySQL import; payment credentials remain unset. On a different machine, follow the Docker setup below instead; `.tools` and local secrets are not committed.

## Enable the full application

1. Copy `.env.example` to `.env` and keep it out of source control.
2. Start MySQL and the development mail inbox: `docker compose up -d`.
3. Run `npm run db:migrate` and `npm run db:seed`.
4. Run `npm run dev`. Development email is visible at **http://localhost:8025** with the example SMTP configuration. Without an SMTP host, development email is written to `.mail/`.

The seed is idempotent and does not overwrite existing products. It includes demonstration product specifications and optimized WebP illustrations, with editable SVG source assets. Run `npm run assets:generate` to regenerate both formats. It creates no fake customer accounts, purchase reviews, or default administrators.

### Create an administrator

Supply your own credentials through the environment:

```powershell
$env:ADMIN_EMAIL = 'your-admin@example.com'
$env:ADMIN_NAME = 'Your Name'
# Set ADMIN_PASSWORD to your own strong password, at least 10 characters.
npm run admin:create
Remove-Item Env:ADMIN_PASSWORD
```

The command refuses to overwrite an existing account. Sign in at `/admin`. Customers cannot access admin APIs. The shell shows a sign-in screen before loading protected data.

## Implemented journeys

- Homepage: hero, categories, brands, collection tabs, offers, accessories, featured products, deal countdown, store assurances, labeled sample testimonials, newsletter, footer.
- Shopping: instant debounced suggestions, server-side catalog filters/sorting/pagination, product gallery and zoom, valid variants, quick view, wishlist, four-product comparison, cart drawer and cart page.
- Accounts: email verification, password reset, profile settings, saved addresses, order timelines, wishlist, payment history, delivered-purchase reviews.
- Checkout: login, address, summary, payment, confirmation. Server prices and stock are authoritative. Quantity is limited to ten per variant. Shipping is ₹99 and free **above** ₹5,000, configurable in admin; prices include tax.
- Admin: live metrics and charts, searchable filtered tables, product/variant editing, image upload, inventory, SEO fields, order status changes, tracking, manual refund recording, shipping and stock settings.
- Accessibility: focus states, keyboard menus, trapped modal focus, screen-reader labels, reduced motion, contrast checks, separate mobile layouts.

## Razorpay setup

Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` using test credentials first. Keep secrets on the server. The public key is sent only when preparing checkout.

Configure automatic payment capture in Razorpay and signed webhooks for `payment.captured` and `order.paid` pointing to:

```text
https://your-domain.example/api/payments/webhook
```

Use a public HTTPS tunnel for local webhook tests. Signature validation is followed by server-to-server payment lookup; the captured payment must match the stored gateway order, amount, and INR currency. Browser callback success alone cannot mark an order paid. A reconciliation endpoint recovers pending checkout on refresh.

Reservations last 15 minutes. Serializable database transactions protect stock. Expired reservations are released; late captured payments either acquire available stock or create a paid order with an inventory conflict that must be cancelled and manually refunded. Duplicate payment callbacks/events cannot decrement inventory twice. Multiple captured payments are recorded with an audit note for manual reconciliation.

Run reservation cleanup **every minute**, using a scheduler:

```sh
npm run reservations:expire
```

Alternatively, POST `/api/cron/expire` with `Authorization: Bearer <CRON_SECRET>`. This endpoint also clears expired sessions, tokens, and rate-limit buckets. Only use a long random cron secret.

`PAYMENTS_LIVE_ENABLED=false` blocks live keys. Enable live payments only after real Razorpay test transactions, webhook delivery, HTTPS, stock cleanup, storage, email, and fulfilment policies have been verified. Never put payment secrets in `NEXT_PUBLIC_*` variables.

Cancellation and return statuses do not imply a refund. Process refunds manually in Razorpay, then record the amount and reference in the admin order panel. Returned inventory is not automatically restocked; inspect the item and adjust variant stock separately.

Partial refunds can be recorded until the order total is reached. Repeated references are idempotent; references cannot be reused for a different amount or order. Each record retains its amount, reference, administrator, and timestamp in the order audit history. The refund summary shows the cumulative amount and latest reference.

## Uploads and deployment

Development uploads are stored in `public/uploads/`. Production requires S3-compatible storage. Set bucket, region, optional endpoint, credentials (or use a runtime IAM role), and `STORAGE_PUBLIC_URL`. Configure public read access for product images; do not expose write credentials. The storage hostname is included in Next.js image allowlists when building. Rebuild after changing it.

Uploads require an admin session, validate file magic bytes, and accept PNG, JPEG, or WebP up to 5 MB. SVG upload is rejected. Drag-and-drop progress is shown in the product editor. Uploaded objects removed from a product remain in storage; use your storage lifecycle/cleanup process for orphaned uploads.

Deploy as a Node.js application with MySQL:

```sh
npm ci
npm run db:migrate
npm run build
npm run start
```

Configure `APP_URL` to the exact public origin, all production secrets, SMTP, storage, database connection limits, HTTPS, and the reservation scheduler. Apply migrations as a release job before switching application traffic. Back up MySQL and object storage. `/api/health` verifies database connectivity and returns 503 when unavailable. Logs use structured event names for API, gateway, upload, and order-email failures.

Set the MySQL database/session timezone to UTC; administrative daily charts convert timestamps to Asia/Kolkata. The prepared local databases already use UTC.

Before launch, replace the provisional store identity, `.local` support email, draft legal pages, sample specifications/images, countdown promotions, and sample testimonials with approved business content. Supply verified catalog facts and licensed product photography. No carrier integration, international selling, GST invoice automation, cash on delivery, automated refunds, or marketing campaign sending is included.

## Validation

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Unit tests cover shipping boundaries, variants/input validation, order transitions, password hashing, origin protection, and gateway signatures. Browser tests cover browsing, wishlist, comparison, cart persistence, variant combinations, keyboard navigation, reduced motion, contrast, and horizontal overflow at 360/768/1024/1440 px.

For transaction integration tests, create a **dedicated disposable database with `_test` in its name**, apply migrations, set `TEST_DATABASE_URL` to its connection URL, and run `npm test`. Tests create and clean their own fixtures and verify concurrent final-unit reservations, duplicate captures, amount mismatches, failed gateway creation, expiry, late capture conflicts, and cancellation inventory restoration. Never point tests at production.

Full-stack browser tests in `tests/e2e/full-stack.spec.ts` require `E2E_DATABASE_URL`, a migrated/seeded test database, and a development server using that database. The fixture gateway is test-only:

```sh
npx tsx tests/fixtures/gateway.ts
```

Start the development app with test keys `rzp_test_fixture` / `fixture-secret`, webhook secret `fixture-webhook`, `SMTP_HOST` unset, and `TEST_RAZORPAY_API_URL=http://127.0.0.1:4060/v1`. Set `E2E_BASE_URL` to that app and `E2E_DATABASE_URL` to the same test database before running Playwright. The application accepts a loopback fixture gateway only outside production and with test keys. Production always calls Razorpay. These simulated tests do not replace real Razorpay test-mode certification.

Screenshots and retained failure traces are written under `test-results/`. Performance targets are measured against a production build, not development compilation. Use Lighthouse with mobile throttling and your deployment data; third-party payment scripts are loaded only when starting payment.

Run `node scripts/lighthouse.mjs` against a running production server to measure the homepage, catalog, and product page. Set `LIGHTHOUSE_URL` to override the local origin. Reports are saved in `test-results/performance/`. See [the validation record](docs/VALIDATION.md) for the checks performed on this implementation.

Styles use Next.js's default external stylesheet delivery. The benchmark script defaults to Lighthouse simulated mobile throttling; set `LIGHTHOUSE_THROTTLING_METHOD=devtools` to investigate with applied throttling, or `LIGHTHOUSE_PAGES=home` to select a page. Development compiles can exceed browser assertion timeouts on a cold Windows startup; prewarm routes or allow compilation time when investigating a timeout.

## PostgreSQL-to-MySQL migration and Vercel

The active schema and migrations use MySQL 8.0.16+ (8.4 LTS recommended). Original PostgreSQL schema/migrations are retained in `prisma/legacy-postgresql/`. The original local PostgreSQL database is untouched.

Set `SOURCE_DATABASE_URL` to the old PostgreSQL connection and `DATABASE_URL` to an empty, migrated MySQL database, then run `npm run db:import:postgresql`. Stop source writes during cutover. The command writes a private backup under `.tools/database-backups/`, copies all records transactionally, verifies every row, and refuses nonempty targets. Case/accent collisions under MySQL collation cause rollback and need manual resolution. Never run the seed before importing existing data.

See [MYSQL-VERCEL.md](docs/MYSQL-VERCEL.md) for hosted MySQL, strict TLS, provider CA configuration, migrations, data transfer, and Vercel environment variables. `MYSQL_SSL_CA_BASE64` accepts the base64-encoded public provider CA; the app and migration wrapper materialize it in temporary storage and use strict verification. Keep `PAYMENTS_LIVE_ENABLED=false`.
