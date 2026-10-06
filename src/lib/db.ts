import { PrismaClient } from '@prisma/client';
import { mysqlDatabaseUrl } from './database-url';
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const db =
  globalDb.prisma ??
  new PrismaClient({
    log: ['error'],
    ...(process.env.DATABASE_URL
      ? { datasources: { db: { url: mysqlDatabaseUrl(process.env.DATABASE_URL) } } }
      : {}),
  });
if (process.env.NODE_ENV !== 'production') globalDb.prisma = db;
export const demoMode = () =>
  process.env.DEMO_MODE === 'true' ||
  (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production');
