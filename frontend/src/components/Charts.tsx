import React from 'react';
import { Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale } from 'chart.js';
ChartJS.register(ArcElement, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale);

export const CategoryPie: React.FC<{ data: { category:string; expected:number; actual:number; }[] }> = ({ data }) => {
  const pieData = {
    labels: data.map(d=>d.category),
    datasets: [{
      label: 'Actual MYR',
      data: data.map(d=>d.actual),
      backgroundColor: data.map((_d,i)=> `hsl(${(i*63)%360} 70% 55%)`)
    }]
  };
  return <Pie data={pieData} />;
};

export const DailyTrend: React.FC<{ data: { date:string; actual:number; expected:number; }[] }> = ({ data }) => {
  const lineData = {
    labels: data.map(d=>d.date),
    datasets: [
      { label:'Expected', data: data.map(d=>d.expected), borderColor:'#888', backgroundColor:'#8883', tension:0.25 },
      { label:'Actual', data: data.map(d=>d.actual), borderColor:'#0d6efd', backgroundColor:'#0d6efd44', tension:0.25 }
    ]
  };
  return <Line data={lineData} />;
};
