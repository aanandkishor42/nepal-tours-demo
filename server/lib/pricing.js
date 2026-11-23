/**
 * All price logic lives here so the website, quote API and admin panel agree.
 * Money is always stored/calculated as integer NPR, then converted for display.
 */
import { config } from '../config.js';

const DRIVER_ALLOWANCE_PER_DAY = 1500; // NPR, charged when driverIncluded is false

export const roundNPR = (amount) => Math.round(amount);

export function toUSD(npr) {
  return Math.round((npr / config.usdRate) * 100) / 100;
}

export function money(npr, currency = 'NPR') {
  if (currency === 'USD') return `$${toUSD(npr).toLocaleString('en-US')}`;
  return `NPR ${roundNPR(npr).toLocaleString('en-NP')}`;
}

/**
 * Quote formula:
 *   (pricePerDay × days) + (pricePerKm × km) + optional driver allowance
 *   − multi-day discount (5% for 3–6 days, 10% for 7+ days)
 * Tolls, parking, night halt and VAT are intentionally excluded (shown as a note).
 */
export function calculateQuote(vehicle, { days, km }) {
  const dailyCost = roundNPR(vehicle.pricePerDay * days);
  const distanceCost = roundNPR((vehicle.pricePerKm || 0) * km);
  const driverCost = vehicle.driverIncluded ? 0 : DRIVER_ALLOWANCE_PER_DAY * days;
  const subtotal = dailyCost + distanceCost + driverCost;
  const discountRate = days >= 7 ? 0.1 : days >= 3 ? 0.05 : 0;
  const discount = roundNPR(subtotal * discountRate);
  const total = subtotal - discount;

  return {
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    days,
    km,
    breakdown: {
      dailyCost,
      distanceCost,
      driverCost,
      discount,
      discountPercent: discountRate * 100,
    },
    subtotal,
    total,
    totalNPR: total,
    totalUSD: toUSD(total),
    currency: { nprPerUsd: config.usdRate },
    excluded: ['Tolls', 'Parking', 'Night halt', 'VAT', 'Permits where applicable'],
  };
}

/** Basic validation for /api/quote. Returns an error string or null. */
export function validateQuoteInput(body, vehicles) {
  const days = Number(body?.days);
  const km = Number(body?.km);
  const vehicle = vehicles.find((v) => v.id === body?.vehicleId);

  if (!vehicle) return 'Please choose a valid vehicle.';
  if (!Number.isInteger(days) || days < 1 || days > 90) return 'Days must be a whole number between 1 and 90.';
  if (!Number.isFinite(km) || km < 0 || km > 10000) return 'Distance must be between 0 and 10,000 km.';
  return null;
}
