# Mobile Shop setup

This guide covers the existing Windows workspace and installation on another machine. Keep `PAYMENTS_LIVE_ENABLED=false` throughout setup.

## 1. Start this prepared workspace

Open PowerShell in `C:\Users\Admin\Desktop\E-Commerce`:

```powershell
Set-Location -LiteralPath 'C:\Users\Admin\Desktop\E-Commerce'
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1
```

Open http://localhost:3000. If the application is already running there, use the existing server. Press Ctrl+C in its terminal to stop it.

This workspace already includes dependencies, portable Node.js, a migrated/seeded local database, and an ignored `.env`. **Do not overwrite that `.env` with the example file.**

| Service                         | Location                                  |
| ------------------------------- | ----------------------------------------- |
| Storefront                      | http://localhost:3000                     |
| Customer account                | http://localhost:3000/account             |
| Admin sign-in                   | http://localhost:3000/admin               |
| Health check                    | http://localhost:3000/api/health          |
| Prepared PostgreSQL             | `127.0.0.1:55432`, database `mobile_shop` |
| Development emails without SMTP | `.mail/`                                  |
| Development product uploads     | `public/uploads/`                         |

The startup script discovers portable Node and starts the prepared PostgreSQL instance when required. No default admin account or Razorpay credentials are provided.

For individual commands in a new PowerShell terminal, add the portable runtime to PATH:

```powershell
$env:PATH = (Join-Path $PWD '.tools/node-v22.23.3-win-x64') + ';' + $env:PATH
node --version
npm.cmd --version
```

Use `npm.cmd` and `npx.cmd` in PowerShell to avoid blocked `.ps1` wrappers.

## 2. Install on another machine

Prerequisites: Node.js 22 or newer, npm, and Docker with Docker Compose, or an existing PostgreSQL 16 database. The portable `.tools` directory is local and is not included in source control.

Run these commands from the project directory. Copy the example only when no `.env` exists:

```powershell
npm.cmd ci
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
docker compose up -d
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

The Docker configuration uses PostgreSQL on port **5432** and Mailpit SMTP on **1025**. View development emails at http://localhost:8025. These ports differ from this workspace's portable database on **55432**.

If using existing PostgreSQL instead of Docker, create an empty database, configure its connection URL, and run the generation/migration/seed commands above. Configure the database/session timezone as UTC. The seed is idempotent and adds demonstration products without creating default administrators or overwriting existing products.

## 3. Configure the environment

Edit `.env`; never commit it or put server secrets in `NEXT_PUBLIC_*` variables.

| Variable                                                                                                                 | Purpose                                                      |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `DATABASE_URL`                                                                                                           | PostgreSQL connection URL, matching the database you started |
| `APP_URL`                                                                                                                | Exact application origin, locally `http://localhost:3000`    |
| `DEMO_MODE`                                                                                                              | Set `false` for database-backed accounts and shopping        |
| `SESSION_DAYS`                                                                                                           | Session lifetime; default example is seven days              |
| `CRON_SECRET`                                                                                                            | Long random secret for the cleanup endpoint                  |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`                                                      | Transactional email settings                                 |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`                                                      | Optional real Razorpay **test-mode** credentials             |
| `PAYMENTS_LIVE_ENABLED`                                                                                                  | Keep `false`; live keys are rejected                         |
| `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_PUBLIC_URL` | Production S3-compatible image storage                       |

Generate a cron secret and copy the printed value into `.env`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Restart the application after environment changes. Changing `STORAGE_PUBLIC_URL` requires rebuilding because its hostname is included in the image allowlist.

Without an SMTP host, development email is saved in `.mail/`. Production requires SMTP. Without a database, development can display the sample catalog, but account creation, admin writes, newsletter persistence, and ordering require PostgreSQL.

## 4. Create your administrator

Use your own email/name and a strong password of at least ten characters. This command creates a verified admin and refuses to overwrite an existing account.

```powershell
$env:ADMIN_EMAIL = 'your-admin@example.com'
$env:ADMIN_NAME = 'Store Administrator'
$adminPassword = Read-Host 'Choose an admin password (at least 10 characters)' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $adminPassword).Password
try {
    npm.cmd run admin:create
} finally {
    Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
    Remove-Variable adminPassword -ErrorAction SilentlyContinue
}
```

