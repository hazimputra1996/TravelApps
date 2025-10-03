import { Router } from 'express';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router({ mergeParams: true });

// List templates for trip
router.get('/', asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const templates = await prisma.itemTemplate.findMany({ where: { tripId }, include: { category: true }, orderBy: { createdAt: 'asc' } });
  res.json(templates);
}));

// Create template
router.post('/', asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const { title, expectedCost, currency, exchangeRate, categoryId, location, notes, defaultStatus } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const tpl = await prisma.itemTemplate.create({
    data: {
      tripId,
      title,
      expectedCost: expectedCost != null ? String(expectedCost) : undefined,
      currency: (currency || 'MYR').toUpperCase(),
      exchangeRate: exchangeRate != null ? String(exchangeRate) : undefined,
      categoryId,
      location,
      notes,
      defaultStatus: defaultStatus || 'Planned'
    },
    include: { category: true }
  });
  res.status(201).json(tpl);
}));

// Update template
router.put('/:templateId', asyncHandler(async (req, res) => {
  const { templateId } = req.params;
  const { title, expectedCost, currency, exchangeRate, categoryId, location, notes, defaultStatus } = req.body;
  try {
    const updated = await prisma.itemTemplate.update({ where: { id: templateId }, data: {
      title,
      expectedCost: expectedCost != null ? String(expectedCost) : undefined,
      currency: currency?.toUpperCase(),
      exchangeRate: exchangeRate != null ? String(exchangeRate) : undefined,
      categoryId,
      location,
      notes,
      defaultStatus
    }, include: { category: true } });
    res.json(updated);
  } catch {
    res.status(404).json({ error: 'Template not found' });
  }
}));

// Delete template
router.delete('/:templateId', asyncHandler(async (req, res) => {
  const { templateId } = req.params;
  try {
    await prisma.itemTemplate.delete({ where: { id: templateId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Template not found' });
  }
}));

// Apply template -> create an itinerary item
router.post('/:templateId/apply', asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const { templateId } = req.params;
  const { dateTime, expectedCostOverride, statusOverride } = req.body;
  const tpl = await prisma.itemTemplate.findUnique({ where: { id: templateId } });
  if (!tpl || tpl.tripId !== tripId) return res.status(404).json({ error: 'Template not found' });
  const dt = dateTime ? new Date(dateTime) : new Date();
  // Compute MYR conversions if rate present
  let myrExpected: string | undefined = undefined;
  if (tpl.expectedCost && tpl.exchangeRate && tpl.currency !== 'MYR') {
    const base = Number(expectedCostOverride != null ? expectedCostOverride : tpl.expectedCost);
    const rate = Number(tpl.exchangeRate);
    myrExpected = (base * rate).toFixed(4);
  } else if (tpl.currency === 'MYR') {
    const base = Number(expectedCostOverride != null ? expectedCostOverride : tpl.expectedCost || 0);
    myrExpected = base ? base.toFixed(4) : undefined;
  }
  const item = await prisma.itineraryItem.create({ data: {
    tripId,
    title: tpl.title,
    dateTime: dt,
    expectedCost: expectedCostOverride != null ? String(expectedCostOverride) : tpl.expectedCost || undefined,
    currency: tpl.currency,
    exchangeRate: tpl.exchangeRate || undefined,
    myrExpected: myrExpected,
    status: statusOverride || tpl.defaultStatus || 'Planned',
    categoryId: tpl.categoryId || undefined,
    location: tpl.location || undefined,
    notes: tpl.notes || undefined
  }, include: { category: true } });
  res.status(201).json(item);
}));

export default router;