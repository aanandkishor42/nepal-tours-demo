/**
 * Central configuration. All settings come from .env (see .env.example).
 * Keeping this in one place means no other file needs to touch process.env.
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(serverDir, '..');

export const paths = {
  root: rootDir,
  public: path.join(rootDir, 'public'),
  data: path.join(rootDir, 'data'),
  vehicles: path.join(rootDir, 'server', 'data', 'vehicles.json'),
  routes: path.join(rootDir, 'server', 'data', 'routes.json'),
  bookings: path.join(rootDir, 'data', 'bookings.json'),
};

const numberFromEnv = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeAdminPath = (value) => {
  const path = String(value || '/admin').trim();
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
};

const isProduction = process.env.NODE_ENV === 'production';
const adminPassword = process.env.ADMIN_PASSWORD || 'change-this-password';
const sessionSecret = process.env.SESSION_SECRET || 'dev-only-secret-change-me';

// A public demo with the example credentials is an open door. Refuse to boot
// in production until they are replaced.
if (isProduction && (adminPassword === 'change-this-password' || sessionSecret === 'dev-only-secret-change-me')) {
  throw new Error(
    'Set ADMIN_PASSWORD and SESSION_SECRET to strong, unique values before deploying. ' +
    'See DEPLOY.md for a copy-paste generator.',
  );
}

export const config = {
  port: numberFromEnv(process.env.PORT, 3000),
  isProduction,
  usdRate: numberFromEnv(process.env.USD_RATE, 133), // NPR per 1 USD
  adminPassword,
  sessionSecret,
  demoMode: process.env.DEMO_MODE === 'true',
  // Change this to a private path (e.g. /manage-x7k2) for a client demo.
  adminPath: normalizeAdminPath(process.env.ADMIN_PATH || '/admin'),

  company: {
    name: process.env.COMPANY_NAME || 'Namaste Nepal Travels',
    tagline: process.env.COMPANY_TAGLINE || 'Your Himalayan Journey, Our Local Expertise',
    city: process.env.COMPANY_CITY || 'Kathmandu',
    address: process.env.COMPANY_ADDRESS || 'Bhagwan Bahal, Thamel, Kathmandu, Nepal',
    phone: process.env.COMPANY_PHONE || '+977 1 4700 125',
    whatsapp: (process.env.COMPANY_WHATSAPP || '9779800000000').replace(/\D/g, ''),
    email: process.env.COMPANY_EMAIL || 'hello@namastenepaltravels.com',
    license: process.env.COMPANY_LICENSE || 'Tourism License No. 12345',
    mapEmbed:
      process.env.GOOGLE_MAPS_EMBED ||
      'https://www.google.com/maps?q=Thamel,Kathmandu,Nepal&output=embed',
  },

  notifications: {
    whatsappToken: process.env.WHATSAPP_CLOUD_TOKEN || '',
    whatsappPhoneId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    callmebotKey: process.env.WHATSAPP_CALLMEBOT_KEY || '',
    webhookUrl: process.env.NOTIFICATION_WEBHOOK_URL || '',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: numberFromEnv(process.env.SMTP_PORT, 587),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    ownerEmail: process.env.OWNER_EMAIL || '',
  },
};

/** Public-safe subset of config, exposed at GET /api/config. */
export const publicConfig = () => ({
  company: config.company,
  usdRate: config.usdRate,
});
