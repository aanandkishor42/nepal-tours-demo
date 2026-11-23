/** Public API: data, quotes and booking requests. */
import { Router } from 'express';
import { publicConfig } from '../config.js';
import { readVehicles, readRoutes, createBooking } from '../lib/storage.js';
import { calculateQuote, validateQuoteInput } from '../lib/pricing.js';
import { notifyOwner } from '../lib/notify.js';

const router = Router();

const clean = (value, max = 300) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

router.get('/config', (_req, res) => res.json(publicConfig()));

router.get('/vehicles', async (req, res, next) => {
  try {
    let vehicles = await readVehicles();
    const { type, seats, maxPrice } = req.query;

    if (type && type !== 'all') vehicles = vehicles.filter((v) => v.type === type);
    if (seats) {
      const minimum = Number(seats);
      if (Number.isFinite(minimum)) vehicles = vehicles.filter((v) => v.seats >= minimum);
    }
    if (maxPrice) {
      const ceiling = Number(maxPrice);
      if (Number.isFinite(ceiling)) vehicles = vehicles.filter((v) => v.pricePerDay <= ceiling);
    }

    res.json({ count: vehicles.length, vehicles });
  } catch (error) {
    next(error);
  }
});

router.get('/vehicles/:id', async (req, res, next) => {
  try {
    const vehicle = (await readVehicles()).find((v) => v.id === req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });
    return res.json({ vehicle });
  } catch (error) {
    return next(error);
  }
});

router.get('/routes', async (_req, res, next) => {
  try {
    const routes = await readRoutes();
    res.json({ count: routes.length, routes });
  } catch (error) {
    next(error);
  }
});

router.post('/quote', async (req, res, next) => {
  try {
    const vehicles = await readVehicles();
    const error = validateQuoteInput(req.body, vehicles);
    if (error) return res.status(400).json({ error });

    const vehicle = vehicles.find((v) => v.id === req.body.vehicleId);
    return res.json(calculateQuote(vehicle, { days: Number(req.body.days), km: Number(req.body.km) }));
  } catch (error) {
    return next(error);
  }
});

router.post('/bookings', async (req, res, next) => {
  try {
    const body = req.body || {};
    const vehicles = await readVehicles();
    const vehicle = vehicles.find((v) => v.id === body.vehicleId);
    const errors = [];

    if (clean(body.name, 80).length < 2) errors.push('Please enter your full name.');
    if (!/^[+\d][\d\s()-]{6,20}$/.test(clean(body.phone, 30))) {
      errors.push('Please enter a valid phone or WhatsApp number.');
    }
    if (!vehicle) errors.push('Please choose a valid vehicle.');
    if (body.date && Number.isNaN(Date.parse(body.date))) errors.push('Please enter a valid travel date.');
    const passengers = Number(body.passengers || 0);
    if (body.passengers && (!Number.isInteger(passengers) || passengers < 1 || passengers > 100)) {
      errors.push('Passengers must be between 1 and 100.');
    }
    if (errors.length) return res.status(400).json({ errors });

    const booking = await createBooking({
      name: clean(body.name, 80),
      phone: clean(body.phone, 30),
      email: clean(body.email, 120),
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      from: clean(body.from, 100),
      to: clean(body.to, 100),
      date: clean(body.date, 40),
      passengers: passengers || null,
      message: clean(body.message, 1000),
    });

    // Fire-and-forget: notification problems should not delay the response.
    notifyOwner(booking).catch((error) => console.warn('[notify]', error));

    return res.status(201).json({
      message: 'Dhanyabad! Your booking request has been received. We will contact you shortly.',
      booking: { id: booking.id, createdAt: booking.createdAt, status: booking.status },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
