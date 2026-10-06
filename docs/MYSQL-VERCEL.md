# Hosted MySQL and Vercel

The application now uses MySQL 8.0.16+ with enforced foreign keys and CHECK constraints. MySQL 8.4 LTS is recommended. Neon hosts PostgreSQL and cannot host this MySQL schema. The website can remain on Vercel; provision MySQL separately.

## 1. Create hosted MySQL

One compatible option is [Aiven for MySQL](https://aiven.io/docs/products/mysql/get-started). Create your account, then create a **MySQL** service. Review its plan, connection limits, and region before accepting any paid service. Aiven's Free tier has resource limits and does not let you choose a specific cloud region; see its [current documentation](https://aiven.io/docs/products/mysql/concepts/mysql-free-tier). For production, choose capacity and backups appropriate to your shop.

After the service is running, its Overview/Connection information supplies the hostname, port, database, username, password, and downloadable public CA certificate. Use the provider's actual database name (for example, `defaultdb`); it does not have to be named `mobile_shop`.

Keep the connection URL private. Percent-encode special characters in credentials. Prisma 6 requires its own TLS parameters rather than assuming another client's `ssl-mode` flag applies:

```env
DATABASE_URL=mysql://USER:ENCODED_PASSWORD@HOST:PORT/DATABASE?sslaccept=strict&connection_limit=2&connect_timeout=15&pool_timeout=15
MYSQL_SSL_CA_BASE64=BASE64_OF_PROVIDER_CA_CERTIFICATE
APP_URL=https://your-project.vercel.app
DEMO_MODE=false
PAYMENTS_LIVE_ENABLED=false
```

Convert the downloaded public CA certificate to base64 in PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\path\to\ca.pem'))
```

Copy that output into `MYSQL_SSL_CA_BASE64`. This is the public CA, not a client private key. The application and migration wrapper write it to a temporary file and enforce strict certificate verification. Providers with publicly trusted certificates may not require this variable, but still use `sslaccept=strict`. [Prisma MySQL TLS reference](https://www.prisma.io/docs/orm/v6/overview/databases/mysql).

## 2. Create the hosted tables

From this project directory, keep your local `.env` unchanged and temporarily set the hosted values in a new terminal:

```powershell
$env:PATH = (Join-Path $PWD '.tools/node-v22.23.3-win-x64') + ';' + $env:PATH
$env:DATABASE_URL = 'YOUR_PRIVATE_HOSTED_MYSQL_URL'
$env:MYSQL_SSL_CA_BASE64 = 'YOUR_PROVIDER_CA_BASE64'
npm.cmd run db:migrate
```

Use your provider's actual URL and certificate. `db:migrate` runs the project's MySQL migrations with the same CA support used by the application. Do not use the archived PostgreSQL migrations against MySQL.

## 3. Transfer existing local data, or start empty

To copy existing data, keep source writes stopped during cutover, set the source URL to your existing **local MySQL** database, and run:

```powershell
$env:SOURCE_DATABASE_URL = 'YOUR_LOCAL_MYSQL_URL_FROM_LOCAL_ENV'
npm.cmd run db:copy
```

The target must have migrated tables but **no application records**. The script reads a consistent source snapshot, writes an ignored private backup, copies all records inside one target transaction, and verifies every row. IDs, password hashes, addresses, cart selections, orders, payment records, and timestamps are retained. It refuses the same source/target or a nonempty target. Source data is never written or deleted.

If the source is PostgreSQL, use the same command with its `postgresql://` URL. If the source is hosted MySQL with its own CA, configure `SOURCE_MYSQL_SSL_CA_BASE64` separately. MySQL's case/accent-insensitive collation can reject source unique values that differ only by case/accent; such failures roll back and must be resolved deliberately.

Do **not** seed the target before copying. To start a fresh demonstration database instead, run `npm.cmd run db:seed` and create your own administrator using [setup.md](../setup.md). A real store should use verified catalog content instead of demonstration data.

After configuration, close the temporary terminal or clear its connection/password-related environment variables. Never commit `.env`, certificate private keys, or database snapshots.

## 4. Configure Vercel

Import the GitHub project as **Next.js**. Use `npm ci` as Install Command and `npm run build` as Build Command. Keep the default output directory; Vercel manages the server runtime, so do not configure `npm run start` as a custom Vercel start command.

In **Settings → Environment Variables**, add the hosted `DATABASE_URL`, `MYSQL_SSL_CA_BASE64` when required, exact `APP_URL`, `DEMO_MODE=false`, `PAYMENTS_LIVE_ENABLED=false`, and a long random `CRON_SECRET`. Add production SMTP and S3 settings from `.env.example` for email and uploads. Production and preview deployments should use separate databases.

Redeploy after environment changes. Open:

```text
https://your-project.vercel.app/api/health
```

HTTP 200 with `{"status":"ok"}` means the deployment can query its database. Then verify sign-in, search, admin metrics, checkout in Razorpay test mode, uploads, and email against the actual provider.

## 5. Operations before taking real orders

- Use UTC database/session time. Verify it with `SELECT @@session.time_zone, NOW(), UTC_TIMESTAMP();`. Dashboard grouping converts stored UTC dates to India time.
- Keep the per-function connection pool small and monitor the provider's total connection quota. `connection_limit=2` is a starting configuration, not a guarantee against fleet-wide saturation.
- Arrange database backups and test restore procedures.
- Schedule POST `/api/cron/expire` every minute with `Authorization: Bearer <CRON_SECRET>` using a scheduler supporting POST and headers. The current route is POST; a Vercel Cron GET call is not directly compatible.
- Configure SMTP and S3-compatible uploads. Vercel cannot persist development `.mail/` or `public/uploads/` writes.
- Keep live payments disabled. Real Razorpay test credentials, signed public webhooks, production-provider checks, approved catalog/legal content, and the outstanding homepage/catalog performance target remain launch prerequisites.

No hosted service was provisioned during the local conversion; these steps require your own provider account and credentials.
