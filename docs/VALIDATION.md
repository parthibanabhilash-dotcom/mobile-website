# Validation record

Updated 6 October 2026. This record describes local verification, not live-payment or production-provider certification.

## Automated checks

- 26 unit and MySQL integration tests passed against the isolated `mobile_shop_test` database. Coverage includes paise precision, shipping boundaries, variant validation, signatures, access/origin rules, inventory concurrency, reservation expiry, late capture conflicts, duplicate captures, gateway failures, fulfilment transitions, cancellation inventory restoration, and manual refund limits/idempotency.
- Nine storefront browser checks passed: search, wishlist, comparison, persistent cart, valid variants, stable catalog pagination, keyboard focus, reduced motion, and responsive layouts at 360, 768, 1024, and 1440 pixels. Axe found no serious or critical violations on the tested homepage.
- The expanded full-stack browser journey passed after checkout and admin request-race fixes. It exercises registration/email verification, guest-cart preservation, saved addresses, dismissal and failed-payment retries without recreating an order, rejected invalid signatures and mismatched amounts, authorized payments remaining pending, delayed capture, reconciliation after refresh, duplicate/out-of-order signed webhooks, ownership/role checks, fulfilment through delivery, verified reviews, returns, manual refund recording, product creation/image upload, and password recovery/session invalidation.
- Final standalone `next typegen && tsc --noEmit`, production compilation/route generation, and source/document formatting checks passed after all fixes.
- GitHub CI configuration is provided but has not been executed on GitHub in this workspace session.

## Payment boundaries

All payment browser tests use a local fixture gateway with test-only keys. The production application ignores the fixture override. No real Razorpay credentials were supplied, and `PAYMENTS_LIVE_ENABLED=false` remains configured. Browser callbacks never establish payment success: backend signature checks and captured-payment amount/currency/order matching are required.

Real Razorpay test-mode certification still requires supplied test credentials and a public signed webhook endpoint. Production SMTP and S3 upload integrations require credentials and have not been exercised here. Local mail files and local uploads were exercised.

## Performance

Final production measurements used `npm run test:performance`, Lighthouse 13.5, Playwright Chromium, default simulated mobile throttling, and a fresh browser cache on this Windows workspace. A warmed server route does not warm the audited browser cache. Raw reports are retained under `test-results/performance/` and `.tools/final-performance/`.

| Page     | Performance | Accessibility |   LCP | Total blocking time |
| -------- | ----------: | ------------: | ----: | ------------------: |
| Homepage |          78 |           100 | 2.7 s |              720 ms |
| Product  |          91 |           100 | 2.5 s |              280 ms |
| Catalog  |          81 |           100 | 2.5 s |              640 ms |

**The homepage and catalog performance target of 90 is still unmet.** JavaScript execution/hydration and main-thread work remain the principal gaps. Other audits during this session produced 76/88/87 before the final hydration changes and 83/86/77 during an intermediate pass; these are separate measurements, not a combined best-case score. Reassess on the deployment host and continue reducing blocking work before claiming the full performance target is met.

The requested performance score of at least 90 must be assessed from measured results; it is not implied by passing functional tests. Accessibility scores and automated Axe checks do not replace manual assistive-technology testing.

## Fixes verified during this session

- Portable PostgreSQL startup waits for `pg_ctl` rather than the long-running server child; already-running database readiness returns promptly.
- Catalog page two no longer resets to page one during hydration.
- Money formatting preserves integer-paise precision.
- Payment retry reuses its reserved checkout instead of revalidating an already-reserved cart.
- Reconciliation selects a matching captured payment, skipping mismatched payments.
- Checkout verification and confirmation survive account-object refreshes; account changes clear previous checkout state.
- Admin order loading ignores stale responses that could reset a selected status.
- Client bundles no longer import the demonstration catalog; the cart drawer loads on demand. The experimental inline-CSS and offscreen-layout experiments were removed.
- The global layout no longer queries/serializes the catalog on every route. Visible product components and saved selections populate the catalog cache. Interactive sections use [React Suspense's selective hydration](https://react.dev/reference/react/Suspense), and background cache renders use [startTransition](https://react.dev/reference/react/startTransition); cart actions read the immediately updated cache.

## Launch requirements

Follow the configuration and deployment instructions in [README](../README.md). Supply production MySQL, SMTP, object storage, HTTPS/public webhooks, scheduled reservation cleanup, real catalog content and imagery, branding, support/legal policies, and explicit administrator bootstrap. Keep live payments disabled until a separate authorized launch and provider verification.

Non-blocking tooling warnings remain for Prisma 6's package.json configuration and Vitest's future native configuration loading. They do not prevent current tests or builds.

## MySQL conversion (6 October 2026)

Migrated the active application to MySQL with enforced CHECK constraints, case-insensitive searches, transactional rate limits, India-day dashboard queries, CI/Docker changes, strict hosted TLS, and a row-verified PostgreSQL import. The local import preserved 2 users, 10 products, 22 variants, 16 images, 2 cart items, 1 session, 2 auth tokens, 3 settings, and 6 rate-limit records; no orders or payments existed at cutover. The original PostgreSQL source and ignored snapshot backup remain intact. Hosted MySQL has not been provisioned because no provider/account credentials were supplied. All 26 unit/integration tests and all 10 browser tests passed against MySQL. MySQL-to-MySQL copying also passed full-row verification; a repeat import correctly refused the nonempty target. Production build and final typecheck results are recorded in progress.md. Hosted TLS configuration is supported but has not been exercised against a real provider.
