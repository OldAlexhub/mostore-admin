import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';
import './AdminLayout.css';
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

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/orders/summary');
      if (res.ok && res.data && res.data.counts) {
        const c = res.data.counts.new || 0;
        // notify when increased
        if (prevRef.current && c > prevRef.current) {
          toast(`طلبات جديدة: ${c - prevRef.current}`, { type: 'info' });
        }
        prevRef.current = c;
        setNewCount(c);
      }
    } catch (err) {
      // ignore
    }
  }, [toast]);

  useEffect(()=>{
    fetchSummary();
    intervalRef.current = setInterval(fetchSummary, 30000);
    return ()=> clearInterval(intervalRef.current);
  }, [fetchSummary]);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null); // 'primary' | 'marketing' | 'ops' | null

  const containerRef = useRef(null);

  useEffect(()=>{
    const onDocClick = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        setOpenGroup(null);
      }
    };
    document.addEventListener('click', onDocClick);
    return ()=> document.removeEventListener('click', onDocClick);
  }, []);

  // keyboard accessibility: Escape closes open menus
  useEffect(()=>{
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (openGroup) setOpenGroup(null);
        if (mobileOpen) setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return ()=> document.removeEventListener('keydown', onKey);
  }, [openGroup, mobileOpen]);

  const IconMenu = ({size=16}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="6" width="18" height="2" rx="1" fill="#fff"/>
      <rect x="3" y="11" width="18" height="2" rx="1" fill="#fff"/>
      <rect x="3" y="16" width="18" height="2" rx="1" fill="#fff"/>
    </svg>
  );

  const IconChevron = ({open, size=12}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{transform: open ? 'rotate(180deg)' : 'rotate(0)'}}>
      <path d="M6 9l6 6 6-6" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const IconOrder = ({size=14}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6h18" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 6v12" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 6v12" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  return (
    <div className="admin-root" dir="rtl">
      <header className="admin-header">
        <div className="brand">لوحة تحكم M&O</div>
        <div className="header-right" ref={containerRef}>
          <div className="admin-info">{admin?.username || ''} <span className="admin-role">({admin?.role || ''})</span></div>

          <button className="mobile-toggle" aria-label="Toggle menu" onClick={() => setMobileOpen(v=>!v)}>
            <IconMenu />
          </button>

          <div className="groups">
            <div className="group">
              <button
                className="group-label"
                aria-haspopup="true"
                aria-expanded={openGroup === 'primary'}
                aria-controls="dropdown-primary"
                onClick={() => setOpenGroup(openGroup === 'primary' ? null : 'primary')}
              >
                <span className="group-title">الإدارة اليومية</span>
                <IconChevron open={openGroup === 'primary'} />
              </button>
              <div id="dropdown-primary" role="menu" className={`dropdown ${openGroup === 'primary' ? 'open' : ''}`}>
                <button role="menuitem" onClick={() => { setPage('dashboard'); setOpenGroup(null); }} style={page==='dashboard' ? activeBtn : btn}>لوحة المتابعة</button>
                <button role="menuitem" onClick={() => { setPage('orders'); setOpenGroup(null); }} style={page==='orders' ? activeBtn : btn}> <IconOrder /> الطلبات {newCount>0 && <span className="badge">{newCount}</span>}</button>
                <button role="menuitem" onClick={() => { setPage('products'); setOpenGroup(null); }} style={page==='products' ? activeBtn : btn}>المنتجات</button>
              </div>
            </div>

            <div className="group">
              <button
                className="group-label"
                aria-haspopup="true"
                aria-expanded={openGroup === 'marketing'}
                aria-controls="dropdown-marketing"
                onClick={() => setOpenGroup(openGroup === 'marketing' ? null : 'marketing')}
              >
                <span className="group-title">التسويق</span>
                <IconChevron open={openGroup === 'marketing'} />
              </button>
              <div id="dropdown-marketing" role="menu" className={`dropdown ${openGroup === 'marketing' ? 'open' : ''}`}>
                <button role="menuitem" onClick={() => { setPage('promotions'); setOpenGroup(null); }} style={page==='promotions' ? activeBtn : btn}>العروض</button>
                <button role="menuitem" onClick={() => { setPage('announcements'); setOpenGroup(null); }} style={page==='announcements' ? activeBtn : btn}>الإعلانات</button>
                <button role="menuitem" onClick={() => { setPage('storeDiscount'); setOpenGroup(null); }} style={page==='storeDiscount' ? activeBtn : btn}>خصم المتجر</button>
                <button role="menuitem" onClick={() => { setPage('reports'); setOpenGroup(null); }} style={page==='reports' ? activeBtn : btn}>التقارير</button>
              </div>
            </div>

            <div className="group">
              <button
                className="group-label"
                aria-haspopup="true"
                aria-expanded={openGroup === 'ops'}
                aria-controls="dropdown-ops"
                onClick={() => setOpenGroup(openGroup === 'ops' ? null : 'ops')}
              >
                <span className="group-title">التشغيل</span>
                <IconChevron open={openGroup === 'ops'} />
              </button>
              <div id="dropdown-ops" role="menu" className={`dropdown ${openGroup === 'ops' ? 'open' : ''}`}>
                <button role="menuitem" onClick={() => { setPage('inventory'); setOpenGroup(null); }} style={page==='inventory' ? activeBtn : btn}>المخزون</button>
                {(admin && (admin.role === 'manager' || admin.role === 'superadmin')) && (
                  <button role="menuitem" onClick={() => { setPage('accounting'); setOpenGroup(null); }} style={page==='accounting' ? activeBtn : btn}>الحسابات</button>
                )}
                {admin && (admin.role === 'manager' || admin.role === 'superadmin') && (
                  <button role="menuitem" onClick={() => { setPage('users'); setOpenGroup(null); }} style={page==='users' ? activeBtn : btn}>العملاء</button>
                )}
                {(admin && admin.role === 'superadmin') && (
                  <button role="menuitem" onClick={() => { setPage('admins'); setOpenGroup(null); }} style={page==='admins' ? activeBtn : btn}>المشرفين</button>
                )}
              </div>
            </div>
          </div>

          <div className="logout-wrap">
            <button onClick={onLogout} className="logout-btn">تسجيل خروج</button>
          </div>
        </div>
      </header>

      <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`}>
        <div className="mobile-section">
          <div className="mobile-section-title">الإدارة اليومية</div>
          <button onClick={() => { setPage('dashboard'); setMobileOpen(false); }}>لوحة المتابعة</button>
          <button onClick={() => { setPage('orders'); setMobileOpen(false); }}>الطلبات {newCount>0 && <span className="badge">{newCount}</span>}</button>
          <button onClick={() => { setPage('products'); setMobileOpen(false); }}>المنتجات</button>
        </div>
        <div className="mobile-section">
          <div className="mobile-section-title">التسويق</div>
          <button onClick={() => { setPage('promotions'); setMobileOpen(false); }}>العروض</button>
          <button onClick={() => { setPage('announcements'); setMobileOpen(false); }}>الإعلانات</button>
          <button onClick={() => { setPage('storeDiscount'); setMobileOpen(false); }}>خصم المتجر</button>
          <button onClick={() => { setPage('reports'); setMobileOpen(false); }}>التقارير</button>
        </div>
        <div className="mobile-section">
          <div className="mobile-section-title">التشغيل</div>
          <button onClick={() => { setPage('inventory'); setMobileOpen(false); }}>المخزون</button>
          {(admin && (admin.role === 'manager' || admin.role === 'superadmin')) && (
            <button onClick={() => { setPage('accounting'); setMobileOpen(false); }}>الحسابات</button>
          )}
          <button onClick={() => { setPage('users'); setMobileOpen(false); }}>العملاء</button>
          {(admin && admin.role === 'superadmin') && (
            <button onClick={() => { setPage('admins'); setMobileOpen(false); }}>المشرفين</button>
          )}
        </div>
        <div className="mobile-section">
          <button onClick={() => { onLogout(); setMobileOpen(false); }} className="logout-mobile">تسجيل خروج</button>
        </div>
      </div>

      <main style={{padding:16}}>
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
