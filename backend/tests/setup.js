// Runs before every test file. Refuses to touch anything but a dedicated test database.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';

const url = process.env.DATABASE_URL_TEST;
if (!url || !/test/i.test(url)) {
  throw new Error('Set DATABASE_URL_TEST to a dedicated database whose name contains "test".');
}
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = url;
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('base64url'); // fresh per run
process.env.RATE_LIMIT_AUTH_MAX = '1000';
process.env.RATE_LIMIT_GLOBAL_MAX = '100000';
process.env.MAX_FAILED_LOGINS = '5';
process.env.COOKIE_SECURE = 'false';
