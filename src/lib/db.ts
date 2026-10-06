import { PrismaClient } from '@prisma/client';
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const db = globalDb.prisma ?? new PrismaClient({ log: ['error'] });
if (process.env.NODE_ENV !== 'production') globalDb.prisma = db;
export const demoMode = () =>
  process.env.DEMO_MODE === 'true' ||
  (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production');
