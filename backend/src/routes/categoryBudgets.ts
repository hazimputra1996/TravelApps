import { Router } from 'express';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router({ mergeParams: true });

// List budgets for a trip
router.get('/', asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const budgets = await prisma.categoryBudget.findMany({ where: { tripId }, include: { category: true }, orderBy: { createdAt: 'asc' } });
  res.json(budgets.map(b => ({ ...b, limitMYR: Number(b.limitMYR) })));
}));

// Create budget
router.post('/', asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const { categoryId, limitMYR } = req.body;
  if (!categoryId || limitMYR == null) return res.status(400).json({ error: 'categoryId and limitMYR required' });
  const created = await prisma.categoryBudget.create({ data: { tripId, categoryId, limitMYR: String(limitMYR) }, include: { category: true } });
  res.status(201).json({ ...created, limitMYR: Number(created.limitMYR) });
}));

// Update budget
router.put('/:budgetId', asyncHandler(async (req, res) => {
  const { budgetId } = req.params;
  const { limitMYR } = req.body;
  try {
    const updated = await prisma.categoryBudget.update({ where: { id: budgetId }, data: { limitMYR: limitMYR != null ? String(limitMYR) : undefined }, include: { category: true } });
    res.json({ ...updated, limitMYR: Number(updated.limitMYR) });
  } catch {
    res.status(404).json({ error: 'Budget not found' });
  }
}));

// Delete budget
router.delete('/:budgetId', asyncHandler(async (req, res) => {
  const { budgetId } = req.params;
  try {
    await prisma.categoryBudget.delete({ where: { id: budgetId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Budget not found' });
  }
}));

export default router;