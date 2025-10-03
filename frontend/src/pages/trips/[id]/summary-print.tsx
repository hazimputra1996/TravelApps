import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api } from '../../../lib/api';

// Align with backend /analytics/summary response field names
interface SummaryData {
  totalExpected: number;
  totalActual: number;
  remaining: number; // backend currently returns totalExpected - totalActual (not budget remaining)
  budget?: number | null; // named 'budget' on backend
  budgetRemaining?: number | null;
  budgetVariance?: number | null;
  perDiem?: number | null; // perDiemMYR equivalent
  tripDays?: number | null; // days equivalent
  perDiemTotal?: number | null;
  perDiemVariance?: number | null;
  percentActualLogged: number;
}
interface CategoryRow { category: string; expected: number; actual: number; count: number; diff: number; }
interface BudgetRow { categoryId: string; category: { name: string }; limitMYR: number; }

export default function SummaryPrintPage() {
  const router = useRouter();
  const id = router.query.id as string | undefined;
  const { data: summary, error: summaryError } = useSWR<SummaryData>(id? `/api/v1/trips/${id}/analytics/summary`: null, (u:string)=> api<SummaryData>(u));
  const { data: byCategory, error: catError } = useSWR<CategoryRow[]>(id? `/api/v1/trips/${id}/analytics/by-category`: null, (u:string)=> api<CategoryRow[]>(u));
  const { data: budgets, error: budgetError } = useSWR<BudgetRow[]>(id? `/api/v1/trips/${id}/category-budgets`: null, (u:string)=> api<BudgetRow[]>(u));
  const { data: trip, error: tripError } = useSWR<any>(id? `/api/v1/trips/${id}`: null, (u:string)=> api<any>(u));

  useEffect(()=> {
    if (summary) {
      const t = setTimeout(()=> window.print(), 500);
      return ()=> clearTimeout(t);
    }
  }, [summary]);

  return (
    <div style={{ fontFamily:'system-ui, sans-serif', padding:24, maxWidth:1000, margin:'0 auto' }}>
      <style>{`
        @media print { .no-print { display:none !important; } body { background:#fff; } }
        h1 { font-size:1.4rem; margin:0 0 4px; }
        h2 { font-size:1rem; margin:1.25rem 0 4px; }
        table { border-collapse:collapse; width:100%; font-size:0.65rem; }
        th, td { border:1px solid #ccc; padding:4px 6px; text-align:left; }
        th { background:#f5f5f5; }
        .muted { color:#666; font-size:0.6rem; }
        .grid { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); margin-top:8px; }
        .card { border:1px solid #ccc; padding:8px 10px; border-radius:6px; background:#fafafa; }
        .metric-label { font-size:0.55rem; text-transform:uppercase; letter-spacing:0.5px; color:#555; font-weight:600; }
        .metric-value { font-size:0.95rem; font-weight:600; }
      `}</style>
      <div className='no-print' style={{ display:'flex', gap:8, marginBottom:16 }}>
        <button onClick={()=> window.print()}>Print</button>
        <button onClick={()=> router.back()}>Back</button>
      </div>
      <header style={{ marginBottom:12 }}>
        <h1>{trip?.name || 'Trip Summary'}</h1>
        {(trip?.startDate || trip?.endDate) && (
          <div className='muted'>{trip.startDate} {trip.endDate? `→ ${trip.endDate}`:''}</div>
        )}
      </header>
      {!summary && !summaryError && <div>Loading…</div>}
      {summaryError && (
        <div style={{ color:'crimson', fontSize:'0.7rem', marginBottom:12 }}>
          Failed to load summary: {summaryError.message}.<br />
          This usually means the frontend couldn't reach the backend at <code>{process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}</code>.
          <ul style={{ margin:'4px 0 0 16px', padding:0 }}>
            <li>Ensure backend is running (check /health in browser).</li>
            <li>Confirm NEXT_PUBLIC_API_BASE is set correctly.</li>
            <li>If using Docker, verify ports 3000 (frontend) & 4000 (backend) are exposed.</li>
          </ul>
        </div>
      )}
      {summary && (
        <>
          <section>
            <div className='grid'>
              <div className='card'><div className='metric-label'>Expected (MYR)</div><div className='metric-value'>{summary.totalExpected?.toFixed(2)}</div></div>
              <div className='card'><div className='metric-label'>Actual (MYR)</div><div className='metric-value'>{summary.totalActual?.toFixed(2)}</div></div>
              {summary.budget != null && <div className='card'><div className='metric-label'>Budget (MYR)</div><div className='metric-value'>{summary.budget.toFixed(2)}</div></div>}
              {summary.budgetRemaining != null && <div className='card'><div className='metric-label'>Budget Remaining (MYR)</div><div className='metric-value'>{summary.budgetRemaining.toFixed(2)}</div></div>}
              {summary.remaining != null && <div className='card'><div className='metric-label'>Expected - Actual (MYR)</div><div className='metric-value'>{summary.remaining.toFixed(2)}</div></div>}
              {summary.budget && <div className='card'><div className='metric-label'>Budget Used %</div><div className='metric-value'>{(summary.totalActual / summary.budget * 100).toFixed(1)}%</div></div>}
              <div className='card'><div className='metric-label'>Actual Logged %</div><div className='metric-value'>{summary.percentActualLogged.toFixed(1)}%</div></div>
              {summary.perDiemTotal != null && <div className='card'><div className='metric-label'>Per-Diem Total</div><div className='metric-value'>{summary.perDiemTotal.toFixed(2)}</div></div>}
              {summary.perDiem != null && <div className='card'><div className='metric-label'>Per-Diem / Day</div><div className='metric-value'>{summary.perDiem.toFixed(2)}</div></div>}
              {summary.tripDays != null && <div className='card'><div className='metric-label'>Days</div><div className='metric-value'>{summary.tripDays}</div></div>}
            </div>
          </section>
          <section style={{ marginTop:24 }}>
            <h2>Category Breakdown</h2>
            <table>
              <thead><tr><th>Category</th><th>Expected (MYR)</th><th>Actual (MYR)</th><th>Expected %</th><th>Actual %</th></tr></thead>
              <tbody>
                {byCategory?.map(c => {
                  const expPct = summary.totalExpected? (c.expected / summary.totalExpected * 100) : 0;
                  const actPct = summary.totalActual? (c.actual / summary.totalActual * 100) : 0;
                  return <tr key={c.category}><td>{c.category}</td><td>{c.expected.toFixed(2)}</td><td>{c.actual.toFixed(2)}</td><td>{expPct.toFixed(1)}%</td><td>{actPct.toFixed(1)}%</td></tr>;
                })}
              </tbody>
            </table>
          </section>
          {budgets && budgets.length > 0 && (
            <section style={{ marginTop:24 }}>
              <h2>Category Budgets</h2>
              <table>
                <thead><tr><th>Category</th><th>Limit (MYR)</th><th>Used Exp (MYR)</th><th>Used Act (MYR)</th><th>Exp %</th><th>Act %</th><th>Remaining (MYR)</th></tr></thead>
                <tbody>
                  {budgets.map(b => {
                    // Derive usage by matching category name from byCategory list
                    const catAgg = byCategory?.find(c => c.category === (b.category?.name || ''));
                    const usedExp = catAgg ? catAgg.expected : 0;
                    const usedAct = catAgg ? catAgg.actual : 0;
                    const expPct = b.limitMYR? (usedExp / b.limitMYR * 100):0;
                    const actPct = b.limitMYR? (usedAct / b.limitMYR * 100):0;
                    const remaining = b.limitMYR - usedAct;
                    return <tr key={b.categoryId}><td>{b.category.name}</td><td>{b.limitMYR.toFixed(2)}</td><td>{usedExp.toFixed(2)}</td><td>{usedAct.toFixed(2)}</td><td>{expPct.toFixed(1)}%</td><td>{actPct.toFixed(1)}%</td><td>{remaining.toFixed(2)}</td></tr>;
                  })}
                </tbody>
              </table>
            </section>
          )}
          <div style={{ marginTop:32, fontSize:'0.55rem', color:'#555' }}>Generated: {new Date().toLocaleString()}</div>
        </>
      )}
    </div>
  );
}
