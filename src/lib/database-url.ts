import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Hosted providers may supply a private CA. Materialize only the public CA in writable
// temporary storage, so Vercel functions and Prisma migration commands use the same trust.
export function mysqlDatabaseUrl(raw: string, caBase64 = process.env.MYSQL_SSL_CA_BASE64) {
  const url = new URL(raw);
  if (url.protocol !== 'mysql:')
    throw new Error('DATABASE_URL must use mysql:// after the migration.');
  if (caBase64) {
    if (caBase64.length > 100000) throw new Error('MySQL CA certificate is too large.');
    const certificate = Buffer.from(caBase64, 'base64').toString('utf8');
    if (
      !certificate.includes('-----BEGIN CERTIFICATE-----') ||
      !certificate.includes('-----END CERTIFICATE-----')
    )
      throw new Error('MYSQL_SSL_CA_BASE64 must contain a PEM CA certificate.');
    const folder = mkdtempSync(path.join(tmpdir(), 'mobile-shop-mysql-ca-'));
    const file = path.join(folder, 'ca.pem');
    writeFileSync(file, certificate, { mode: 0o600 });
    url.searchParams.set('sslcert', file);
    url.searchParams.set('sslaccept', 'strict');
  }
  if (
    process.env.NODE_ENV === 'production' &&
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) &&
    url.searchParams.get('sslaccept') !== 'strict'
  )
    throw new Error(
      'Hosted production MySQL requires sslaccept=strict and a trusted provider CA when needed.',
    );
  return url.toString();
}
