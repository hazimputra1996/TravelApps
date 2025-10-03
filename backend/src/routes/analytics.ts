import { Router } from 'express';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { stringify } from 'csv-stringify';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

const router = Router({ mergeParams: true });

router.get('/summary', asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { items: { where: { deletedAt: null } } } });
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  const totalExpected = trip.items.reduce((a, i) => a + Number(i.myrExpected || 0), 0);
  const totalActual = trip.items.reduce((a, i) => a + Number(i.myrActual || 0), 0);
  const remaining = totalExpected - totalActual;
  const budget = trip.budgetMYR ? Number(trip.budgetMYR) : null;
  const budgetRemaining = budget != null ? budget - totalActual : null;
  const budgetVariance = budget != null ? totalActual - budget : null; // positive = overspend
  const start = trip.startDate; const end = trip.endDate;
  let tripDays: number | null = null;
  if (start && end) {
    tripDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  }
  const perDiem = trip.perDiemMYR ? Number(trip.perDiemMYR) : null;
  const perDiemTotal = perDiem != null && tripDays != null ? perDiem * tripDays : null;
  const perDiemVariance = perDiemTotal != null ? totalActual - perDiemTotal : null;
  const itemsWithActual = trip.items.filter((i: any) => i.myrActual != null).length;
  const percentActualLogged = trip.items.length ? (itemsWithActual / trip.items.length) * 100 : 0;
  res.json({ totalExpected, totalActual, remaining, budget, budgetRemaining, budgetVariance, perDiem, tripDays, perDiemTotal, perDiemVariance, percentActualLogged });
}));

router.get('/by-category', asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const items = await prisma.itineraryItem.findMany({ where: { tripId, deletedAt: null }, include: { category: true } });
  const map: Record<string, { expected: number; actual: number; count: number; }> = {};
  for (const i of items) {
    const name = i.category?.name || 'Uncategorized';
    if (!map[name]) map[name] = { expected: 0, actual: 0, count: 0 };
    map[name].expected += Number(i.myrExpected || 0);
    map[name].actual += Number(i.myrActual || 0);
    map[name].count += 1;
  }
  const data = Object.entries(map).map(([category, v]) => ({ category, ...v, diff: v.actual - v.expected }));
  res.json(data);
}));

router.get('/daily-trend', asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const items = await prisma.itineraryItem.findMany({ where: { tripId, deletedAt: null } });
  const map: Record<string, { expected: number; actual: number; }> = {};
  for (const i of items) {
    const date = i.dateTime.toISOString().slice(0, 10);
    if (!map[date]) map[date] = { expected: 0, actual: 0 };
    map[date].expected += Number(i.myrExpected || 0);
    map[date].actual += Number(i.myrActual || 0);
  }
  const data = Object.entries(map).map(([date, v]) => ({ date, ...v }));
  data.sort((a, b) => a.date.localeCompare(b.date));
  res.json(data);
}));

router.get('/export.csv', asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { items: { where:{ deletedAt: null }, include: { category: true }, orderBy: { dateTime: 'asc' } } } });
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="trip-${tripId}.csv"`);
  const stringifier = stringify({ header: true, columns: ['Title','DateTime','Category','Location','Expected','Actual','Currency','MYR Expected','MYR Actual','Status','Notes'] });
  stringifier.pipe(res);
  for (const i of trip.items) {
    stringifier.write([
      i.title,
      i.dateTime.toISOString(),
      i.category?.name || '',
  i.location || '',
  i.expectedCost ?? '',
  i.actualCost ?? '',
  i.currency,
  i.myrExpected ?? '',
  i.myrActual ?? '',
  i.status,
  (i.notes || '').replace(/\n/g, ' ')
    ]);
  }
  stringifier.end();
}));

router.get('/export.pdf', asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { items: { where:{ deletedAt: null }, include: { category: true }, orderBy: { dateTime: 'asc' } } } });
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="trip-${tripId}.pdf"`);
  doc.pipe(res);
  doc.fontSize(20).text(`Trip: ${trip.name}`, { underline: true });
  if (trip.description) doc.moveDown(0.5).fontSize(10).text(trip.description);
  doc.moveDown();
  for (const i of trip.items) {
  doc.fontSize(12).text(`${i.dateTime.toISOString().slice(0,16).replace('T',' ')}  ${i.title}`);
    doc.fontSize(9).text(`Category: ${i.category?.name || 'N/A'}  Status: ${i.status}`);
  if (i.location) doc.fontSize(9).text(`Location: ${i.location}`);
  doc.fontSize(9).text(`Expected: ${i.expectedCost ?? '-'} ${i.currency} (MYR ${i.myrExpected ?? '-'})   Actual: ${i.actualCost ?? '-'} ${i.currency} (MYR ${i.myrActual ?? '-'})`);
    if (i.notes) doc.fontSize(8).fillColor('#555').text(i.notes).fillColor('black');
    doc.moveDown(0.7);
  }
  doc.end();
}));

