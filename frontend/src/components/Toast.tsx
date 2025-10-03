import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface Toast { id: string; message: string; type?: 'success' | 'error' | 'info'; ttl: number; }
interface ToastContextValue { push: (msg: string, opts?: { type?: Toast['type']; ttl?: number }) => void; }

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside <ToastProvider>');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, any>>({});

  const remove = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
    if (timers.current[id]) { clearTimeout(timers.current[id]); delete timers.current[id]; }
  }, []);

  const push = useCallback((message: string, opts?: { type?: Toast['type']; ttl?: number }) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, message, type: opts?.type || 'info', ttl: opts?.ttl || 3500 };
    setToasts(t => [...t, toast]);
    timers.current[id] = setTimeout(()=> remove(id), toast.ttl);
  }, [remove]);

  useEffect(()=> () => { Object.values(timers.current).forEach(clearTimeout); }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div style={{ position:'fixed', zIndex:9999, top:10, right:10, display:'flex', flexDirection:'column', gap:8, maxWidth:280 }}>
        {toasts.map(t=> (
          <div key={t.id} onClick={()=> remove(t.id)} style={{ cursor:'pointer', fontSize:'0.75rem', lineHeight:1.3, padding:'8px 10px', borderRadius:6, background:getBg(t.type), color:'#fff', boxShadow:'var(--shadow-md)', transition:'opacity 120ms' }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

function getBg(type?: Toast['type']) {
  switch(type) {
    case 'success': return 'var(--color-success)';
    case 'error': return 'var(--color-danger)';
    case 'info': default: return 'var(--color-primary)';
  }
}
