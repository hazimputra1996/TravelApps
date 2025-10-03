import React, { useEffect, useState } from 'react';

export const Layout: React.FC<{ children: React.ReactNode; title?: string; }> = ({ children, title }) => {
  const [theme, setTheme] = useState<'light'|'dark'|'system'>('system');
  // Apply theme to html dataset
  useEffect(()=> {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('theme-pref') as 'light'|'dark'|'system'|null : null;
    if (stored) setTheme(stored);
  }, []);
  useEffect(()=> {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    let effective = theme;
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      effective = mq.matches ? 'dark' : 'light';
    }
    root.dataset.theme = effective;
    localStorage.setItem('theme-pref', theme);
  }, [theme]);
  return (
    <div>
      <header style={{ background:'var(--color-primary)', color:'#fff', padding:'0.75rem 1.25rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h1 style={{ margin:0, fontSize:'1.25rem' }}>{title || 'Travel Expense Tracker'}</h1>
        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
          <a href='/' style={{ color:'#fff', fontSize:'0.65rem', textDecoration:'none' }}>Trips</a>
          <a href='/settings/fx' style={{ color:'#fff', fontSize:'0.65rem', textDecoration:'none' }}>FX Overrides</a>
          <select aria-label='Theme' value={theme} onChange={e=> setTheme(e.target.value as any)} style={{ fontSize:'0.65rem', padding:'4px 6px' }}>
            <option value='system'>System</option>
            <option value='light'>Light</option>
            <option value='dark'>Dark</option>
          </select>
        </div>
      </header>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'1rem' }}>
        {children}
      </div>
      <footer style={{ textAlign:'center', fontSize:'0.65rem', padding:'2rem 0', color:'var(--color-text-light)' }}>No login • Demo app</footer>
    </div>
  );
};
