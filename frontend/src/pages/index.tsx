import React from 'react';
import useSWR from 'swr';
import { api } from '../lib/api';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { TripForm } from '../components/TripForm';
import type { TripWithAggregates } from '../types';

export default function Home() {
  const { data, error, mutate } = useSWR<TripWithAggregates[]>('/api/v1/trips', (url: string) => api<TripWithAggregates[]>(url));
  const [open, setOpen] = React.useState(false);
  return (
    <Layout title="Trips">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
        <h2 style={{ margin:0 }}>Trips</h2>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          <button onClick={() => mutate()} style={{ padding:'0.4rem 0.8rem' }}>Refresh</button>
          <button onClick={()=> setOpen(true)} style={{ padding:'0.4rem 0.8rem' }}>New Trip</button>
        </div>
      </div>
      {error && <div style={{ color:'red' }}>Failed to load trips</div>}
      {!data && <div>Loading...</div>}
      {data && data.length === 0 && <div>No trips yet.</div>}
      <div style={{ display:'grid', gap:'1rem' }}>
  {data?.map((t: TripWithAggregates) => {
          const itemCount = (t as any).items ? (t as any).items.length : (t as any).itemCount ?? 0;
          return (
            <a key={t.id} href={`/trips/${t.id}`} style={{ background:'#fff', padding:'1rem', borderRadius:8, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', textDecoration:'none', color:'inherit' }}>
              <h3 style={{ margin:'0 0 0.25rem' }}>{t.name}</h3>
              <div style={{ fontSize:'0.8rem', color:'#555' }}>Items: {itemCount}</div>
              <div style={{ marginTop:'0.5rem', fontSize:'0.85rem' }}>Expected MYR {Number(t.totalExpected || 0).toFixed(2)} | Actual MYR {Number(t.totalActual || 0).toFixed(2)}</div>
            </a>
          );
        })}
      </div>
      <Modal open={open} onClose={()=> setOpen(false)} title='Create Trip'>
        <TripForm onCreated={()=> mutate()} onClose={()=> setOpen(false)} />
      </Modal>
    </Layout>
  );
}

