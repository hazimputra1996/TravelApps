import { Router } from 'express';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// List all overrides (optionally filter by currency or date range)
router.get('/', asyncHandler(async (req, res) => {
  const { currency, from, to } = req.query as { currency?: string; from?: string; to?: string; };
  const where: any = {};
  if (currency) where.currency = currency.toUpperCase();
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }
  const rows = await prisma.fxRateOverride.findMany({ where, orderBy: { date: 'asc' } });
  res.json(rows.map(r => ({ ...r, rate: Number(r.rate) })));
}));

// Create or upsert override
router.post('/', asyncHandler(async (req, res) => {
  const { date, currency, rate } = req.body;
  if (!date || !currency || rate == null) return res.status(400).json({ error: 'date, currency, rate required' });
  const d = new Date(date);
  // Normalize to date only (strip time) in UTC by constructing a date at 00:00:00Z
  const dateOnly = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const cur = String(currency).toUpperCase();
  if (Number(rate) <= 0) return res.status(400).json({ error: 'rate must be > 0' });
  const created = await prisma.fxRateOverride.upsert({
    where: { date_currency: { date: dateOnly, currency: cur } },
    update: { rate: String(rate) },
    create: { date: dateOnly, currency: cur, rate: String(rate) }
  });
  res.status(201).json({ ...created, rate: Number(created.rate) });
}));

// Delete override
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.fxRateOverride.delete({ where: { id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
}));

export default router;
