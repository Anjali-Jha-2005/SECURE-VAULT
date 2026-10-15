// Creates (or promotes) an admin user from environment variables. No default credentials.
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { passwordPolicyIssues } from '../src/validators/password.js';

const prisma = new PrismaClient();
const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to seed an admin user.');
  process.exit(1);
}
const issues = passwordPolicyIssues(password);
if (issues.length) {
  console.error('SEED_ADMIN_PASSWORD rejected:', issues.join('; '));
  process.exit(1);
}

const passwordHash = await argon2.hash(password, {
  type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1,
});
await prisma.user.upsert({
  where: { email },
  update: { role: 'ADMIN', status: 'ACTIVE' },
  create: { name: 'Administrator', email, passwordHash, role: 'ADMIN' },
});
console.log(`Admin user ready: ${email}`);
await prisma.$disconnect();
