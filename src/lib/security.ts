import {
  randomBytes,
  createHash,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHmac,
} from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { db } from './db';
const scrypt = promisify(scryptCallback);
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export const secretToken = () => randomBytes(32).toString('hex');
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
export async function passwordMatches(password: string, stored: string) {
  const [salt, value] = stored.split(':');
  if (!salt || !value) return false;
  const key = (await scrypt(password, salt, 64)) as Buffer;
  const compare = Buffer.from(value, 'hex');
  return key.length === compare.length && timingSafeEqual(key, compare);
}
export function signatureValid(body: string, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(body).digest();
  const got = Buffer.from(signature, 'hex');
  return got.length === expected.length && timingSafeEqual(expected, got);
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function currentUser() {
  const token = (await cookies()).get('mobile_session')?.value;
  if (!token || !process.env.DATABASE_URL) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const { passwordHash: _, ...user } = session.user;
  return user;
}
export async function requireUser(admin = false) {
  const user = await currentUser();
  if (!user) throw new HttpError(401, 'Please sign in to continue.');
  if (admin && user.role !== 'ADMIN') throw new HttpError(403, 'Administrator access required.');
  return user;
}
export async function createSession(userId: string) {
  const token = secretToken();
  const days = Math.min(30, Math.max(1, Number(process.env.SESSION_DAYS) || 7));
  await db.session.create({
    data: { userId, tokenHash: hash(token), expiresAt: new Date(Date.now() + days * 86400000) },
  });
  (await cookies()).set('mobile_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: days * 86400,
  });
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const allowed = new Set([new URL(process.env.APP_URL || 'http://localhost:3000').origin]);
  // Trust deployment configuration, never client-supplied Host/forwarding headers.
  if (process.env.VERCEL === '1') {
    for (const host of [
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
      process.env.VERCEL_URL,
      process.env.VERCEL_BRANCH_URL,
    ]) {
      if (host && /^[a-z0-9.-]+$/i.test(host)) allowed.add(new URL(`https://${host}`).origin);
    }
  }
  if (!origin || !allowed.has(origin)) throw new HttpError(403, 'Invalid request origin.');
}
export async function rateLimit(key: string, limit = 10, seconds = 900) {
  const now = new Date();
  const expiresAt = new Date(Date.now() + seconds * 1000);
  const count = await db.$transaction(async (tx) => {
    await tx.$executeRaw`INSERT INTO \`RateLimit\` (\`key\`, \`count\`, \`expiresAt\`) VALUES (${key}, 1, ${expiresAt}) ON DUPLICATE KEY UPDATE \`count\` = IF(\`expiresAt\` < ${now}, 1, \`count\` + 1), \`expiresAt\` = IF(\`expiresAt\` < ${now}, ${expiresAt}, \`expiresAt\`)`;
    const result = await tx.rateLimit.findUniqueOrThrow({ where: { key } });
    return result.count;
  });
  if (count > limit) throw new HttpError(429, 'Too many attempts. Please try again later.');
}
