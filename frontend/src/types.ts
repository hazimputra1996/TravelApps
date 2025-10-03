// Shared TypeScript interfaces for frontend

export interface ItineraryItem {
  id: string;
  title: string;
  dateTime: string;
  expectedCost?: string | number | null;
  actualCost?: string | number | null;
  currency: string;
  exchangeRate?: string | number | null; // 1 unit of currency -> MYR
  autoFx?: boolean; // true if exchangeRate auto-fetched server-side
  myrExpected?: string | number | null;
  myrActual?: string | number | null;
  status: string;
  category?: { id: string; name: string } | null;
  notes?: string | null;
  location?: string | null;
}

export interface TripWithAggregates {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  startDate?: string | null;
  endDate?: string | null;
  budgetMYR?: number | null;
  perDiemMYR?: number | null;
  createdAt: string;
  updatedAt: string;
  totalExpected?: number;
  totalActual?: number;
  items?: ItineraryItem[];
}

export interface Category {
  id: string;
  name: string;
  custom?: boolean;
}

export interface TripSummaryAnalytics {
  totalExpected: number;
  totalActual: number;
  remaining: number;
}

export interface CategoryBreakdownEntry {
  category: string;
  expected: number;
  actual: number;
  count: number;
  diff: number;
}

export interface DailyTrendEntry {
  date: string; // YYYY-MM-DD
  expected: number;
  actual: number;
}