Sign in at http://localhost:3000/admin. Create ordinary customer accounts through the storefront; follow the verification link in Mailpit or the development `.mail/` message.

## 5. Razorpay test checkout

Checkout remains unavailable until payment credentials are configured. To test with Razorpay itself:

1. Set your real Razorpay test key ID, key secret, and webhook secret in `.env`.
2. Keep `PAYMENTS_LIVE_ENABLED=false` and use a key starting with `rzp_test_`.
3. Configure automatic capture and signed `payment.captured` / `order.paid` webhooks targeting `https://your-public-test-domain/api/payments/webhook`.
4. Use public HTTPS for webhook delivery, and set `APP_URL` to the origin used for the browser session.
5. Verify success, failure, dismissal/retry, pending verification, delayed capture, duplicate events, and refresh recovery before any launch.

Payment is confirmed only after backend signature and captured-payment order/amount/currency verification. The browser callback alone cannot mark an order paid. Local fixture tests do not replace real Razorpay test-mode verification. No live-payment enablement is part of this setup.

## 6. Run checks

```powershell
npm.cmd run typecheck
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run build
```

Without `TEST_DATABASE_URL`, database integration tests are skipped. Without `E2E_DATABASE_URL`, the full-stack fixture purchase test is skipped; storefront browser tests still run.

For all checks, use a migrated/seeded **disposable database with `_test` in its name**. This workspace already has `mobile_shop_test`. Never point integration tests at the main or production database.

```powershell
$env:TEST_DATABASE_URL = 'postgresql://mobile@127.0.0.1:55432/mobile_shop_test?schema=public'
npm.cmd test
```

For the full-stack browser journey, run a separate development application using that test database and the loopback gateway fixture. Follow the exact fixture environment and terminal instructions in [README](README.md#validation). Browser tests run serially; each invocation clears `test-results/`.

To audit performance, stop the development server, build, then start production mode:

```powershell
npm.cmd run build
npm.cmd run start
```

In another terminal with Node on PATH:

```powershell
npm.cmd run test:performance
```

Avoid running other tests/builds during the audit. See [VALIDATION.md](docs/VALIDATION.md) for actual results and remaining gaps. Homepage/catalog performance has not yet met the requested score of 90.

## 7. Production deployment with live payments disabled

Provision PostgreSQL, SMTP, S3-compatible storage, HTTPS, and a public signed webhook endpoint. Configure secrets on the server, `APP_URL` to the deployment origin, and `PAYMENTS_LIVE_ENABLED=false`.

```sh
npm ci
npm run db:migrate
npm run build
npm run start
```

Apply migrations as a release job before switching traffic. Create your administrator explicitly; do not install demo catalog data into a real store unintentionally. Production uploads require S3-compatible storage; local uploads are for development only.

Schedule reservation cleanup **every minute**:

```sh
npm run reservations:expire
```

Alternatively, POST `/api/cron/expire` with `Authorization: Bearer <CRON_SECRET>`. Check `/api/health`, configure database/object-storage backups, and replace demo branding, product facts/images, legal text, support contacts, and promotional content before public launch. Real SMTP/S3/Razorpay verification and deployment performance checks remain required.

## Troubleshooting

| Problem                                                | Action                                                                                                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.ps1` or `npx.ps1` is blocked                      | Use `npm.cmd` / `npx.cmd`                                                                                                                      |
| Node is not found                                      | Add portable Node to PATH or install Node.js 22+                                                                                               |
| Database connection fails                              | Check port 55432 versus Docker port 5432 and `DATABASE_URL`; run `local-db.ps1` for the prepared database or `docker compose up -d` for Docker |
| Port 3000 is occupied                                  | Use the running application, or stop its terminal before starting another server                                                               |
| Verification/reset email is missing                    | Check `.mail/` when SMTP is unset, or Mailpit at port 8025 with Docker                                                                         |
| Checkout says credentials are not configured           | Supply Razorpay test credentials; keep live payments disabled                                                                                  |
| Cold browser navigation times out                      | Let development routes compile and retry; use production mode for performance audits                                                           |
| Windows Prisma generation reports a locked engine file | Stop the development server before generating/building, then restart it                                                                        |

See [progress.md](progress.md) for the saved implementation state and [README](README.md) for additional operational details.
