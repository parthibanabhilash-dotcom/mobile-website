# Mobile Shop — saved implementation state

Updated: 6 October 2026. Work resumed at the user's request. Live payments remain disabled.

Workspace: `C:\Users\Admin\Desktop\E-Commerce`.

## Completed application

- Next.js 16.3.8, React 19, TypeScript, Tailwind CSS, MySQL 8.4, and Prisma 6.19.3 application with installed dependencies and lockfile.
- Responsive premium storefront: requested homepage sections, sticky desktop/mobile header, debounced search, category/brand filters, sorting/pagination, product cards/quick view, gallery/zoom, valid variants, wishlist, four-product comparison, persistent cart drawer/page.
- Email/password registration, verification/recovery, secure database sessions, customer/admin authorization, profile, addresses, order/payment history, timelines, and delivered-purchase reviews.
- Five-step checkout, authoritative paise totals/shipping/inventory, purchased snapshots, transactional 15-minute reservations, expiry cleanup, late-capture conflict handling, and concurrency protection.
- Server-created Razorpay orders, callback HMAC validation, backend capture/amount/currency/order verification, signed idempotent webhooks, and pending-payment reconciliation. Browser callbacks cannot establish payment success. Payment/fulfilment/refund states are separate.
- Separate admin interface: metrics/charts, filters/tables, grouped product/variant editor, image uploads, inventory/SEO, audited fulfilment/tracking, cancellations/returns, configurable shipping/low-stock thresholds, manual partial refunds with reference idempotency and cumulative limits.
- Local/S3 upload adapters, SMTP/development mail, newsletter consent, health checks, structured logs, validation, ownership/role/origin controls, rate limits, schema/migration/indexes, seed, explicit admin bootstrap, Docker setup, deployment instructions, CI workflow.
- Original demonstration illustrations and eleven optimized WebP exports. Sample content is identified as demonstration content. No public default admin credentials are seeded.
- Focus management, keyboard/touch controls, reduced motion, responsive mobile layouts, and contrast improvements.

## Fixes completed on 6 October

- Fixed portable PostgreSQL startup hanging on the long-running server child; verified warm readiness and restart recovery.
- Preserved fractional-paise display and catalog page-two selection during hydration.
- Removed demonstration catalog imports from client components; shared lightweight types/constants/formatting now live in `src/lib/catalog-shared.ts`.
- Load the cart drawer on demand and mount quick-view contents only when open.
- Removed the experimental inline-CSS/offscreen-layout changes. All homepage sections render in final mobile/desktop screenshots.
- Removed the global layout's catalog query/serialization. Page components and saved selections populate the client catalog cache. Suspense boundaries and background cache transitions split hydration work; cart actions use the immediately updated cache.
- Added product image sizing/loading hints.
- Payment dismissal/failure retries reuse their checkout key/reserved order and avoid revalidating their own reserved stock.
- Pending refresh restores the checkout key and quoted total; reconciliation skips mismatched captured payments.
- Fixed route-update retry races and confirmation resets/poll cancellation caused by account-object refreshes. Account identity changes clear previous checkout/address state; stale responses are ignored.
- Fixed stale admin order-loading responses clearing a selected fulfilment status.
- Expanded payment fixture coverage and unique gateway IDs. CI explicitly disables live payments.
- Corrected README and added `docs/VALIDATION.md`.

## Verification

- 19 unit and real PostgreSQL integration tests passed against the dedicated `mobile_shop_test` database.
- Nine storefront browser checks passed against the final production storefront: search, wishlist, comparison, cart persistence, variants, stable pagination, keyboard/reduced motion, Axe checks, and widths 360/768/1024/1440.
- Expanded full-stack fixture journey passed after the final hydration/cache and account-change field cleanup. Together with the nine storefront checks, all ten browser checks passed in the appropriate production-storefront/development-fixture environments.
- Final standalone TypeScript check, production build, and source/document formatting checks passed.
- Database health returned HTTP 200. Portable database startup returned promptly after restarting the database.
- Dependency audits previously reported zero vulnerabilities. GitHub CI is authored but has not been run remotely.

## Performance — still below the full requested target

Latest comparable production Lighthouse audit: default simulated mobile throttling, Lighthouse 13.5, fresh browser cache.

| Page     | Performance | Accessibility |   LCP | Blocking time |
| -------- | ----------: | ------------: | ----: | ------------: |
| Homepage |          78 |           100 | 2.7 s |        720 ms |
| Product  |          91 |           100 | 2.5 s |        280 ms |
| Catalog  |          81 |           100 | 2.5 s |        640 ms |

