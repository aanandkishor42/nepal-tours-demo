/**
 * Owner notifications. All channels are optional and best-effort: a broken
 * credential never blocks a booking. Configure the ones you actually use in
 * .env, then verify them from the admin dashboard ("Send test notification").
 *
 * Supported WhatsApp routes:
 *  1. Meta WhatsApp Cloud API   — WHATSAPP_CLOUD_TOKEN + WHATSAPP_PHONE_NUMBER_ID
 *  2. CallMeBot (free, personal) — WHATSAPP_CALLMEBOT_KEY + COMPANY_WHATSAPP
 *  3. Any webhook (Make/Zapier/n8n) — NOTIFICATION_WEBHOOK_URL
 * Email: SMTP_HOST + OWNER_EMAIL (+ SMTP_PORT/USER/PASS for authenticated SMTP).
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { config, paths } from '../config.js';

const logFile = path.join(paths.data, 'notifications.log');

function bookingMessage(booking) {
  const lines = [
    booking.isTest ? '✅ TEST NOTIFICATION' : `New booking request — ${booking.id}`,
    '',
    `Name: ${booking.name}`,
    `Phone: ${booking.phone}`,
    booking.email ? `Email: ${booking.email}` : null,
    `Vehicle: ${booking.vehicleName || booking.vehicleId || '—'}`,
    `Route: ${booking.from || '—'} → ${booking.to || '—'}`,
    `Date: ${booking.date || 'Flexible'}`,
    `Passengers: ${booking.passengers || '—'}`,
    booking.message ? `Message: ${booking.message}` : null,
    '',
    `— ${config.company.name}`,
  ];
  return lines.filter(Boolean).join('\n');
}

async function logResult(channel, status, detail = '') {
  const line = `${new Date().toISOString()} [${channel}] ${status} ${detail}\n`;
  try {
    await fs.mkdir(path.dirname(logFile), { recursive: true });
    await fs.appendFile(logFile, line, 'utf8');
  } catch (error) {
    console.warn('[notify] could not write log:', error.message);
  }
}

/* ----------------------------- WhatsApp ---------------------------------- */

async function sendWhatsAppCloud(booking) {
  const { whatsappToken, whatsappPhoneId } = config.notifications;
  if (!whatsappToken || !whatsappPhoneId) return;
  const response = await fetch(
    `https://graph.facebook.com/v20.0/${whatsappPhoneId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: config.company.whatsapp,
        type: 'text',
        text: { body: bookingMessage(booking) },
      }),
    },
  );
  if (!response.ok) throw new Error(`Meta API ${response.status}: ${(await response.text()).slice(0, 180)}`);
}

async function sendCallMeBot(booking) {
  const { callmebotKey } = config.notifications;
  if (!callmebotKey || !config.company.whatsapp) return;
  const url = new URL('https://api.callmebot.com/whatsapp.php');
  url.searchParams.set('phone', config.company.whatsapp);
  url.searchParams.set('text', bookingMessage(booking));
  url.searchParams.set('apikey', callmebotKey);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`CallMeBot ${response.status}`);
  const body = await response.text();
  if (/error|invalid|denied/i.test(body)) throw new Error(body.slice(0, 150));
}

async function sendWebhook(booking) {
  const { webhookUrl } = config.notifications;
  if (!webhookUrl) return;
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: booking.isTest ? 'test' : 'new_booking',
      text: bookingMessage(booking),
      booking,
      company: config.company,
    }),
  });
  if (!response.ok) throw new Error(`Webhook ${response.status}`);
}

/* -------------------------------- Email ---------------------------------- */

async function sendEmail(booking) {
  const n = config.notifications;
  if (!n.smtpHost || !n.ownerEmail) return;

  const { default: nodemailer } = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: n.smtpHost,
    port: n.smtpPort,
    secure: n.smtpPort === 465,
    auth: n.smtpUser ? { user: n.smtpUser, pass: n.smtpPass } : undefined,
  });
  await transporter.sendMail({
    from: n.smtpUser || `"${config.company.name}" <no-reply@localhost>`,
    to: n.ownerEmail,
    subject: booking.isTest
      ? `Test email from ${config.company.name}`
      : `New booking ${booking.id} — ${booking.name}`,
    text: bookingMessage(booking),
  });
}

/* ------------------------------- public API ------------------------------ */

export function notificationStatus() {
  const n = config.notifications;
  return {
    whatsappCloud: Boolean(n.whatsappToken && n.whatsappPhoneId),
    callmebot: Boolean(n.callmebotKey && config.company.whatsapp),
    webhook: Boolean(n.webhookUrl),
    email: Boolean(n.smtpHost && n.ownerEmail),
  };
}

/** Send through every configured channel; returns a per-channel result map. */
export async function notifyOwner(booking) {
  const channels = [
    ['whatsappCloud', sendWhatsAppCloud],
    ['callmebot', sendCallMeBot],
    ['webhook', sendWebhook],
    ['email', sendEmail],
  ];

  const results = {};
  await Promise.all(
    channels.map(async ([name, send]) => {
      if (!notificationStatus()[name]) {
        results[name] = { status: 'skipped', message: 'Not configured in .env' };
        return;
      }
      try {
        await send(booking);
        results[name] = { status: 'sent', message: 'Delivered' };
        await logResult(name, 'OK', booking.id);
      } catch (error) {
        results[name] = { status: 'failed', message: error.message };
        await logResult(name, 'FAIL', `${booking.id} ${error.message}`);
        console.warn(`[notify] ${name} failed:`, error.message);
      }
    }),
  );
  return results;
}
