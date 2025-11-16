import { useEffect, useState } from 'react';
import api from './api';
import AdminLayout from './components/AdminLayout';
import { ToasterProvider } from './components/Toaster';
import Accounting from './pages/Accounting';
import Admins from './pages/Admins';
import Announcements from './pages/Announcements';
import Dashboard from './pages/Dashboard';
import InventoryInsights from './pages/InventoryInsights';
import Login from './pages/Login';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Promotions from './pages/Promotions';
import Reports from './pages/Reports';
import Users from './pages/Users';
import StoreDiscount from './pages/StoreDiscount';

function App() {
  const [page, setPage] = useState('dashboard');
  const [admin, setAdmin] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(()=>{
    const init = async () => {
      const token = localStorage.getItem('adminToken');
      const storedAdmin = localStorage.getItem('adminUser');
      if (!token) { setCheckingAuth(false); return; }
      // set token on api immediately so requests include Authorization
      api.setToken(token);
      // restore admin optimistically from storage to avoid being shown the login screen
      if (storedAdmin) {
        try { setAdmin(JSON.parse(storedAdmin)); } catch (e) { setAdmin({ username: 'admin' }); }
      } else {
        setAdmin({ username: 'admin' });
      }

      // validate token in background using a lightweight /admins/me endpoint
      let res = await api.get('/admins/me');
      if (res.ok) {
        const actual = res.data || null;
        if (actual) { setAdmin(actual); localStorage.setItem('adminUser', JSON.stringify(actual)); }
      } else {
        // try to refresh using cookie-based refresh token flow
        try {
          const r = await api.post('/auth/refresh');
          if (r.ok) {
            // server rotated tokens and returned a token + user
            if (r.data?.token) api.setToken(r.data.token);
            const actual = r.data?.user || null;
            if (actual) { setAdmin(actual); localStorage.setItem('adminUser', JSON.stringify(actual)); }
          } else {
            const err = res.error || (res.data && (res.data.error || res.data.message)) || '';
            const shouldClear = /invalid|expired|missing|not authenticated|no refresh token|authorization token missing/i.test(String(err));
            if (shouldClear) {
              api.setToken(null);
              localStorage.removeItem('adminUser');
              setAdmin(null);
            } else {
              try { console.warn('[auth] background validation failed but keeping optimistic admin:', err); } catch (e) {}
            }
          }
        } catch (e) {
          // network error while attempting refresh — keep optimistic admin
          try { console.warn('[auth] refresh attempt failed', e && e.message); } catch (e) {}
        }
      }
      setCheckingAuth(false);
    };
    init();
  }, []);

  const onLogin = (adm) => { if (adm) localStorage.setItem('adminUser', JSON.stringify(adm)); setAdmin(adm); setPage('dashboard'); };
  const logout = () => { api.setToken(null); setAdmin(null); localStorage.removeItem('adminUser'); };

  if (checkingAuth) return <div style={{padding:20}}>Checking authentication…</div>;
  if (!admin) return <Login onLogin={onLogin} />;

  return (
    <ToasterProvider>
      <AdminLayout page={page} setPage={setPage} onLogout={logout} admin={admin}>
        {page === 'dashboard' && <Dashboard setPage={setPage} />}
        {page === 'announcements' && <Announcements setPage={setPage} admin={admin} />}
        {page === 'products' && <Products setPage={setPage} admin={admin} />}
        {page === 'orders' && <Orders setPage={setPage} admin={admin} />}
        {page === 'promotions' && <Promotions setPage={setPage} admin={admin} />}
        {page === 'reports' && <Reports setPage={setPage} admin={admin} />}
        {page === 'accounting' && <Accounting setPage={setPage} admin={admin} />}
        {page === 'admins' && <Admins setPage={setPage} admin={admin} />}
        {page === 'inventory' && <InventoryInsights setPage={setPage} admin={admin} />}
        {page === 'users' && <Users setPage={setPage} admin={admin} />}
        {page === 'storeDiscount' && <StoreDiscount setPage={setPage} admin={admin} />}
      </AdminLayout>
    </ToasterProvider>
  );
}

export default App;
