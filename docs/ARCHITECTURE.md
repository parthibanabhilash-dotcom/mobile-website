# Application contracts

All money values returned by the API are integer **paise**. The display helper formats INR. Accounts are authenticated with a random HttpOnly cookie whose SHA-256 digest is stored in MySQL. Mutations require the exact `APP_URL` origin, except separately authenticated Razorpay webhooks and cron calls. Responses use JSON; errors use `{ "error": "message" }` with an appropriate HTTP status.

## Storefront and account API

| Method              | Endpoint                               | Contract                                                                                                                                                               |
| ------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET                 | `/api/catalog`                         | `q`, `category`, `brand`, `max` (rupees), `ram`, `storage`, `inStock`, `offers`, `collection`, `sort`, `page`; returns `{products,total}` with nine products per page. |
| GET                 | `/api/catalog/lookup`                  | Bounded comma-separated product/variant IDs for restoring saved selections; returns active products.                                                                   |
| GET                 | `/api/settings`                        | Current shipping threshold/fee in paise and low-stock threshold.                                                                                                       |
| GET                 | `/api/auth/me`                         | `{user,demo}`; never includes password hashes or session tokens.                                                                                                       |
| POST                | `/api/auth/register`                   | `{name,email,password}`; sends a verification link without disclosing account existence.                                                                               |
| POST                | `/api/auth/login`                      | `{email,password}`; requires verified email, sets the session cookie.                                                                                                  |
| POST                | `/api/auth/forgot`, `/api/auth/resend` | `{email}`; generic response and emailed expiring token.                                                                                                                |
| POST                | `/api/auth/verify`                     | `{token}`; consumes a one-use verification token.                                                                                                                      |
| POST                | `/api/auth/reset`                      | `{token,password}`; consumes reset tokens and revokes existing sessions.                                                                                               |
| POST                | `/api/auth/logout`                     | Deletes the session and cookie.                                                                                                                                        |
| GET                 | `/api/account`                         | Owned order snapshots, addresses, wishlist, and cart selections.                                                                                                       |
| PATCH               | `/api/account/profile`                 | `{name}`.                                                                                                                                                              |
| GET / POST / DELETE | `/api/addresses`                       | List, create Indian address, or remove owned `{id}`.                                                                                                                   |
| GET / PUT           | `/api/cart`                            | Read or replace `{items:[{variantId,quantity}]}`; checks active products and available inventory.                                                                      |
| PUT                 | `/api/wishlist`                        | `{productId,saved}`.                                                                                                                                                   |
| POST                | `/api/reviews`                         | `{productId,rating,text}`; requires an owned delivered paid purchase. Updates aggregate ratings transactionally.                                                       |
| POST                | `/api/newsletter`                      | `{email,consent:true}`; stores consent without sending campaigns.                                                                                                      |
| GET                 | `/api/orders/:id`                      | Owned order with immutable item/address snapshots, payment records, and status history; also accessible to admins.                                                     |

## Checkout and payment API

| Method | Endpoint                  | Contract                                                                                                                                                                                               |
| ------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/api/checkout`           | `{addressId,key}`; UUID key identifies one checkout attempt. Revalidates the authenticated cart, reserves stock, stores totals, and creates a Razorpay order. Returns order fields and public `keyId`. |
| POST   | `/api/payments/verify`    | `{orderId,razorpay_payment_id,razorpay_signature}`; checks ownership, HMAC, and provider capture/order/amount/currency. Returns `PAID` or HTTP 202 `PENDING`.                                          |
| POST   | `/api/payments/reconcile` | Owned `{orderId}`; fetches captured payments from the provider to recover refreshes or delayed capture.                                                                                                |
| POST   | `/api/payments/webhook`   | Raw signed JSON, `x-razorpay-signature`, and event ID. Provider lookup validates matching capture; event and payment IDs are deduplicated.                                                             |
| POST   | `/api/cron/expire`        | Bearer cron secret; releases expired reservations and cleans expired auth/rate-limit records.                                                                                                          |

The payment callback, webhook, and reconciliation paths converge on one serializable confirmation transaction. Inventory is decremented once, payment references are unique, and order history is append-only through application interfaces. Payment status and fulfilment status are independent. A payment after stock expiry either consumes available stock or flags the order for cancellation/manual refund; it never oversells.

## Admin API

All `/api/admin/*` endpoints require an authenticated `ADMIN` user. UI visibility does not confer authorization.

| Method     | Endpoint                   | Contract                                                                                                                                                            |
| ---------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET        | `/api/admin/dashboard`     | All-order metrics, 14-day India-time trends, payment distribution, top products, and ten recent orders.                                                             |
| GET        | `/api/admin/products`      | Search/filter/page with twenty rows per page.                                                                                                                       |
| GET        | `/api/admin/products/:id`  | Complete editable product, including SEO fields and existing variant IDs.                                                                                           |
| POST / PUT | `/api/admin/products`      | Validated product, images and variants; PUT includes `id`. Existing variants retain identity and cannot be removed. Set unavailable variants to zero stock instead. |
| POST       | `/api/admin/upload`        | Multipart `file`; magic-byte checked PNG/JPEG/WebP, max 5 MB; returns `{url}`.                                                                                      |
| GET        | `/api/admin/orders`        | Number search/status/page with twenty orders per page.                                                                                                              |
| PATCH      | `/api/admin/orders/status` | `{id,status,tracking?}`; validated fulfilment transition and audit entry.                                                                                           |
| POST       | `/api/admin/orders/refund` | `{id,reference,amount}`; records a separately processed refund for a paid cancelled/returned order.                                                                 |
| GET / PUT  | `/api/admin/settings`      | `{freeShippingThreshold,shippingFee,lowStockThreshold}`.                                                                                                            |

MySQL utf8mb4_unicode_ci collation supplies case-insensitive substring search. Catalog filters use indexed relation/variant fields; stock predicates are parameterized. Full-text indexes are available, while substring searches can scan matching active rows. Dashboard dates use UTC plus the fixed India offset, and rate-limit upserts hold a transaction row lock. Serializable transaction conflicts are retried with bounded attempts. Database constraints enforce inventory, price, quantity, status, and total invariants.

## Operational boundaries

- Production requires MySQL, SMTP, HTTPS, S3-compatible object storage, a reservation cleanup scheduler, and public Razorpay webhooks.
- Payment keys are test-only by default. Production code ignores the loopback fixture gateway environment variable.
- Order email failures are logged after committing verified payment; an email outage never rolls back a legitimate payment.
- Demonstration imagery, catalog specifications, legal text, support contacts, and promotional copy need business approval and replacement before launch.
