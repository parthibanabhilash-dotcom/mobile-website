import { it, expect, afterEach, vi } from 'vitest';
import { mysqlDatabaseUrl } from '../src/lib/database-url';
afterEach(() => vi.unstubAllEnvs());
it('accepts local MySQL and rejects the old PostgreSQL provider', () => {
  expect(mysqlDatabaseUrl('mysql://mobile:fixture@127.0.0.1:3307/mobile_shop', '')).toContain(
    'mysql://',
  );
  expect(() => mysqlDatabaseUrl('postgresql://localhost/mobile_shop', '')).toThrow('mysql://');
});
it('requires strict certificate verification for hosted production connections', () => {
  vi.stubEnv('NODE_ENV', 'production');
  expect(() => mysqlDatabaseUrl('mysql://fixture:fixture@example.test/mobile_shop', '')).toThrow(
    'sslaccept=strict',
  );
  expect(
    mysqlDatabaseUrl('mysql://fixture:fixture@example.test/mobile_shop?sslaccept=strict', ''),
  ).toContain('sslaccept=strict');
});
it('rejects malformed or oversized provider CA configuration', () => {
  expect(() => mysqlDatabaseUrl('mysql://localhost/mobile_shop', 'not-a-certificate')).toThrow(
    'PEM CA',
  );
  expect(() => mysqlDatabaseUrl('mysql://localhost/mobile_shop', 'x'.repeat(100001))).toThrow(
    'too large',
  );
});
