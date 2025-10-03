import { Router } from 'express';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { resolveRate } from '../services/fx.js';
// Manual FX: user supplies exchangeRate (1 unit foreign currency -> MYR)


const router = Router({ mergeParams: true });

// List items for trip
router.get('/', asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const items = await prisma.itineraryItem.findMany({ where: { tripId, deletedAt: null }, include: { category: true }, orderBy: { dateTime: 'asc' } });
  res.json(items);
}));

// Create item
router.post('/', asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const { title, dateTime, expectedCost, actualCost, currency, status, notes, categoryId, exchangeRate, location } = req.body;
  if (!title || !dateTime || !currency) return res.status(400).json({ error: 'title, dateTime, currency required' });
  const d = new Date(dateTime);
  const cur = currency.toUpperCase();
  let rate: number | null = null;
  let autoFx = false;
  if (cur === 'MYR') {
    rate = 1;
  } else if (exchangeRate != null && !isNaN(Number(exchangeRate)) && Number(exchangeRate) > 0) {
    rate = Number(exchangeRate);
  } else if (expectedCost != null || actualCost != null) {
    // Check override first (date in UTC date component)
    const dateOnly = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const override = await prisma.fxRateOverride.findUnique({ where: { date_currency: { date: dateOnly, currency: cur } } });
    if (override) {
      rate = Number(override.rate); autoFx = false; // treat override as manual deterministic
    } else {
      // attempt auto fetch via providers
      const fx = await resolveRate(cur);
      if (fx.rate) { rate = fx.rate; autoFx = true; }
      else {
        return res.status(502).json({ error: 'Live FX unavailable; please enter exchangeRate manually' });
      }
    }
  }
  const myrExpected = rate != null && expectedCost != null ? Number((Number(expectedCost) * rate).toFixed(4)) : null;
  const myrActual = rate != null && actualCost != null ? Number((Number(actualCost) * rate).toFixed(4)) : null;
  const item = await prisma.itineraryItem.create({
    data: {
      tripId,
      title,
      dateTime: d,
      expectedCost: expectedCost != null ? String(expectedCost) : undefined,
      actualCost: actualCost != null ? String(actualCost) : undefined,
      currency: cur,
      status: (status || 'Planned'),
  notes,
  location,
      categoryId,
      exchangeRate: rate != null ? String(rate) : undefined,
      autoFx,
      myrExpected: myrExpected != null ? String(myrExpected) : undefined,
      myrActual: myrActual != null ? String(myrActual) : undefined,
    },
    include: { category: true }
  });
  res.status(201).json({ ...item });
}));

// Update item
router.put('/:itemId', asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const itemId = req.params.itemId;
  const existing = await prisma.itineraryItem.findFirst({ where: { id: itemId, tripId } });
  if (!existing) return res.status(404).json({ error: 'Item not found' });
  const { title, dateTime, expectedCost, actualCost, currency, status, notes, categoryId, exchangeRate, location } = req.body;
  const newCurrency = (currency || existing.currency).toUpperCase();
  const newDate = dateTime ? new Date(dateTime) : existing.dateTime;
  let rate: number | null = null;
  let autoFx = existing.autoFx || false;
  if (newCurrency === 'MYR') {
    rate = 1; autoFx = false;
  } else if (exchangeRate != null && !isNaN(Number(exchangeRate)) && Number(exchangeRate) > 0) {
    rate = Number(exchangeRate); autoFx = false; // user provided explicit
  } else if (existing.exchangeRate != null && existing.currency === newCurrency) {
    rate = Number(existing.exchangeRate); // reuse past rate if currency unchanged
  } else {
    const dateOnly = new Date(Date.UTC(newDate.getUTCFullYear(), newDate.getUTCMonth(), newDate.getUTCDate()));
    const override = await prisma.fxRateOverride.findUnique({ where: { date_currency: { date: dateOnly, currency: newCurrency } } });
    if (override) {
      rate = Number(override.rate); autoFx = false;
    } else {
      const fx = await resolveRate(newCurrency);
      if (fx.rate) { rate = fx.rate; autoFx = true; }
    }
  }
  const resolvedExpected = expectedCost != null ? expectedCost : existing.expectedCost;
  const resolvedActual = actualCost != null ? actualCost : existing.actualCost;
  const myrExpected = rate != null && resolvedExpected != null ? Number((Number(resolvedExpected) * rate).toFixed(4)) : null;
  const myrActual = rate != null && resolvedActual != null ? Number((Number(resolvedActual) * rate).toFixed(4)) : null;
  const updated = await prisma.itineraryItem.update({
    where: { id: itemId },
    data: {
      title,
      dateTime: newDate,
      expectedCost: resolvedExpected != null ? String(resolvedExpected) : undefined,
      actualCost: resolvedActual != null ? String(resolvedActual) : undefined,
      currency: newCurrency,
      status,
  notes,
  location,
      categoryId,
      exchangeRate: rate != null ? String(rate) : undefined,
      autoFx,
      myrExpected: myrExpected != null ? String(myrExpected) : undefined,
      myrActual: myrActual != null ? String(myrActual) : undefined,
    },
    include: { category: true }
  });
  res.json({ ...updated });
}));

// Delete item
router.delete('/:itemId', asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const itemId = req.params.itemId;
  const existing = await prisma.itineraryItem.findFirst({ where: { id: itemId, tripId } });
  if (!existing) return res.status(404).json({ error: 'Item not found' });
  if (existing.deletedAt) return res.status(204).end();
  await prisma.itineraryItem.update({ where: { id: itemId }, data: { deletedAt: new Date() } });
  res.status(204).end();
}));

// Restore soft-deleted item
router.post('/:itemId/restore', asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const itemId = req.params.itemId;
  const existing = await prisma.itineraryItem.findFirst({ where: { id: itemId, tripId } });
  if (!existing) return res.status(404).json({ error: 'Item not found' });
  if (!existing.deletedAt) return res.json(existing);
  const restored = await prisma.itineraryItem.update({ where: { id: itemId }, data: { deletedAt: null } });
  res.json(restored);
}));

export default router;
