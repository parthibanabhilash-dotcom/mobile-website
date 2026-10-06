import './env';
import { Client, types } from 'pg';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { mysqlDatabaseUrl } from '../src/lib/database-url';

// FK-safe order. Keep every ID, password hash, timestamp, order/payment snapshot and reservation.
const tables = [
  'User',
  'Category',
  'Brand',
  'Product',
  'Variant',
  'ProductImage',
  'Address',
  'Order',
  'OrderItem',
  'Payment',
  'Reservation',
  'OrderHistory',
  'CartItem',
  'Wishlist',
  'Review',
  'Session',
  'AuthToken',
  'WebhookEvent',
  'Newsletter',
  'Setting',
  'RateLimit',
] as const;
const source = process.env.SOURCE_DATABASE_URL;
const target = process.env.DATABASE_URL;
if (
  !source ||
  !target ||
  !['postgres:', 'postgresql:', 'mysql:'].includes(new URL(source).protocol) ||
  new URL(target).protocol !== 'mysql:'
)
  throw new Error('SOURCE_DATABASE_URL must be PostgreSQL/MySQL and DATABASE_URL must be MySQL.');
const sourceUrl = new URL(source),
  targetUrl = new URL(target);
if (
  sourceUrl.protocol === targetUrl.protocol &&
  sourceUrl.hostname === targetUrl.hostname &&
  sourceUrl.port === targetUrl.port &&
  sourceUrl.pathname.toLowerCase() === targetUrl.pathname.toLowerCase()
)
  throw new Error('Source and target must be different databases.');
types.setTypeParser(1114, (value) => new Date(value + 'Z'));
const pg = sourceUrl.protocol !== 'mysql:' ? new Client({ connectionString: source }) : null;
const sourceMysql =
  sourceUrl.protocol === 'mysql:'
    ? new PrismaClient({
        datasources: {
          db: { url: mysqlDatabaseUrl(source, process.env.SOURCE_MYSQL_SSL_CA_BASE64 || '') },
        },
      })
    : null;
const mysql = new PrismaClient({ datasources: { db: { url: mysqlDatabaseUrl(target) } } });
async function main() {
  const snapshot: Record<string, any[]> = {};
  if (pg) {
    await pg.connect();
    await pg.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    for (const table of tables) snapshot[table] = (await pg.query(`SELECT * FROM "${table}"`)).rows;
    await pg.query('COMMIT');
  } else {
    await sourceMysql!.$transaction(
      async (tx) => {
        for (const table of tables)
          snapshot[table] = await (tx as any)[table[0].toLowerCase() + table.slice(1)].findMany();
      },
      { isolationLevel: 'RepeatableRead', timeout: 120000 },
    );
  }
  const backupDir = path.resolve('.tools/database-backups');
  await mkdir(backupDir, { recursive: true });
  const backup = path.join(backupDir, `database-${Date.now()}.json`);
  await writeFile(
    backup,
    JSON.stringify({ format: 1, exportedAt: new Date().toISOString(), tables: snapshot }),
    { flag: 'wx', mode: 0o600 },
  );
  const counts = await mysql.$transaction(
    async (tx) => {
      for (const table of tables) {
        const model = table[0].toLowerCase() + table.slice(1);
        if (await (tx as any)[model].count())
          throw new Error(`Target ${table} is not empty. Refusing to overwrite data.`);
      }
      for (const table of tables) {
        const model = table[0].toLowerCase() + table.slice(1);
        const rows = snapshot[table];
        for (let i = 0; i < rows.length; i += 100)
          await (tx as any)[model].createMany({ data: rows.slice(i, i + 100) });
      }
      const verified: Record<string, number> = {};
      for (const table of tables) {
        const model = table[0].toLowerCase() + table.slice(1);
        const actual = await (tx as any)[model].findMany();
        const canonical = (value: any): any =>
          value instanceof Date
            ? value.toISOString()
            : Array.isArray(value)
              ? value.map(canonical)
              : value && typeof value === 'object'
                ? Object.fromEntries(
                    Object.keys(value)
                      .sort()
                      .map((key) => [key, canonical(value[key])]),
                  )
                : value;
        const normalize = (rows: any[]) =>
          JSON.stringify(
            rows
              .map(canonical)
              .sort((a, b) =>
                String(a.id ?? a.email ?? a.key).localeCompare(String(b.id ?? b.email ?? b.key)),
              ),
          );
        if (normalize(actual) !== normalize(snapshot[table]))
          throw new Error(`Content verification failed for ${table}; import rolled back.`);
        verified[table] = actual.length;
      }
      return verified;
    },
    { timeout: 120000, maxWait: 15000 },
  );
  console.log(JSON.stringify({ event: 'database_copy_complete', backup, counts }));
}
main()
  .catch((error) => {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (pg) await pg.end();
    if (sourceMysql) await sourceMysql.$disconnect();
    await mysql.$disconnect();
  });
