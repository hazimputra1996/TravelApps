import { Router } from 'express';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// List categories
router.get('/', asyncHandler(async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json(categories);
}));

// Create (custom) category
router.post('/', asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const cat = await prisma.category.create({ data: { name, custom: true } });
    res.status(201).json(cat);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Category name exists' });
    throw e;
  }
}));

export default router;
