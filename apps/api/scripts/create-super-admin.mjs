import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/master/client.js';

const email = process.argv[2]?.trim().toLowerCase();
const password = process.env.SUPER_ADMIN_PASSWORD;
const masterUrl = process.env.MASTER_DATABASE_URL;

if (!email || !password || password.length < 12 || !masterUrl) {
  console.error(
    'Usage: SUPER_ADMIN_PASSWORD=<12+ character password> node create-super-admin.mjs email',
  );
  process.exit(1);
}

const master = new PrismaClient({
  adapter: new PrismaPg({ connectionString: masterUrl }),
});

try {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await master.user.create({
    data: { email, passwordHash, globalRole: 'SUPER_ADMIN' },
  });
  console.log(`Created Super Admin ${email}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await master.$disconnect();
}
