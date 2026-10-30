import { config } from 'dotenv';
import { assertTestDatabaseUrl } from './testDatabase';

config({ path: '.env.test' });
assertTestDatabaseUrl(process.env.DATABASE_URL);
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
process.env.PUBLIC_SITE_URL = 'http://localhost:4173';
process.env.BOOKING_ABUSE_SECRET = 'synthetic-test-secret-at-least-32-characters';
