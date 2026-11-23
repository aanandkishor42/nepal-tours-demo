/**
 * Express entry point. Run with: npm start
 * On platforms like Render, PORT and NODE_ENV are provided automatically.
 */
import express from 'express';
import path from 'node:path';
import { config, paths } from './config.js';
import apiRouter from './routes/api.js';
import adminRouter from './routes/admin.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // needed for correct req.ip behind Render's proxy

/* --------------------------- small safety nets --------------------------- */

app.use((_req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (config.isProduction) {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

/** Dependency-free per-IP rate limiter. */
function rateLimit(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || now > entry.reset) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }
    return next();
  };
}

app.use(express.json({ limit: '32kb' }));
app.use(
  express.static(paths.public, {
    index: false,
    maxAge: config.isProduction ? '1h' : 0,
  }),
);

/* ------------------------------- routes ---------------------------------- */

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'namaste-nepal-travels', uptime: Math.round(process.uptime()) });
});

app.post('/api/admin/login', rateLimit(10, 60_000)); // stop password guessing
app.use('/api/admin', adminRouter);

app.post('/api/bookings', rateLimit(10, 60_000)); // stop booking spam
app.use('/api', apiRouter);

app.get('/', (_req, res) => res.sendFile(path.join(paths.public, 'index.html')));
// The public demo hides this behind a private path set in ADMIN_PATH.
app.get(config.adminPath, (_req, res) => res.sendFile(path.join(paths.public, 'admin.html')));

app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));

// eslint-disable-next-line no-unused-vars -- Express requires 4 args for error middleware
app.use((error, _req, res, _next) => {
  console.error('[server]', error);
  const status = error.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Something went wrong on our side. Please try again.' : error.message,
  });
});

app.listen(config.port, () => {
  console.log(`\n  ${config.company.name} is running`);
  console.log(`  Website : http://localhost:${config.port}`);
  console.log(`  Admin   : http://localhost:${config.port}${config.adminPath}`);
  if (config.demoMode) console.log('  Mode    : client demo (admin path hidden)');
  console.log('');
});
