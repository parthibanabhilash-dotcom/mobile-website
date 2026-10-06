# Mobile Shop setup — MySQL

The active application uses **MySQL**, locally and when deployed on Vercel. Live payments remain disabled.

## Start this prepared Windows workspace

```powershell
Set-Location -LiteralPath 'C:\Users\Admin\Desktop\E-Commerce'
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1
```

Open http://localhost:3000. If already running, use that server; stop it with Ctrl+C in its terminal before starting another.

The prepared MySQL database is `mobile_shop` on **127.0.0.1:3307**, user `mobile`. Its password was randomly generated and is stored in the ignored `.env`; do not share that file. Existing PostgreSQL accounts, products, variants, and cart/session records were copied and row-verified. The original PostgreSQL source remains intact on port 55432 but is no longer used by the application.

| Service                        | Location                                 |
| ------------------------------ | ---------------------------------------- |
| Storefront                     | http://localhost:3000                    |
| Customer account               | http://localhost:3000/account            |
| Admin                          | http://localhost:3000/admin              |
| Health                         | http://localhost:3000/api/health         |
| Local MySQL                    | `127.0.0.1:3307`, database `mobile_shop` |
| Development email without SMTP | `.mail/`                                 |
| Development uploads            | `public/uploads/`                        |

The startup script discovers the portable Node runtime and starts the prepared MySQL server if necessary. Do not overwrite this workspace's `.env` with `.env.example`.

For individual commands in a new PowerShell terminal:

```powershell
$env:PATH = (Join-Path $PWD '.tools/node-v22.23.3-win-x64') + ';' + $env:PATH
```

Use `npm.cmd`/`npx.cmd` to avoid PowerShell `.ps1` execution-policy errors.

## Connect using MySQL Workbench

Create a Standard TCP/IP connection:

- Host: `127.0.0.1`
- Port: `3307`
- Username: `mobile`
- Default schema: `mobile_shop`
- Password: the password portion of `DATABASE_URL` in your private `.env`

The prepared local account has a generated password; it is not passwordless. Keep it private. MySQL Workbench is optional and is not installed by this project.

## Install on another machine with Docker

Install Node.js 22+ and Docker with Docker Compose. The portable `.tools` directory and local secrets are not in GitHub.

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

Docker uses MySQL 8.4 on **127.0.0.1:3306**, database `mobile_shop`, user `mobile`, development password `mobile_local`. These example Docker credentials are development-only and differ from this workspace's random credentials on port 3307. MySQL data persists in the `mysql_data` volume. Old PostgreSQL Docker volumes are not reused or removed.

Docker also starts Mailpit: SMTP port 1025, inbox http://localhost:8025. Without an SMTP host, development mail is written to `.mail/`.

If using an existing MySQL installation, create an empty database with `utf8mb4_unicode_ci` collation, configure UTC time, and use its connection details before running migrations. Require MySQL 8.0.16+ for enforced CHECK constraints; MySQL 8.4 LTS is recommended.

## Environment configuration

| Variable                                                                                                                 | Purpose                                                               |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `DATABASE_URL`                                                                                                           | `mysql://USER:PASSWORD@HOST:PORT/DATABASE?connection_limit=5` locally |
| `APP_URL`                                                                                                                | Exact browser origin, locally `http://localhost:3000`                 |
| `DEMO_MODE`                                                                                                              | `false` for database-backed shopping/accounts                         |
| `PAYMENTS_LIVE_ENABLED`                                                                                                  | Keep `false`                                                          |
| `SESSION_DAYS`                                                                                                           | Session lifetime, example seven days                                  |
| `CRON_SECRET`                                                                                                            | Long random scheduler secret                                          |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`                                                      | Transactional email                                                   |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`                                                      | Real Razorpay test credentials when available                         |
| `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_PUBLIC_URL` | Production S3-compatible uploads                                      |
| `MYSQL_SSL_CA_BASE64`                                                                                                    | Optional base64 public provider CA for strict hosted TLS              |
| `SOURCE_DATABASE_URL`                                                                                                    | Source for the explicit database-copy command                         |
| `SOURCE_MYSQL_SSL_CA_BASE64`                                                                                             | Optional separate source-provider CA                                  |

Percent-encode special characters in connection credentials. Never commit real connection strings or use `NEXT_PUBLIC_*` for server secrets. Restart after environment changes; rebuild after changing the image-storage hostname.

Generate a cron secret:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

## Administrator email/password

