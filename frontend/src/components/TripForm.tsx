import React, { useState } from 'react';
import { api } from '../lib/api';

interface Props { onCreated: () => void; onClose: () => void; }
export const TripForm: React.FC<Props> = ({ onCreated, onClose }) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currency, setCurrency] = useState('MYR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await api('/api/v1/trips', { method:'POST', body: JSON.stringify({ name, startDate: startDate? new Date(startDate).toISOString(): undefined, endDate: endDate? new Date(endDate).toISOString(): undefined, currency }) });
      onCreated(); onClose();
    } catch (err:any) { setError(err.message); }
    finally { setLoading(false); }
  }
  return (
    <form onSubmit={submit} style={{ display:'grid', gap:'0.6rem' }}>
      {error && <div style={{ color:'red' }}>{error}</div>}
      <label style={{ display:'grid', gap:4 }}>Name <input required value={name} onChange={e=>setName(e.target.value)} /></label>
      <div style={{ display:'flex', gap:'0.5rem' }}>
        <label style={{ flex:1, display:'grid', gap:4 }}>Start <input type='date' value={startDate} onChange={e=>setStartDate(e.target.value)} /></label>
        <label style={{ flex:1, display:'grid', gap:4 }}>End <input type='date' value={endDate} onChange={e=>setEndDate(e.target.value)} /></label>
      </div>
      <label style={{ display:'grid', gap:4 }}>Currency
        <select value={currency} onChange={e=>setCurrency(e.target.value)}>
          {['MYR','USD','EUR','JPY','GBP','SGD','AUD','CNY'].map(c=> <option key={c}>{c}</option>)}
        </select>
      </label>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.5rem', marginTop:'0.5rem' }}>
        <button type='button' onClick={onClose} disabled={loading}>Cancel</button>
        <button type='submit' disabled={loading}>{loading? 'Creating...' : 'Create Trip'}</button>
      </div>
    </form>
  );
};
