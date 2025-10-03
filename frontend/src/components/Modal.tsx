import React from 'react';

interface ModalProps { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; }
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, size='md' }) => {
  if (!open) return null;
  const maxWidth = size === 'sm' ? 420 : size === 'md' ? 560 : size === 'lg' ? 760 : 960;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto' }}>
      <div style={{ background:'var(--color-bg,#fff)', margin:'4rem 1rem', padding:'1.25rem 1.5rem', borderRadius:12, width:'100%', maxWidth, boxShadow:'0 6px 24px -4px rgba(0,0,0,0.35)', border:'1px solid var(--color-border-subtle,#e2e2e2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
          <h3 style={{ margin:0 }}>{title}</h3>
          <button onClick={onClose} aria-label="Close" style={{ background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', lineHeight:1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};
