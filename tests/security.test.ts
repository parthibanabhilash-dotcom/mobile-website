import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  passwordHash,
  passwordMatches,
  signatureValid,
  checkOrigin,
  hash,
} from '../src/lib/security';
describe('authentication and payment signatures', () => {
  it('salts passwords and checks them without storing plaintext', async () => {
    const a = await passwordHash('correct-horse-test');
    const b = await passwordHash('correct-horse-test');
    expect(a).not.toBe(b);
    expect(a).not.toContain('correct-horse-test');
    expect(await passwordMatches('correct-horse-test', a)).toBe(true);
    expect(await passwordMatches('wrong-password', a)).toBe(false);
  });
  it('rejects modified payloads, wrong secrets and malformed signatures', () => {
    const body = 'order_123|pay_456';
    const signature = createHmac('sha256', 'test-secret').update(body).digest('hex');
    expect(signatureValid(body, signature, 'test-secret')).toBe(true);
    expect(signatureValid(`${body}x`, signature, 'test-secret')).toBe(false);
    expect(signatureValid(body, signature, 'other')).toBe(false);
    expect(signatureValid(body, 'xyz', 'test-secret')).toBe(false);
  });
  it('requires same-origin requests', () => {
    process.env.APP_URL = 'http://localhost:3000';
    expect(() =>
      checkOrigin(
        new Request('http://localhost:3000/api/cart', {
          headers: { origin: 'https://evil.example' },
        }),
      ),
    ).toThrow('Invalid request origin');
    expect(() => checkOrigin(new Request('http://localhost:3000/api/cart'))).toThrow();
    expect(() =>
      checkOrigin(
        new Request('http://localhost:3000/api/cart', {
          headers: { origin: 'http://localhost:3000' },
        }),
      ),
    ).not.toThrow();
  });
  it('uses irreversible session token digests', () => {
    expect(hash('test-token')).toHaveLength(64);
    expect(hash('test-token')).not.toBe('test-token');
  });
});
