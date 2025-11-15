import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { useToast } from './Toaster';

const btn = {
  background: '#fff', border: '1px solid #ddd', padding: '6px 8px', borderRadius:6, cursor:'pointer'
};

const activeBtn = { background: '#6a3cb8', color:'#fff', border: '1px solid #5a2fb0', padding: '6px 8px', borderRadius:6, cursor:'pointer' };

const AdminLayout = ({ children, page, setPage, onLogout, admin }) => {
  const [newCount, setNewCount] = useState(0);
  const prevRef = useRef(0);
  const intervalRef = useRef(null);
  const toast = useToast();

  const fetchSummary = async () => {
    try {
      const res = await api.get('/orders/summary');
      if (res.ok && res.data && res.data.counts) {
        const c = res.data.counts.new || 0;
        // notify when increased
        if (prevRef.current && c > prevRef.current) {
          toast(`New orders: ${c - prevRef.current}`, { type: 'info' });
        }
        prevRef.current = c;
        setNewCount(c);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(()=>{
    fetchSummary();
    intervalRef.current = setInterval(fetchSummary, 30000);
    return ()=> clearInterval(intervalRef.current);
  }, []);

  return (
    <div style={{fontFamily:'Arial,Helvetica,sans-serif'}}>
      <header style={{background:'#222', color:'#fff', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div style={{fontWeight:700}}>M&O Store — Admin</div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <div style={{fontSize:13, color:'#ddd'}}>{admin?.username || ''} ({admin?.role || ''})</div>
          <button onClick={() => setPage('dashboard')} style={page==='dashboard' ? activeBtn : btn}>Dashboard</button>
          <button onClick={() => setPage('announcements')} style={page==='announcements' ? activeBtn : btn}>Announcements</button>
          <button onClick={() => setPage('products')} style={page==='products' ? activeBtn : btn}>Products</button>
          <button onClick={() => setPage('orders')} style={page==='orders' ? activeBtn : btn}>
            Orders {newCount > 0 && <span style={{marginLeft:8, background:'#ff4d4f', color:'#fff', borderRadius:12, padding:'2px 8px', fontSize:12}}>{newCount}</span>}
          </button>
          <button onClick={() => setPage('promotions')} style={page==='promotions' ? activeBtn : btn}>Promotions</button>
          {admin && (admin.role === 'manager' || admin.role === 'superadmin') && (
            <button onClick={() => setPage('users')} style={page==='users' ? activeBtn : btn}>Users</button>
          )}
          <button onClick={onLogout} style={{...btn, background:'#c0392b', color:'#fff'}}>Logout</button>
        </div>
      </header>

      <main style={{padding:16}}>
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
