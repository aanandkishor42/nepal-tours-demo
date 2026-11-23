/**
 * Tiny JSON-file store. Writes are queued and atomic (write to .tmp, then rename)
 * so a crash mid-write cannot corrupt the bookings file.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { paths } from '../config.js';

let writeQueue = Promise.resolve();

async function readJson(file, fallback) {
  try {
    const text = await fs.readFile(file, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(fallback, null, 2), 'utf8');
      return fallback;
    }
    throw error;
  }
}

function writeJson(file, value) {
  // Serialise all writes across the process to avoid lost updates.
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(temp, JSON.stringify(value, null, 2), 'utf8');
    await fs.rename(temp, file);
  });
  return writeQueue;
}

export const listBookings = () => readJson(paths.bookings, []);

export async function createBooking(fields) {
  const bookings = await listBookings();
  const booking = {
    id: `NNT-${randomUUID().slice(0, 8).toUpperCase()}`,
    status: 'new',
    createdAt: new Date().toISOString(),
    ...fields,
  };
  await writeJson(paths.bookings, [booking, ...bookings]);
  return booking;
}

export async function deleteBooking(id) {
  const bookings = await listBookings();
  const next = bookings.filter((b) => b.id !== id);
  if (next.length === bookings.length) return false;
  await writeJson(paths.bookings, next);
  return true;
}

export const readVehicles = () => readJson(paths.vehicles, []);
export const writeVehicles = (vehicles) => writeJson(paths.vehicles, vehicles);
export const readRoutes = () => readJson(paths.routes, []);
