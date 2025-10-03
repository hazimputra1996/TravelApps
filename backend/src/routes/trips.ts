import { Router } from 'express';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// List trips with aggregate (expected / actual totals)
router.get('/', asyncHandler(async (_req, res) => {
  const trips = await prisma.trip.findMany({ include: { items: { where: { deletedAt: null } } }, orderBy: { createdAt: 'desc' } });
  const mapped = trips.map(t => {
    const totalExpected = t.items.reduce((a: number, i: any) => a + Number(i.myrExpected || 0), 0);
    const totalActual = t.items.reduce((a: number, i: any) => a + Number(i.myrActual || 0), 0);
    return { ...t, totalExpected, totalActual };
  });
  res.json(mapped);
}));

// Create trip
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, startDate, endDate, currency, budgetMYR, perDiemMYR } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const trip = await prisma.trip.create({ data: { name, description, startDate, endDate, budgetMYR, perDiemMYR, currency: (currency || 'MYR').toUpperCase() } });
  res.status(201).json(trip);
}));

// Get single trip with items & categories
router.get('/:id', asyncHandler(async (req, res) => {
  const trip = await prisma.trip.findUnique({ where: { id: req.params.id }, include: { items: { where:{ deletedAt: null }, include: { category: true }, orderBy: { dateTime: 'asc' } } } });
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json(trip);
}));

// Update trip
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, description, startDate, endDate, currency, budgetMYR, perDiemMYR } = req.body;
  try {
    const trip = await prisma.trip.update({ where: { id: req.params.id }, data: { name, description, startDate, endDate, budgetMYR, perDiemMYR, currency: currency?.toUpperCase() } });
    res.json(trip);
  } catch (e) {
    res.status(404).json({ error: 'Trip not found' });
  }
}));

// Delete trip (cascade handled by foreign keys / prisma referential actions if set)
router.delete('/:id', asyncHandler(async (req, res) => {
  try {
    await prisma.trip.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    res.status(404).json({ error: 'Trip not found' });
  }
}));

export default router;
