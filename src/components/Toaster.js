import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ToastContext = createContext(null);

export const ToasterProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, opts = {}) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type: opts.type || 'info', duration: opts.duration || 4000 };
    setToasts(t => [toast, ...t]);
    return id;
  }, []);

  const remove = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  useEffect(() => {
    const timers = toasts.map(t => {
      if (!t.duration) return null;
      return setTimeout(() => remove(t.id), t.duration);
    }).filter(Boolean);
    return () => timers.forEach(clearTimeout);
  }, [toasts, remove]);

  return (
    <ToastContext.Provider value={{ push, remove }}>
      {children}
      <div style={{position:'fixed', right:20, top:20, zIndex:9999}}>
        {toasts.map(t => (
          <div key={t.id} style={{minWidth:220, marginBottom:8, padding:10, borderRadius:6, boxShadow:'0 2px 8px rgba(0,0,0,0.12)', background: t.type==='error' ? '#ffe6e6' : (t.type==='success' ? '#e6ffef' : '#ffffff'), border: t.type==='error' ? '1px solid #ffb3b3' : '1px solid #e6f3ea'}}>
            <div style={{fontSize:13, color: t.type==='error' ? '#8b0000' : '#0a5f32'}}>{t.message}</div>
            <div style={{marginTop:6, textAlign:'right'}}>
              <button onClick={() => remove(t.id)} className="btn btn-sm btn-link" style={{padding:0}}>إغلاق</button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast لازم يكون جوا ToasterProvider');
  return ctx.push;
};

export default ToasterProvider;
