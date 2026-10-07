import { describe, it, expect, afterEach, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  passwordHash,
  passwordMatches,
  signatureValid,
  checkOrigin,
  hash,
} from '../src/lib/security';
describe('authentication and payment signatures', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('accepts exact configured Vercel domains and rejects unrelated or spoofed hosts', () => {
    vi.stubEnv('APP_URL', 'https://old-shop.vercel.app/');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'mobile-website-film9.vercel.app');
    vi.stubEnv('VERCEL_URL', 'mobile-website-deployment.vercel.app');
    for (const host of [
      'mobile-website-film9.vercel.app',
      'mobile-website-deployment.vercel.app',
    ]) {
      expect(() =>
        checkOrigin(
          new Request(`https://${host}/api/auth/register`, {
            headers: { origin: `https://${host}` },
          }),
        ),
      ).not.toThrow();
    }
    for (const origin of [
      'https://other-project.vercel.app',
      'http://mobile-website-film9.vercel.app',
      'null',
    ]) {
      expect(() =>
        checkOrigin(
          new Request('https://mobile-website-film9.vercel.app/api/auth/register', {
            headers: {
              origin,
              host: 'other-project.vercel.app',
              'x-forwarded-host': 'other-project.vercel.app',
            },
          }),
        ),
      ).toThrow('Invalid request origin');
    }
    vi.stubEnv('VERCEL', '');
    expect(() =>
      checkOrigin(
        new Request('https://mobile-website-film9.vercel.app/api/auth/register', {
          headers: { origin: 'https://mobile-website-film9.vercel.app' },
        }),
      ),
    ).toThrow('Invalid request origin');
  });
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
