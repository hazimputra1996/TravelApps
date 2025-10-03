import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Props { tripId: string; onSaved: () => void; item?: any; onCancel: () => void; categories: { id:string; name:string }[]; }
export const ItemForm: React.FC<Props> = ({ tripId, onSaved, item, onCancel, categories }) => {
  const [title, setTitle] = useState(item?.title || '');
  const [dateTime, setDateTime] = useState(item? new Date(item.dateTime).toISOString().slice(0,16) : new Date().toISOString().slice(0,16));
  const [expectedCost, setExpectedCost] = useState(item?.expectedCost || '');
  const [actualCost, setActualCost] = useState(item?.actualCost || '');
  const [currency, setCurrency] = useState(item?.currency || 'MYR');
  const [exchangeRate, setExchangeRate] = useState(item?.exchangeRate || ''); // 1 unit foreign -> MYR
  const [categoryId, setCategoryId] = useState(item?.categoryId || '');
  const [status, setStatus] = useState(item?.status || 'Planned');
  const [notes, setNotes] = useState(item?.notes || '');
  const [location, setLocation] = useState(item?.location || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  useEffect(()=>{ setError(null); }, [title, expectedCost, actualCost]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
  const payload:any = { title, dateTime: new Date(dateTime).toISOString(), currency, status, notes: notes||undefined, location: location||undefined };
    if (expectedCost !== '') payload.expectedCost = Number(expectedCost);
    if (actualCost !== '') payload.actualCost = Number(actualCost);
    if (categoryId) payload.categoryId = categoryId;
  if (currency !== 'MYR' && exchangeRate !== '') payload.exchangeRate = Number(exchangeRate);
    try {
      if (item) await api(`/api/v1/trips/${tripId}/items/${item.id}`, { method:'PUT', body: JSON.stringify(payload) });
      else await api(`/api/v1/trips/${tripId}/items`, { method:'POST', body: JSON.stringify(payload) });
      onSaved();
    } catch (err:any) {
      if (err?.status === 502 || /Live FX unavailable/i.test(err?.message)) {
        setError('Live FX rate service is temporarily unavailable. Please enter an exchange rate manually (1 '+currency+' = ? MYR).');
      } else {
        setError(err.message || 'Failed to save');
      }
    }
    finally { setLoading(false); }
  }
  return (
    <form onSubmit={submit} className='item-form-root'>
      {error && <div className='form-error'>{error}</div>}
      <fieldset className='two-col'>
        <label htmlFor='item-title'>Title
          <input id='item-title' required value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setTitle(e.target.value)} placeholder='e.g. Flight to Tokyo' />
        </label>
        <label htmlFor='item-datetime'>Date / Time
          <input id='item-datetime' type='datetime-local' required value={dateTime} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setDateTime(e.target.value)} />
        </label>
      </fieldset>
      <fieldset className='two-col'>
        <label htmlFor='item-expected'>Expected
          <input id='item-expected' type='number' step='0.01' value={expectedCost} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setExpectedCost(e.target.value)} placeholder='0.00' />
        </label>
        <label htmlFor='item-actual'>Actual
          <input id='item-actual' type='number' step='0.01' value={actualCost} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setActualCost(e.target.value)} placeholder='0.00' />
        </label>
      </fieldset>
      <fieldset className='two-col'>
        <label htmlFor='item-currency'>Currency
          <select id='item-currency' value={currency} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setCurrency(e.target.value)}>
            {['MYR','USD','EUR','JPY','GBP','SGD','AUD','CNY'].map((c: string)=> <option key={c}>{c}</option>)}
          </select>
        </label>
        <label htmlFor='item-status'>Status
          <select id='item-status' value={status} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setStatus(e.target.value)}>
            {['Planned','Booked','Paid'].map((s: string)=> <option key={s}>{s}</option>)}
          </select>
        </label>
      </fieldset>
      {currency !== 'MYR' && (
        <fieldset>
          <div className='field'>
            <label htmlFor='item-fx'>FX Rate (1 {currency} = ? MYR) <span style={{ fontWeight:400, textTransform:'none', fontSize:'0.6rem' }}>(leave blank to auto fetch)</span></label>
            <input id='item-fx' type='number' step='0.0001' value={exchangeRate} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setExchangeRate(e.target.value)} placeholder='e.g. 4.6500' />
            <div style={{ fontSize:'0.55rem', color:'var(--color-text-light)', marginTop:4 }}>Auto uses live rate from exchangerate.host (cached 10m).</div>
          </div>
        </fieldset>
      )}
      <fieldset className='two-col'>
        <label htmlFor='item-category'>Category
          <select id='item-category' value={categoryId} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setCategoryId(e.target.value)}>
            <option value=''>-- none --</option>
            {categories.map((c: {id:string; name:string})=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label htmlFor='item-location'>Location
          <input id='item-location' value={location} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setLocation(e.target.value)} placeholder='City / Place' />
        </label>
      </fieldset>
      <fieldset>
        <div className='field'>
          <label htmlFor='item-notes'>Notes</label>
          <textarea id='item-notes' value={notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)=>setNotes(e.target.value)} rows={3} placeholder='Extra details, booking ref...' />
        </div>
      </fieldset>
      <div className='form-actions'>
        <button type='button' onClick={onCancel} disabled={loading}>Cancel</button>
        <button className='primary' type='submit' disabled={loading}>{loading? 'Saving...' : (item? 'Update Item' : 'Add Item')}</button>
      </div>
      <style jsx>{`
    .item-form-root { display:flex; flex-direction:column; gap: var(--space-3); }
        fieldset { border:0; padding:0; margin:0; }
    .two-col { display:grid; gap: var(--space-3); grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); }
    label { display:flex; flex-direction:column; gap:4px; font-size:0.65rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color: var(--color-text-light); }
    input, select, textarea { width:100%; font:inherit; padding:6px 8px; border:1px solid var(--color-border); border-radius:4px; background:var(--color-bg-alt); line-height:1.3; }
        input:focus, select:focus, textarea:focus { outline:2px solid var(--color-accent); outline-offset:1px; }
        textarea { resize: vertical; }
    .form-actions { display:flex; justify-content:flex-end; gap: var(--space-2); margin-top: var(--space-2); }
        .form-error { background: var(--color-danger-bg, #ffe9e9); color: var(--color-danger, #c62828); padding:6px 8px; border-radius:4px; font-size:0.7rem; }
      `}</style>
    </form>
  );
};