The homepage/catalog target of 90 remains unmet. JavaScript hydration/execution and main-thread work remain the principal gaps. Do not claim full performance certification. Earlier same-session results were 76/88/87 and 83/86/77; do not combine best scores from separate runs. Raw reports are retained under `.tools/final-performance/` and restored to `test-results/performance/` after browser testing. Details: `docs/VALIDATION.md`.

## Local environment and continuation

- Portable Node: `.tools/node-v22.23.3-win-x64`. In PowerShell use `npm.cmd` / `npx.cmd` to avoid execution-policy failures.
- Archived PostgreSQL source runtime/data/log: `.tools/pg-runtime/pgsql`, `.tools/pg-data`, `.tools/postgres.log`. Loopback port 55432, user `mobile`; development trust authentication is loopback-only. Main/test databases are migrated/seeded and use UTC.
- Ignored `.env` holds the main local database configuration, random cron secret, and `PAYMENTS_LIVE_ENABLED=false`. Do not publish secrets. No real Razorpay or production SMTP/S3 credentials are configured.
- Development emails are written to `.mail/` without SMTP. Production registration/email requires SMTP.
- Start with `powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1` and open http://localhost:3000. Use your own credentials with the documented explicit admin bootstrap command.
- Consult AGENTS.md and relevant bundled `node_modules/next/dist/docs/` guides before Next.js changes.
- Integration tests use `TEST_DATABASE_URL`; full-stack browser tests use `E2E_DATABASE_URL`. Both must name a dedicated `_test` database. Use the loopback gateway fixture only with a development server/test keys. Run browser suites sequentially because each clears `test-results/`.
- Read README for installation, test fixture configuration, deployment, scheduled reservation cleanup, storage, and email instructions.
- The main development app is left running at http://localhost:3000 using `.env` and the `mobile_shop` database. The fixture gateway and test development server are stopped. No payment keys are configured in this normal app; live payments remain disabled.

## Errors and limitations

- Fixed actual pagination, retry, confirmation-refresh, stale admin response, money-formatting, and database startup bugs described above. Cold admin compilation exceeded a 15-second browser assertion; its navigation assertion now allows 45 seconds.
- PowerShell blocks npm/npx `.ps1` wrappers; use `.cmd`. Restricted network/package operations previously succeeded on approved reruns.
- Non-blocking Prisma 6 package.json configuration and Vitest native-loader deprecation warnings remain. Asset export previously emitted a Fontconfig cache warning but generated every WebP successfully.
- No known unresolved compilation error. The full mobile performance target remains open.
- Real Razorpay test-mode success/failure/dismissal/delayed capture and webhook delivery still require real test credentials plus a public HTTPS webhook endpoint. Local fixtures do not certify the provider.
- Production SMTP/S3 integrations, production deployment performance, manual screen-reader testing, approved brand/legal/catalog content, and licensed product photography remain launch prerequisites.
- Live payments remain disabled until a separately authorized launch after provider and operational verification.
- Approved exclusions remain: automated refunds, carrier integration, GST invoice automation, cash on delivery, international selling, marketing campaign sending.

## MySQL migration — 6 October 2026

- Active database is MySQL 8.4.11, mobile_shop on 127.0.0.1:3307. Random local credentials remain in ignored .env/.tools files. Original PostgreSQL database and schema/migrations are preserved.
- Imported all existing rows and verified their complete contents: 2 users, 10 products, 22 variants, 16 product images, 2 cart items, 1 session, 2 auth tokens, 3 settings, 6 rate limits, plus categories/brands; no orders/payments existed at cutover. Existing account passwords are retained.
- Converted schema, migrations/CHECK constraints, catalog filters, rate limits, India-day admin metrics, Docker, CI, startup scripts, and test setup to MySQL.
- Added strict hosted TLS/public CA support and transactional db:copy for PostgreSQL/MySQL sources. Copy to a fresh dedicated local MySQL test database passed full-row verification. Repeated copy correctly refused the nonempty target without overwriting it. Private snapshot backups are ignored.
- Validation: 26 unit/integration tests and all 10 browser tests passed on MySQL. Final build/typecheck pending below.
- Updated setup.md and docs/MYSQL-VERCEL.md cover local setup, admin creation, Vercel configuration, migrations, hosted data copy, SMTP/storage and reservation scheduler. Hosted provider has not been chosen or provisioned; user replied they have not chosen one. No hosted connection can be claimed.
- Fixed transient MySQL TEXT DEFAULT migration incompatibility by using appropriately sized VARCHAR fields, and startup readiness probe handling. No source data was removed. Prisma/Vitest deprecation warnings remain nonblocking.
- Live payments stay disabled. Real Razorpay/SMTP/S3 integration checks and homepage/catalog performance target remain pending as documented above.

Final MySQL validation: production build PASS; standalone typecheck PASS. Hosted MySQL remains unconfigured. Current migration changes are local and have not yet been pushed to GitHub.
