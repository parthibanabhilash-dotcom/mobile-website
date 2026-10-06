import './env';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { mysqlDatabaseUrl } from '../src/lib/database-url';
if (process.env.DATABASE_URL) process.env.DATABASE_URL = mysqlDatabaseUrl(process.env.DATABASE_URL);
const result = spawnSync(
  process.execPath,
  [path.resolve('node_modules/prisma/build/index.js'), ...process.argv.slice(2)],
  { stdio: 'inherit', env: process.env },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
