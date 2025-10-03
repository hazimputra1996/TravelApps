import React, { useState } from 'react';
import useSWR from 'swr';
import { api } from '../../lib/api';
import { Layout } from '../../components/Layout';

interface FxOverride { id: string; date: string; currency: string; rate: number; }
interface FormState { date: string; currency: string; rate: string; }

export default function FxOverridesPage() {
  const { data, mutate } = useSWR<FxOverride[]>(
    '/api/v1/fx-overrides',
    (u: string) => api<FxOverride[]>(u)
  );
  const [form, setForm] = useState<FormState>({ date:'', currency:'USD', rate:'' });
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await api('/api/v1/fx-overrides', { method:'POST', body: JSON.stringify({ ...form, rate: Number(form.rate) }) });
  setForm((f: FormState)=> ({ ...f, rate:'' }));
      mutate();
    } catch (e:any) { setError(e.message); } finally { setLoading(false); }
  }
  async function remove(id: string) {
    if (!confirm('Delete override?')) return;
    await api(`/api/v1/fx-overrides/${id}`, { method:'DELETE' });
    mutate();
  }
  return (
    <Layout title='FX Overrides'>
      <h2>FX Rate Overrides</h2>
      <p style={{ fontSize:'0.7rem', lineHeight:1.4 }}>Define fixed MYR conversion rates for specific calendar dates (UTC) and currencies. When adding or updating an item whose date falls on an override date and matches the currency, the override rate is used instead of a live lookup. Useful for locking in trip budgets or using an official published rate.</p>
      <form onSubmit={submit} style={{ display:'flex', flexWrap:'wrap', gap:'0.75rem', alignItems:'flex-end', marginBottom:'1rem' }}>
        <label style={{ fontSize:'0.6rem', textTransform:'uppercase', display:'flex', flexDirection:'column', gap:4 }}>Date
          <input
            type='date'
            required
            value={form.date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((f: FormState) => ({ ...f, date: e.target.value }))
            }
          />
        </label>
        <label style={{ fontSize:'0.6rem', textTransform:'uppercase', display:'flex', flexDirection:'column', gap:4 }}>Currency
          <select
            required
            value={form.currency}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setForm((f: FormState) => ({ ...f, currency: e.target.value.toUpperCase() }))
            }
          >
            {['USD','EUR','JPY','GBP','SGD','AUD','CNY','MYR'].map(c=> <option key={c}>{c}</option>)}
          </select>
        </label>
        <label style={{ fontSize:'0.6rem', textTransform:'uppercase', display:'flex', flexDirection:'column', gap:4 }}>Rate (1 CUR = X MYR)
          <input
            type='number'
            step='0.0001'
            required
            value={form.rate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((f: FormState) => ({ ...f, rate: e.target.value }))
            }
            placeholder='4.7000'
          />
        </label>
        <button type='submit' disabled={loading}>{loading? 'Saving…':'Add / Update'}</button>
        {error && <span style={{ color:'crimson', fontSize:'0.65rem' }}>{error}</span>}
      </form>
      <table style={{ borderCollapse:'collapse', width:'100%', fontSize:'0.65rem' }}>
        <thead>
          <tr style={{ background:'var(--color-bg-alt)' }}>
            <th style={{ textAlign:'left', padding:4 }}>Date (UTC)</th>
            <th style={{ textAlign:'left', padding:4 }}>Currency</th>
            <th style={{ textAlign:'left', padding:4 }}>Rate (MYR)</th>
            <th style={{ padding:4 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.length? data.map(o=> (
            <tr key={o.id}>
              <td style={{ padding:4 }}>{o.date.slice(0,10)}</td>
              <td style={{ padding:4 }}>{o.currency}</td>
              <td style={{ padding:4 }}>{o.rate}</td>
              <td style={{ padding:4, textAlign:'center' }}><button style={{ fontSize:'0.55rem' }} onClick={()=> remove(o.id)}>Delete</button></td>
            </tr>
          )): (
            <tr><td style={{ padding:4 }} colSpan={4}>No overrides</td></tr>
          )}
        </tbody>
      </table>
    </Layout>
  );
}