router.get('/export.xlsx', asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      items: { where: { deletedAt: null }, include: { category: true }, orderBy: { dateTime: 'asc' } },
      categoryBudgets: { include: { category: true } }
    }
  });
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  // Build aggregates
  const totalExpected = trip.items.reduce((a, i) => a + Number(i.myrExpected || 0), 0);
  const totalActual = trip.items.reduce((a, i) => a + Number(i.myrActual || 0), 0);
  const budget = trip.budgetMYR ? Number(trip.budgetMYR) : null;
  const remaining = totalExpected - totalActual;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Travel Expense Tracker';
  workbook.created = new Date();

  // Summary sheet
  const summary = workbook.addWorksheet('Summary');
  summary.addRows([
    ['Trip Name', trip.name],
    ['Description', trip.description || ''],
    ['Start Date', trip.startDate ? trip.startDate.toISOString().slice(0,10) : ''],
    ['End Date', trip.endDate ? trip.endDate.toISOString().slice(0,10) : ''],
    ['Budget (MYR)', budget ?? ''],
    ['Total Expected (MYR)', totalExpected],
    ['Total Actual (MYR)', totalActual],
    ['Remaining (Expected-Actual)', remaining],
    ['Per Diem (MYR)', trip.perDiemMYR ? Number(trip.perDiemMYR) : ''],
  ]);

  // Items sheet
  const itemsSheet = workbook.addWorksheet('Items');
  itemsSheet.columns = [
    { header: 'Title', key: 'title', width: 28 },
    { header: 'Date/Time', key: 'dateTime', width: 20 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Location', key: 'location', width: 16 },
    { header: 'Expected', key: 'expected', width: 12 },
    { header: 'Actual', key: 'actual', width: 12 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'MYR Expected', key: 'myrExpected', width: 14 },
    { header: 'MYR Actual', key: 'myrActual', width: 14 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Notes', key: 'notes', width: 30 }
  ];
  trip.items.forEach(i => {
    itemsSheet.addRow({
      title: i.title,
      dateTime: i.dateTime.toISOString(),
      category: i.category?.name || '',
      location: i.location || '',
      expected: i.expectedCost ?? '',
      actual: i.actualCost ?? '',
      currency: i.currency,
      myrExpected: i.myrExpected ?? '',
      myrActual: i.myrActual ?? '',
      status: i.status,
      notes: i.notes || ''
    });
  });

  // Category sheet
  const categorySheet = workbook.addWorksheet('Categories');
  categorySheet.columns = [
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Expected (MYR)', key: 'expected', width: 18 },
    { header: 'Actual (MYR)', key: 'actual', width: 16 },
    { header: 'Diff (Actual-Expected)', key: 'diff', width: 22 }
  ];
  const categoryAgg: Record<string, { expected:number; actual:number; }> = {};
  for (const i of trip.items) {
    const nm = i.category?.name || 'Uncategorized';
    if (!categoryAgg[nm]) categoryAgg[nm] = { expected:0, actual:0 };
    categoryAgg[nm].expected += Number(i.myrExpected || 0);
    categoryAgg[nm].actual += Number(i.myrActual || 0);
  }
  Object.entries(categoryAgg).forEach(([name, v]) => categorySheet.addRow({ category: name, expected: v.expected, actual: v.actual, diff: v.actual - v.expected }));

  // Budgets sheet
  const budgetsSheet = workbook.addWorksheet('Budgets');
  budgetsSheet.columns = [
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Limit (MYR)', key: 'limit', width: 14 },
    { header: 'Spent (MYR)', key: 'spent', width: 14 },
    { header: 'Remaining (MYR)', key: 'remaining', width: 18 }
  ];
  for (const b of trip.categoryBudgets) {
    const nm = b.category.name;
    const agg = categoryAgg[nm] || { expected:0, actual:0 };
    const limit = Number(b.limitMYR);
    budgetsSheet.addRow({ category: nm, limit, spent: agg.actual, remaining: limit - agg.actual });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="trip-${tripId}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}));

export default router;
