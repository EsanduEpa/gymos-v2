import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/master/client.js';

const [rawEmail, slug] = process.argv.slice(2);
const email = rawEmail?.trim().toLowerCase();
const password = process.env.OWNER_PASSWORD;
const masterUrl = process.env.MASTER_DATABASE_URL;

if (!email || !slug || !password || password.length < 12 || !masterUrl) {
  console.error(
    'Usage: OWNER_PASSWORD=<12+ character password> node create-owner.mjs email gym-slug',
  );
  process.exit(1);
}

const master = new PrismaClient({
  adapter: new PrismaPg({ connectionString: masterUrl }),
});

try {
  const gym = await master.gym.findUnique({ where: { slug } });

  if (!gym || gym.status !== 'ACTIVE') {
    throw new Error(`Active gym not found: ${slug}`);
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  await master.user.create({
    data: {
      email,
      passwordHash,
      gymAccesses: {
        create: { gymId: gym.id, role: 'OWNER' },
      },
    },
  });

  console.log(`Created owner ${email} for ${gym.name}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await master.$disconnect();
}
