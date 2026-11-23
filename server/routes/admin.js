/** Admin API: login, booking inbox and vehicle price editing. */
import { Router } from 'express';
import { config } from '../config.js';
import { requireAdmin, isAuthed, setSessionCookie, clearSessionCookie } from '../middleware/auth.js';
import { listBookings, deleteBooking, readVehicles, writeVehicles } from '../lib/storage.js';
import { notifyOwner, notificationStatus } from '../lib/notify.js';

const router = Router();

router.post('/login', (req, res) => {
  if ((req.body?.password || '') !== config.adminPassword) {
    return res.status(401).json({ error: 'Incorrect password. Try again.' });
  }
  setSessionCookie(res);
  return res.json({ ok: true });
});

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/session', (req, res) => res.json({ authenticated: isAuthed(req) }));

// Everything below this line requires a valid admin session.
router.use(requireAdmin);

router.get('/bookings', async (_req, res, next) => {
  try {
    res.json({ bookings: await listBookings() });
  } catch (error) {
    next(error);
  }
});

router.delete('/bookings/:id', async (req, res, next) => {
  try {
    const removed = await deleteBooking(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Booking not found.' });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.get('/notification-status', (_req, res) => res.json(notificationStatus()));

router.post('/test-notification', async (_req, res, next) => {
  try {
    const results = await notifyOwner({
      id: 'TEST-NOTIFICATION',
      isTest: true,
      name: 'Test Guest',
      phone: '+977 9800000000',
      vehicleName: 'Comfort Sedan',
      from: 'Kathmandu',
      to: 'Pokhara',
      date: new Date().toISOString().slice(0, 10),
      passengers: 2,
      message: 'This is a test. If you received it, notifications are working!',
    });
    res.json({ results, status: notificationStatus() });
  } catch (error) {
    next(error);
  }
});

router.get('/vehicles', async (_req, res, next) => {
  try {
    res.json({ vehicles: await readVehicles() });
  } catch (error) {
    next(error);
  }
});

router.patch('/vehicles/:id/prices', async (req, res, next) => {
  try {
    const perDay = Number(req.body?.pricePerDay);
    const perKm = Number(req.body?.pricePerKm);
    if (!Number.isFinite(perDay) || perDay < 0) return res.status(400).json({ error: 'Invalid day price.' });
    if (!Number.isFinite(perKm) || perKm < 0) return res.status(400).json({ error: 'Invalid km price.' });

    const vehicles = await readVehicles();
    const index = vehicles.findIndex((v) => v.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Vehicle not found.' });

    vehicles[index].pricePerDay = Math.round(perDay);
    vehicles[index].pricePerKm = Math.round(perKm);
    await writeVehicles(vehicles);
    return res.json({ vehicle: vehicles[index] });
  } catch (error) {
    return next(error);
  }
});

export default router;
