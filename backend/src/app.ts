import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import tripsRouter from './routes/trips.js';
import categoriesRouter from './routes/categories.js';
import itemsRouter from './routes/items.js';
import analyticsRouter from './routes/analytics.js';
import categoryBudgetsRouter from './routes/categoryBudgets.js';
import templatesRouter from './routes/templates.js';
import fxOverridesRouter from './routes/fxOverrides.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(morgan('dev'));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api/v1/trips', tripsRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/trips/:tripId/items', itemsRouter);
app.use('/api/v1/trips/:tripId/analytics', analyticsRouter);
app.use('/api/v1/trips/:tripId/budgets', categoryBudgetsRouter);
app.use('/api/v1/trips/:tripId/templates', templatesRouter);
app.use('/api/v1/fx-overrides', fxOverridesRouter);

app.get('/api/v1', (_req: Request, res: Response) => {
  res.json({ message: 'API v1 root', time: new Date().toISOString() });
});

// Not found handler
app.use((req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next();
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err); // basic logging
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

export default app;
