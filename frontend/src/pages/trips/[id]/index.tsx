import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api } from '../../../lib/api';
import { Layout } from '../../../components/Layout';
import { Modal } from '../../../components/Modal';
import { ItemForm } from '../../../components/ItemForm';
import { CategoryPie, DailyTrend } from '../../../components/Charts';
import type { TripWithAggregates, ItineraryItem, TripSummaryAnalytics, CategoryBreakdownEntry, DailyTrendEntry, Category } from '../../../types';
import { useToast } from '../../../components/Toast';

export default function TripDetail() {
  const router = useRouter();
  const id = router.query.id as string;
  const { data: trip, mutate: mutateTrip } = useSWR<TripWithAggregates>(id? `/api/v1/trips/${id}`: null, (url: string)=> api<TripWithAggregates>(url));
  const { data: items, mutate: mutateItems } = useSWR<ItineraryItem[]>(id? `/api/v1/trips/${id}/items`: null, (url: string)=> api<ItineraryItem[]>(url));
  const { data: summaryRaw } = useSWR<TripSummaryAnalytics>(id? `/api/v1/trips/${id}/analytics/summary`: null, (url: string)=> api<TripSummaryAnalytics>(url));
  const { data: byCategoryRaw } = useSWR<CategoryBreakdownEntry[]>(id? `/api/v1/trips/${id}/analytics/by-category`: null, (url: string)=> api<CategoryBreakdownEntry[]>(url));
  const { data: dailyRaw } = useSWR<DailyTrendEntry[]>(id? `/api/v1/trips/${id}/analytics/daily-trend`: null, (url: string)=> api<DailyTrendEntry[]>(url));
  const { data: categories } = useSWR<Category[]>(`/api/v1/categories`, (url: string)=> api<Category[]>(url));
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItem, setEditItem] = useState<any|null>(null);
  // Filter state
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const { push } = useToast();
  async function deleteTrip() {
    if (!id) return;
    if (!confirm('Delete this trip and all its items? This cannot be undone.')) return;
    try {
      await api(`/api/v1/trips/${id}`, { method:'DELETE' });
      push('Trip deleted', { type:'success' });
      router.push('/');
    } catch (e:any) {
      push(e.message || 'Failed to delete', { type:'error' });
    }
  }
  const filteredItems = useMemo(()=> {
    if (!items) return [] as ItineraryItem[];
    return items.filter((it: ItineraryItem)=> {
      const dt = new Date(it.dateTime);
      if (filterFrom) { const from = new Date(filterFrom + 'T00:00:00'); if (dt < from) return false; }
      if (filterTo) { const to = new Date(filterTo + 'T23:59:59'); if (dt > to) return false; }
      if (filterLocation) { if (!it.location || !it.location.toLowerCase().includes(filterLocation.toLowerCase())) return false; }
      if (filterCategory) { if (!it.category || it.category.id !== filterCategory) return false; }
      if (filterStatus) { if (it.status !== filterStatus) return false; }
      return true;
    });
  }, [items, filterFrom, filterTo, filterLocation, filterCategory, filterStatus]);

  // Local analytics derived from filtered items; fallback to server if no filters applied
  const anyFilterActive = !!(filterFrom || filterTo || filterLocation || filterCategory || filterStatus);
  const summary = useMemo(()=> {
    if (!anyFilterActive) return summaryRaw;
  const totalExpected = filteredItems.reduce((a: number, i: ItineraryItem)=> a + Number(i.myrExpected || 0), 0);
  const totalActual = filteredItems.reduce((a: number, i: ItineraryItem)=> a + Number(i.myrActual || 0), 0);
    // Remaining only meaningful with trip budget (if trip has budgetMYR) otherwise just difference from raw summary if available
    let remaining = 0;
    if (trip?.budgetMYR != null) remaining = Number(trip.budgetMYR) - totalActual;
    else if (summaryRaw) remaining = summaryRaw.remaining - (summaryRaw.totalActual - totalActual);
    return { totalExpected, totalActual, remaining } as TripSummaryAnalytics;
  }, [anyFilterActive, filteredItems, trip?.budgetMYR, summaryRaw]);

  const byCategory = useMemo(()=> {
    if (!anyFilterActive) return byCategoryRaw;
    const map: Record<string,{ category:string; expected:number; actual:number; count:number; diff:number; }> = {};
  filteredItems.forEach((it: ItineraryItem)=> {
      const key = it.category?.name || 'Uncategorized';
      if (!map[key]) map[key] = { category:key, expected:0, actual:0, count:0, diff:0 };
      map[key].expected += Number(it.myrExpected || 0);
      map[key].actual += Number(it.myrActual || 0);
      map[key].count += 1;
    });
    return Object.values(map).map(r=> ({ ...r, diff: r.actual - r.expected }));
  }, [anyFilterActive, filteredItems, byCategoryRaw]);

  const daily = useMemo(()=> {
    if (!anyFilterActive) return dailyRaw;
    const dayMap: Record<string,{ date:string; expected:number; actual:number; }> = {};
  filteredItems.forEach((it: ItineraryItem)=> {
      const d = it.dateTime.slice(0,10);
      if (!dayMap[d]) dayMap[d] = { date:d, expected:0, actual:0 };
      dayMap[d].expected += Number(it.myrExpected || 0);
      dayMap[d].actual += Number(it.myrActual || 0);
    });
    return Object.values(dayMap).sort((a,b)=> a.date.localeCompare(b.date));
  }, [anyFilterActive, filteredItems, dailyRaw]);
  if (!id) return <Layout>Loading...</Layout>;
  return (
    <Layout title={trip? trip.name : 'Trip'}>
      <div style={{ marginBottom:'var(--space-4)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <button type='button' onClick={()=> router.push('/')} style={{ fontSize:'0.65rem' }}>&larr; Back to Trips</button>
        {trip && <div style={{ fontSize:'0.7rem', color:'var(--color-text-light)' }}>{trip.startDate && trip.endDate ? `${new Date(trip.startDate).toLocaleDateString()} – ${new Date(trip.endDate).toLocaleDateString()}`: ''}</div>}
      </div>
      <div className='row' style={{ gap:'var(--space-4)', flexWrap:'wrap', marginBottom:'var(--space-4)' }}>
        <div className='card small-padding' style={{ flex:'1 1 180px' }}>
          <div style={{ fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--color-text-light)', fontWeight:600 }}>Expected MYR</div>
          <div style={{ fontSize:'1.25rem', fontWeight:600 }}>{summary? summary.totalExpected.toFixed(2):'-'}</div>
        </div>
        <div className='card small-padding' style={{ flex:'1 1 180px' }}>
          <div style={{ fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--color-text-light)', fontWeight:600 }}>Actual MYR</div>
          <div style={{ fontSize:'1.25rem', fontWeight:600 }}>{summary? summary.totalActual.toFixed(2):'-'}</div>
        </div>
        <div className='card small-padding' style={{ flex:'1 1 180px' }}>
          <div style={{ fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--color-text-light)', fontWeight:600 }}>Remaining</div>
          <div style={{ fontSize:'1.25rem', fontWeight:600 }}>{summary? summary.remaining.toFixed(2):'-'}</div>
        </div>
      </div>
      <div className='grid' style={{ gap:'var(--space-4)', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', marginBottom:'var(--space-5)' }}>
        <div className='card'>
          <h3 style={{ marginTop:0 }}>By Category</h3>
          {byCategory? <CategoryPie data={byCategory} /> : '...'}
        </div>
        <div className='card'>
          <h3 style={{ marginTop:0 }}>Daily Trend</h3>
            {daily? <DailyTrend data={daily} /> : '...'}
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <h3 style={{ margin:0 }}>Itinerary Items</h3>
          <button type='button' className='danger' style={{ fontSize:'0.6rem', padding:'4px 8px' }} onClick={deleteTrip}>Delete Trip</button>
        </div>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          <a href={`/trips/${id}/print`} target='_blank' rel='noreferrer'>Print Items</a>
          <a href={`/trips/${id}/summary-print`} target='_blank' rel='noreferrer'>Print Summary</a>
          <a href={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}/api/v1/trips/${id}/analytics/export.csv`} target='_blank' rel='noreferrer'>CSV</a>
          <a href={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}/api/v1/trips/${id}/analytics/export.pdf`} target='_blank' rel='noreferrer'>PDF</a>
          <a href={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}/api/v1/trips/${id}/analytics/export.xlsx`} target='_blank' rel='noreferrer'>XLSX</a>
          <button onClick={()=> { setEditItem(null); setShowItemForm(true); }}>Add Item</button>
        </div>
      </div>
      {/* Filters */}
      <div className='card small-padding' style={{ marginBottom:'var(--space-3)', display:'flex', flexWrap:'wrap', gap:'0.75rem', alignItems:'flex-end' }}>
        <div style={{ display:'flex', flexDirection:'column' }}>
          <label style={{ fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>From Date</label>
          <input type='date' value={filterFrom} onChange={e=> setFilterFrom(e.target.value)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column' }}>
          <label style={{ fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>To Date</label>
          <input type='date' value={filterTo} onChange={e=> setFilterTo(e.target.value)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column' }}>
          <label style={{ fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>Location</label>
          <input type='text' placeholder='Search location' value={filterLocation} onChange={e=> setFilterLocation(e.target.value)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column' }}>
          <label style={{ fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>Category</label>
          <select value={filterCategory} onChange={e=> setFilterCategory(e.target.value)}>
            <option value=''>All</option>
            {categories?.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', flexDirection:'column' }}>
          <label style={{ fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>Status</label>
          <select value={filterStatus} onChange={e=> setFilterStatus(e.target.value)}>
            <option value=''>All</option>
            <option value='PLANNED'>Planned</option>
            <option value='BOOKED'>Booked</option>
            <option value='DONE'>Done</option>
            <option value='CANCELLED'>Cancelled</option>
          </select>
        </div>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          <button type='button' onClick={()=> { setFilterFrom(''); setFilterTo(''); setFilterLocation(''); setFilterCategory(''); setFilterStatus(''); }} style={{ fontSize:'0.6rem' }}>Clear</button>
        </div>
      </div>
      { (filterFrom || filterTo || filterLocation || filterCategory || filterStatus) && (
        <div style={{ fontSize:'0.55rem', marginBottom:'var(--space-2)', color:'var(--color-text-light)' }}>
          Filtering: {filterFrom && `from ${filterFrom} `}{filterTo && `to ${filterTo} `}{filterLocation && `location~"${filterLocation}" `}{filterCategory && `category:${categories?.find(c=> c.id===filterCategory)?.name} `}{filterStatus && `status:${filterStatus}`}
        </div>
      ) }
      <div className='stack' style={{ gap:'var(--space-2)' }}>
        {filteredItems.map((it:any)=>(
          <div key={it.id} className='card small-padding item-card'>
            <div className='item-main'>
              <div className='item-header'>
                <div className='title-block'>
                  <strong className='item-title'>{it.title}</strong>
                  <span className='item-date'>{new Date(it.dateTime).toLocaleString()}</span>
                </div>
                <span className={`badge status-${it.status}`}>{it.status}</span>
              </div>
              <div className='meta-line'>
                {it.location && <span>@ {it.location}</span>}
                {it.category && <span>#{it.category.name}</span>}
                {it.exchangeRate && it.currency !== 'MYR' && <span>FX {it.exchangeRate}{it.autoFx ? ' (auto)' : ''}</span>}
              </div>
              {it.notes && <div className='notes'>{it.notes}</div>}
              <div className='actions'>
                <button onClick={()=> { setEditItem(it); setShowItemForm(true); }}>Edit</button>
                <button className='danger' onClick={async()=> { if (confirm('Delete item?')) { await api(`/api/v1/trips/${id}/items/${it.id}`, { method:'DELETE' }); mutateItems(); mutateTrip(); } }}>Delete</button>
              </div>
            </div>
            <div className='item-costs'>
              <div className='cost-row expected'>
                <span className='label'>Expected</span>
                <span className='value'>{it.expectedCost != null ? `${it.currency} ${it.expectedCost}` : '-'}</span>
                <span className='value myr'>{it.myrExpected != null ? `MYR ${Number(it.myrExpected).toFixed(2)}` : ''}</span>
              </div>
              <div className='cost-row actual'>
                <span className='label'>Actual</span>
                <span className='value'>{it.actualCost != null ? `${it.currency} ${it.actualCost}` : '-'}</span>
                <span className='value myr'>{it.myrActual != null ? `MYR ${Number(it.myrActual).toFixed(2)}` : ''}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .item-card { display:grid; grid-template-columns: 1fr 150px; gap: var(--space-3); align-items:stretch; }
        @media (max-width: 640px) { .item-card { grid-template-columns: 1fr; } .item-costs { flex-direction:row; justify-content:space-between; } }
        .item-main { display:flex; flex-direction:column; gap: var(--space-2); }
        .item-header { display:flex; justify-content:space-between; align-items:flex-start; gap: var(--space-2); }
        .title-block { display:flex; flex-direction:column; gap:2px; min-width:0; }
        .item-title { font-size:0.9rem; line-height:1.1; word-break:break-word; }
        .item-date { font-size:0.6rem; color: var(--color-text-light); }
        .meta-line { display:flex; flex-wrap:wrap; gap:0.5rem; font-size:0.6rem; color: var(--color-text-light); }
        .notes { font-size:0.65rem; white-space:pre-wrap; background:var(--color-bg-alt); padding:4px 6px; border-radius:var(--radius-xs); border:1px solid var(--color-border-subtle); }
        .actions { display:flex; gap: var(--space-2); }
        .actions button { font-size:0.6rem; }
        .item-costs { display:flex; flex-direction:column; gap:6px; font-size:0.6rem; align-self:stretch; }
        .cost-row { display:flex; flex-direction:column; padding:4px 6px; border:1px solid var(--color-border-subtle); border-radius: var(--radius-xs); background: var(--color-bg-alt); gap:2px; }
        .cost-row.actual { background: var(--color-bg); }
        .cost-row .label { font-size:0.55rem; text-transform:uppercase; letter-spacing:0.5px; color: var(--color-text-light); }
        .cost-row .value { font-weight:500; }
        .cost-row .value.myr { font-size:0.55rem; color: var(--color-text-light); font-weight:400; }
      `}</style>
  <Modal open={showItemForm} size='lg' onClose={()=> setShowItemForm(false)} title={editItem? 'Edit Item' : 'Add Item'}>
  <ItemForm tripId={id} item={editItem} onSaved={()=> { setShowItemForm(false); mutateItems(); mutateTrip(); }} onCancel={()=> setShowItemForm(false)} categories={categories ?? []} />
      </Modal>
    </Layout>
  );
}
