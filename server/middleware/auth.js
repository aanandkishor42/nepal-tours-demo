/**
 * Password-protected admin using a signed, httpOnly session cookie.
 * No third-party session store needed — the cookie contains only an expiry
 * timestamp plus an HMAC signature made with SESSION_SECRET.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';

const COOKIE_NAME = 'nnt_admin';
const SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours

const sign = (payload) =>
  createHmac('sha256', config.sessionSecret).update(payload).digest('base64url');

const makeToken = () => {
  const payload = String(Date.now() + SESSION_MS);
  return `${payload}.${sign(payload)}`;
};

const tokenIsValid = (token) => {
  if (!token || typeof token !== 'string') return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  const expiry = Number(payload);
  return Number.isFinite(expiry) && expiry > Date.now();
};

function readCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header.split(';').map((pair) => {
      const index = pair.indexOf('=');
      const key = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      return [key, decodeURIComponent(value)];
    }),
  );
}

export const isAuthed = (req) => tokenIsValid(readCookies(req)[COOKIE_NAME]);

export function requireAdmin(req, res, next) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Please log in to continue.' });
  return next();
}

const cookieAttributes = () =>
  [
    `HttpOnly`,
    `Path=/`,
    `SameSite=Lax`,
    `Max-Age=${SESSION_MS / 1000}`,
    config.isProduction ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');

export function setSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${makeToken()}; ${cookieAttributes()}`);
}

export function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${
      config.isProduction ? '; Secure' : ''
    }`,
  );
}