Existing accounts from PostgreSQL retain their credentials. To create a new admin, provide a unique email and a password with at least ten characters:

```powershell
$env:ADMIN_EMAIL = 'your-admin@example.com'
$env:ADMIN_NAME = 'Your Name'
$adminPassword = Read-Host 'Choose your admin password (at least 10 characters)' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $adminPassword).Password
try {
    npm.cmd run admin:create
} finally {
    Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
    Remove-Variable adminPassword -ErrorAction SilentlyContinue
}
```

Sign in at http://localhost:3000/admin. The bootstrap command refuses to overwrite an existing user. Admin login email is separate from SMTP sender configuration. Ordinary customers register through the storefront and verify via Mailpit or `.mail/`.

## Preserve data when switching databases

Set `SOURCE_DATABASE_URL` to the old PostgreSQL or MySQL database and `DATABASE_URL` to the empty migrated MySQL target, then run:

```powershell
npm.cmd run db:migrate
npm.cmd run db:copy
```

Do not seed before importing. Stop source writes for cutover. The script uses a consistent source snapshot, saves an ignored private backup, inserts transactionally, compares every copied row, and refuses nonempty targets. MySQL collation uniqueness conflicts roll back and require deliberate resolution. IDs, hashed passwords, snapshots, and timestamps are preserved.

The archived PostgreSQL schema and migrations are under `prisma/legacy-postgresql/`. Never run those SQL files against MySQL. The original local PostgreSQL environment backup is `.tools/postgresql.env.backup`; keep it private.

## Tests and production build

```powershell
npm.cmd run typecheck
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run build
```

Database integration tests require `TEST_DATABASE_URL` pointing to a disposable MySQL database whose name contains `_test`. The prepared `mobile_shop_test` already exists on port 3307. Full-stack browser tests additionally require `E2E_DATABASE_URL`, a development server using that test database, and the loopback fixture gateway; see [README](README.md#validation). Browser tests run serially and clear previous `test-results/` output. Fixtures never replace real Razorpay provider verification.

For production performance auditing, stop development, run `npm.cmd run build`, then `npm.cmd run start`; in another terminal run `npm.cmd run test:performance`. Do not benchmark while other builds/tests run. The recorded homepage/catalog performance target remains below 90; see [VALIDATION.md](docs/VALIDATION.md).

## Vercel with hosted MySQL

Follow [MYSQL-VERCEL.md](docs/MYSQL-VERCEL.md) for provider creation, strict TLS/public CA, migrations, local-to-hosted data copy, environment variables, and deployment. Neon is PostgreSQL and cannot host this MySQL database.

Production requires SMTP, S3-compatible storage, backups, UTC database time, and scheduled reservation cleanup. Local development mail/uploads cannot persist on Vercel.

Schedule POST `/api/cron/expire` every minute with `Authorization: Bearer <CRON_SECRET>`, or run `npm run reservations:expire` on an external scheduler. Vercel Cron sends GET; the current POST cleanup route requires a compatible scheduler.

## Razorpay test checkout

Keep `PAYMENTS_LIVE_ENABLED=false`. Configure real `rzp_test_` credentials, automatic capture, and signed `payment.captured`/`order.paid` webhooks to `https://your-domain/api/payments/webhook`. Use the exact public origin in `APP_URL`.

A browser callback cannot mark payment paid. Backend HMAC and captured-payment amount/currency/order verification are mandatory. Test failure/dismissal/retry, delayed capture, duplicate/out-of-order events, and refresh recovery against Razorpay before a separately authorized live launch.

## Troubleshooting

| Problem                                     | Action                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| Node/npm is not found                       | Add the portable runtime to PATH or install Node.js 22+                             |
| npm/npx `.ps1` is blocked                   | Use `.cmd` wrappers                                                                 |
| Database connection fails                   | Check portable port 3307 versus Docker port 3306, user/password, and `DATABASE_URL` |
| Prisma reports PostgreSQL provider mismatch | Use the new MySQL migrations and `mysql://` URL, not the archived PostgreSQL files  |
| Hosted TLS fails                            | Use `sslaccept=strict` with the provider's correct public CA; check hostname/port   |
| Email is missing                            | Check `.mail/` or Mailpit; production needs real SMTP                               |
| Port 3000 is occupied                       | Use the running app or stop its terminal before restarting                          |
| Windows Prisma engine file is locked        | Stop the dev server before generating/building                                      |
| Import refuses a nonempty target            | Choose a new empty database; never reset a database containing real data            |

See [progress.md](progress.md) for saved status.
