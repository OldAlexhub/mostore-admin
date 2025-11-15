import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';

const STATUS_OPTIONS = ['pending','paid','processing','shipped','delivered','cancelled','refunded'];

const OrderModal = ({ order, onClose, onChangeStatus, onReload }) => {
  if (!order) return null;
  const shipping = order.shipping || {
    address: order.userDetails?.Address || order.userDetails?.address || '',
    phone: order.userDetails?.phoneNumber || order.userDetails?.phone || '',
    email: order.userDetails?.email || ''
  };
  const items = order.items || (Array.isArray(order.products) ? order.products.map(p=>({
    productId: p.product,
    Name: p.productDetails?.Name || p.productDetails?.name || '',
    price: p.productDetails?.Sell ?? p.productDetails?.sell ?? 0,
    quantity: p.quantity || 1,
    imageUrl: p.productDetails?.imageUrl || p.productDetails?.image || ''
  })) : []);

  return (
    <div style={{position:'fixed', inset:0, zIndex:1050}}>
      <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.4)'}} onClick={onClose} />
      <div style={{position:'relative', maxWidth:900, margin:'40px auto', background:'#fff', borderRadius:8, padding:20, zIndex:1060}}>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h5>Order #{order._id.slice(-8)}</h5>
            <div className="text-muted">{new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <div>
            {order.coupon?.code && (
              <button className="btn btn-sm btn-outline-danger me-2" onClick={async ()=>{
                if (!window.confirm('Remove coupon from this order?')) return;
                try {
                  const res = await api.post(`/orders/${order._id}/remove-coupon`);
                  if (res.ok) {
                    alert('Coupon removed');
                    // refresh modal data by reloading order from server; prefer parent-provided onReload
                    try {
                      const fresh = await api.get(`/orders/${order._id}`);
                      if (fresh.ok) {
                        if (typeof onReload === 'function') {
                          await onReload(order._id);
                        } else {
                          Object.assign(order, fresh.data);
                        }
                      }
                    } catch (e) {
                      // ignore
                    }
                  } else {
                    alert(res.error || 'Failed to remove coupon');
                  }
                } catch (err) {
                  alert('Failed to remove coupon');
                }
              }}>Remove coupon</button>
            )}
            <button className="btn btn-sm btn-outline-secondary me-2" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="row mt-3">
          <div className="col-md-6">
            <h6>Customer</h6>
            <div><strong>{order.userDetails?.username || order.user || '—'}</strong></div>
            <div className="text-muted">Email: {shipping.email || '—'}</div>
            <div className="text-muted">Phone: {shipping.phone || '—'}</div>
            <div className="mt-2"><strong>Shipping Address</strong>
              <div className="text-muted">{shipping.address || '—'}</div>
            </div>
            {order.shipping?.notes && <div className="mt-2"><strong>Notes</strong><div className="text-muted">{order.shipping.notes}</div></div>}
          </div>
          <div className="col-md-6">
            <h6>Payment & Status</h6>
            <div className="mb-2">Total: <strong>ج.م {order.totalPrice}</strong></div>
            {order.originalTotalPrice != null && (
              <div className="mb-1 text-muted">Original: <del>ج.م {order.originalTotalPrice}</del></div>
            )}
            {order.discountAmount > 0 && (
              <div className="mb-1 text-success">Discount: <strong>-ج.م {order.discountAmount}</strong></div>
            )}
            {order.coupon?.code && (
              <div className="mb-2"><small className="badge bg-info text-dark">Coupon: {order.coupon.code}</small></div>
            )}
            <div className="mb-2">Status: <strong>{order.status}</strong></div>
            <div className="mb-2">Payment method: <strong>{order.payment?.method || order.paymentMethod || '—'}</strong></div>
            {order.payment?.transactionId && <div className="mb-2">Transaction: <strong>{order.payment.transactionId}</strong></div>}
            <div className="mt-2">
              <label className="form-label">Change status</label>
              <select className="form-select" value={order.status} onChange={(e)=>onChangeStatus(order._id, e.target.value)}>
                {STATUS_OPTIONS.map(s=> <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <h6>Items</h6>
          {items && items.length ? (
            items.map(it=> (
              <div key={it._id || it.productId} className="d-flex align-items-center" style={{padding:8, borderBottom:'1px solid #f2f2f2'}}>
                <div style={{width:64, height:64, marginRight:12, background:'#fafafa', display:'flex', alignItems:'center', justifyContent:'center'}}>
                  {it.imageUrl ? <img src={it.imageUrl} alt={it.Name || ''} style={{maxWidth:'100%', maxHeight:'100%'}} /> : <div style={{fontSize:11,color:'#999'}}>No image</div>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700}}>{it.Name || it.productName} <span className="text-muted" style={{fontWeight:400}}>×{it.quantity}</span></div>
                  <div className="text-muted">ج.م {it.price} each</div>
                </div>
                <div style={{width:120, textAlign:'right'}}>ج.م {(it.price * (it.quantity||1)).toFixed(2)}</div>
              </div>
            ))
          ) : <div className="text-muted">No items</div>}
        </div>
      </div>
    </div>
  );
};

const Orders = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(30);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('new');
  const [summary, setSummary] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);

  const toast = useToast();

  const buildQueryForTab = (tab, p = 1) => {
    const qs = new URLSearchParams();
    qs.set('page', p);
    qs.set('limit', limit);
    if (tab === 'new') {
      // server will treat 'since' to return recent pending orders
      const windowMin = 15; // match server default window
      const since = new Date(Date.now() - windowMin * 60 * 1000).toISOString();
      qs.set('status', 'pending');
      qs.set('since', since);
    } else if (tab === 'pending') {
      qs.set('status', 'pending');
    } else if (tab === 'completed') {
      qs.set('status', 'shipped,delivered');
    } else if (tab === 'cancelled') {
      qs.set('status', 'cancelled');
    }
    return qs.toString();
  };

  const loadSummary = async () => {
    try {
      const res = await api.get('/orders/summary');
      if (res.ok) setSummary(res.data);
    } catch (err) {
      // ignore
    }
  };

  const load = async (p = 1, tab = activeTab) => {
    setLoading(true);
    const q = buildQueryForTab(tab, p);
    const res = await api.get(`/orders?${q}`);
    if (res.ok) {
      const items = Array.isArray(res.data) ? res.data : (res.data.orders || []);
      setList(items);
      const t = res.data?.total ?? items.length;
      setTotal(t);
    } else {
      setList([]);
      setTotal(0);
    }
    setLoading(false);
  };

  useEffect(()=>{ loadSummary(); load(1, activeTab); }, []);

  useEffect(()=>{
    // when activeTab changes, reload
    load(1, activeTab);
  }, [activeTab]);

  useEffect(()=>{
    if (!autoRefresh) return;
    intervalRef.current = setInterval(()=>{
      loadSummary();
      load(page, activeTab);
    }, 30000);
    return ()=> clearInterval(intervalRef.current);
  }, [autoRefresh, page, activeTab]);

  const open = async (o) => {
    setSelected(o);
    // mark as seen by admin
    try {
      if (!o.adminSeen) {
        await api.put(`/orders/${o._id}`, { adminSeen: true, adminSeenAt: new Date().toISOString() });
        setList(l => l.map(it => it._id === o._id ? { ...it, adminSeen: true, adminSeenAt: new Date().toISOString() } : it));
      }
    } catch (err) {
      // ignore marking error
    }
  };
  const close = () => setSelected(null);

  const changeStatus = async (id, status) => {
    const res = await api.put(`/orders/${id}`, { status });
    if (res.ok) {
      // optimistic update in UI
      setList(l => l.map(it => it._id === id ? { ...it, status } : it));
      if (selected && selected._id === id) setSelected(s => ({ ...s, status }));
      loadSummary();
    } else {
      toast(res.error || 'Failed to update status', { type: 'error' });
    }
  };

  const prevPage = () => { if (page<=1) return; const np = page-1; setPage(np); load(np, activeTab); };
  const nextPage = () => { const max = Math.ceil((total||list.length)/limit); if (page>=max) return; const np = page+1; setPage(np); load(np, activeTab); };

  return (
    <div className="container-admin">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">Orders</h3>
        <div className="d-flex align-items-center">
          <div className="me-3 text-muted">Auto-refresh</div>
          <div className="form-check form-switch me-3">
            <input className="form-check-input" type="checkbox" checked={autoRefresh} onChange={(e)=>setAutoRefresh(e.target.checked)} />
          </div>
          <button className="btn btn-outline-secondary me-2" onClick={()=>{ loadSummary(); load(page, activeTab); }}>Refresh</button>
        </div>
      </div>

      <div className="mb-3">
        <div className="btn-group" role="group">
          <button className={`btn btn-sm ${activeTab==='new' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={()=>setActiveTab('new')}>New {summary?.counts?.new ? `(${summary.counts.new})` : ''}</button>
          <button className={`btn btn-sm ${activeTab==='pending' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={()=>setActiveTab('pending')}>Pending {summary?.counts?.pending ? `(${summary.counts.pending})` : ''}</button>
          <button className={`btn btn-sm ${activeTab==='completed' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={()=>setActiveTab('completed')}>Completed {((summary?.counts?.shipped||0)+(summary?.counts?.delivered||0)) ? `(${(summary.counts.shipped||0)+(summary.counts.delivered||0)})` : ''}</button>
          <button className={`btn btn-sm ${activeTab==='cancelled' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={()=>setActiveTab('cancelled')}>Cancelled {summary?.counts?.cancelled ? `(${summary.counts.cancelled})` : ''}</button>
        </div>
      </div>

      {loading && <div>Loading…</div>}
      {!loading && list.length===0 && <div className="text-muted">No orders</div>}

      {!loading && list.map(o=> (
        <div key={o._id} className="mb-2 p-2" style={{border:'1px solid #eee', borderRadius:6, background: o.adminSeen ? '#fff' : '#fffef6'}}>
            <div className="d-flex justify-content-between">
            <div>
              <div style={{fontWeight:700}}>#{o._id.slice(-8)} — {o.userDetails?.username || o.user || 'guest'}</div>
              <div className="text-muted">{new Date(o.createdAt).toLocaleString()}</div>
              <div className="text-muted">{o.shipping?.phone ? `Phone: ${o.shipping.phone}` : (o.userDetails?.phone ? `Phone: ${o.userDetails.phone}` : '')}</div>
              <div className="text-muted">{o.shipping?.addressLine1 || o.shipping?.address || ''} {o.shipping?.city ? `, ${o.shipping.city}` : ''}</div>
              {o.coupon?.code && <div style={{marginTop:6}}><small className="badge bg-info text-dark">Coupon: {o.coupon.code} — -ج.م {o.discountAmount || 0}</small></div>}
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:700}}>ج.م {o.totalPrice}</div>
              {o.originalTotalPrice != null && <div className="text-muted"><del>ج.م {o.originalTotalPrice}</del></div>}
              <div className="text-muted">{o.status}</div>
            </div>
          </div>
          <div className="mt-2 d-flex gap-2">
            <button className="btn btn-sm btn-outline-primary" onClick={()=>open(o)}>Details</button>
            <div className="ms-auto d-flex gap-2">
              <select className="form-select form-select-sm" style={{width:160}} value={o.status} onChange={(e)=>changeStatus(o._id, e.target.value)}>
                {STATUS_OPTIONS.map(s=> <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      ))}

      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="text-muted">Page {page} — {total || list.length} items</div>
        <div>
          <button className="btn btn-sm btn-outline-secondary me-2" onClick={prevPage} disabled={page<=1}>Prev</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={nextPage} disabled={(total && page>=Math.ceil(total/limit)) || list.length < limit}>Next</button>
        </div>
      </div>

      {selected && <OrderModal order={selected} onClose={close} onChangeStatus={changeStatus} onReload={async (id)=>{
        try {
          const fresh = await api.get(`/orders/${id}`);
          if (fresh.ok) setSelected(fresh.data);
        } catch (e) {
          // ignore
        }
      }} />}
    </div>
  );
};

export default Orders;
