import './env';
import { db } from '../src/lib/db';
import { passwordHash } from '../src/lib/security';
import { email, password } from '../src/lib/validation';
async function main() {
  const address = email.parse(process.env.ADMIN_EMAIL);
  const secret = password.parse(process.env.ADMIN_PASSWORD);
  const name = process.env.ADMIN_NAME || 'Store Administrator';
  if (await db.user.findUnique({ where: { email: address } }))
    throw new Error('Account already exists. Refusing to overwrite credentials or roles.');
  await db.user.create({
    data: {
      email: address,
      name,
      passwordHash: await passwordHash(secret),
      role: 'ADMIN',
      verified: true,
    },
  });
  console.log('Administrator created. Clear ADMIN_PASSWORD from your shell environment.');
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
