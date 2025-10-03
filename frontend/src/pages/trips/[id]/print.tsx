import React from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api } from '../../../lib/api';
import type { TripWithAggregates, ItineraryItem } from '../../../types';

export default function PrintItinerary() {
  const router = useRouter();
  const id = router.query.id as string;
  const { data: trip } = useSWR<TripWithAggregates>(id? `/api/v1/trips/${id}`: null, (url: string)=> api<TripWithAggregates>(url));
  if (!trip) return <div style={{ padding:'2rem', fontFamily:'var(--font-stack)' }}>Loading...</div>;
  return (
    <div style={{ fontFamily:'var(--font-stack)', padding:'2rem', maxWidth:1000, margin:'0 auto' }}>
	<h1 style={{ marginTop:0 }}>{trip.name}</h1>
      <div style={{ fontSize:'0.8rem', marginBottom:'1rem', color:'var(--color-text-light)' }}>Printed on {new Date().toLocaleString()}</div>
      <table>
        <thead>
          <tr>
            <th>Date/Time</th>
            <th>Title</th>
            <th>Expected</th>
            <th>Actual</th>
            <th>Location</th>
            <th>MYR</th>
            <th style={{ width:'30%' }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {trip.items?.map((i: ItineraryItem)=>(
            <tr key={i.id}>
              <td style={{ fontSize:'0.65rem' }}>{new Date(i.dateTime).toLocaleString()}</td>
              <td>{i.title}</td>
              <td>{i.expectedCost ?? '-' } {i.currency}</td>
              <td>{i.actualCost ?? '-' } {i.currency}</td>
              <td>{i.location || ''}</td>
              <td>{i.myrActual ?? i.myrExpected ?? '-'}</td>
              <td style={{ whiteSpace:'pre-wrap' }}>{i.notes || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <style>{`@media print { a, button { display:none !important;} body { background:#fff;} h1 { margin-bottom:0.5rem;} }`}</style>
    </div>
  );
}
