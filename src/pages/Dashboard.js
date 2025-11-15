import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';

const StatCard = ({ title, value, subtitle, children }) => (
  <div className="card text-center p-3">
    <div className="card-body">
      <h6 className="card-title text-muted">{title}</h6>
      <div style={{fontSize:28, fontWeight:700}}>{value}</div>
      {subtitle && <div className="text-muted" style={{fontSize:12, marginTop:6}}>{subtitle}</div>}
      {children}
    </div>
  </div>
);

const OrderPreviewModal = ({ order, onClose }) => {
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
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Close</button>
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
            <div className="mb-2">Status: <strong>{order.status}</strong></div>
            <div className="mb-2">Payment method: <strong>{order.payment?.method || order.paymentMethod || '—'}</strong></div>
            {order.payment?.transactionId && <div className="mb-2">Transaction: <strong>{order.payment.transactionId}</strong></div>}
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

const Dashboard = ({ setPage }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ products:0, orders:0, users:0, inventory:0, revenue: null });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fmt = (v) => {
    try { return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits:2 }).format(v); } catch (e) { return `ج.م ${Number(v||0).toFixed(2)}`; }
  };

  const load = async () => {
    setLoading(true);
    const [pRes, oRes, uRes, iRes, revRes] = await Promise.all([
      api.get('/products'),
      api.get('/orders?page=1&limit=6'),
      api.get('/users'),
      api.get('/inventory'),
      api.get('/revenue')
    ].map(p=>p.catch? p : p));

    // products
    const products = (pRes && pRes.ok) ? (Array.isArray(pRes.data) ? pRes.data : (pRes.data?.products || [])) : [];
    const orders = (oRes && oRes.ok) ? (Array.isArray(oRes.data) ? oRes.data : (oRes.data?.orders || [])) : [];
    const users = (uRes && uRes.ok) ? (Array.isArray(uRes.data) ? uRes.data : (uRes.data?.users || [])) : [];
    const inventory = (iRes && iRes.ok) ? (Array.isArray(iRes.data) ? iRes.data : (iRes.data?.items || [])) : [];

    // revenue: prefer revenue endpoint, else compute from orders (note: orders may be paginated)
    let revenue = null;
    if (revRes && revRes.ok) {
      revenue = revRes.data?.total ?? revRes.data?.revenue ?? null;
    }
    if (revenue == null && orders.length) {
      revenue = orders.reduce((s, o) => s + Number(o.totalPrice || 0), 0);
    }

    setStats({ products: products.length, orders: (orders.length || 0), users: users.length, inventory: inventory.length, revenue });

    // recent orders
    setRecentOrders(orders.slice(0,6));

    // low stock products (QTY small) — examine products' QTY field
    const low = products.filter(pp => (typeof pp.QTY !== 'undefined' && Number(pp.QTY) <= 5)).slice(0,6);
    setLowStock(low);

    setLoading(false);
  };

  useEffect(()=>{ load(); }, []);

  const toast = useToast();

  return (
    <div className="container-admin">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">Dashboard</h3>
        <div>
          <button className="btn btn-outline-secondary me-2" onClick={load}>Refresh</button>
        </div>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-2"><StatCard title="Products" value={stats.products} /></div>
            <div className="col-6 col-md-2"><StatCard title="Orders" value={stats.orders} /></div>
            <div className="col-6 col-md-2"><StatCard title="Users" value={stats.users} /></div>
            <div className="col-6 col-md-2"><StatCard title="Inventory" value={stats.inventory} /></div>
            <div className="col-12 col-md-4"><StatCard title="Revenue" value={stats.revenue != null ? fmt(stats.revenue) : '—'} subtitle={stats.revenue==null ? 'Revenue endpoint not available' : null} /></div>
          </div>

          <div className="row g-3">
            <div className="col-md-7">
              <div className="card p-3 mb-3">
                <h5>Recent Orders</h5>
                {recentOrders.length===0 && <div className="text-muted">No recent orders</div>}
                {recentOrders.map(o => (
                  <div key={o._id} className="d-flex align-items-center" style={{padding:10, borderBottom:'1px solid #f5f5f5'}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700}}>#{o._id.slice(-8)} — {o.userDetails?.username || o.user || 'guest'}</div>
                      <div className="text-muted">{new Date(o.createdAt).toLocaleString()}</div>
                    </div>
                    <div style={{width:140, textAlign:'right'}}>
                      <div style={{fontWeight:700}}>{fmt(o.totalPrice)}</div>
                      <div className="text-muted">{o.status}</div>
                    </div>
                    <div style={{marginLeft:12}}>
                      <button className="btn btn-sm btn-outline-primary" onClick={()=>setSelectedOrder(o)}>Details</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-md-5">
              <div className="card p-3 mb-3">
                <h5>Low Stock</h5>
                {lowStock.length===0 && <div className="text-muted">No low-stock products</div>}
                {lowStock.map(p => (
                  <div key={p._id} className="d-flex align-items-center" style={{padding:8, borderBottom:'1px solid #f5f5f5'}}>
                    <div style={{width:56, height:56, marginRight:10, background:'#fafafa', display:'flex', alignItems:'center', justifyContent:'center'}}>
                      {p.imageUrl ? <img src={p.imageUrl} alt={p.Name} style={{maxWidth:'100%', maxHeight:'100%'}} /> : <div style={{fontSize:11,color:'#999'}}>No image</div>}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700}}>{p.Name}</div>
                      <div className="text-muted">QTY: {p.QTY ?? 0}</div>
                    </div>
                    <div>
                      <button className="btn btn-sm btn-outline-secondary" onClick={()=>toast('Open product editor', { type: 'info' })}>Edit</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card p-3">
                <h5>Quick Actions</h5>
                  <div className="d-flex gap-2 mt-2">
                    <button className="btn btn-primary" onClick={()=>setPage && setPage('products')}>Manage Products</button>
                    <button className="btn btn-outline-primary" onClick={()=>setPage && setPage('orders')}>Manage Orders</button>
                    <button className="btn btn-outline-secondary" onClick={()=>setPage && setPage('users')}>Manage Users</button>
                  </div>
              </div>
            </div>
          </div>

          {selectedOrder && <OrderPreviewModal order={selectedOrder} onClose={()=>setSelectedOrder(null)} />}
        </>
      )}
    </div>
  );
};

export default Dashboard;
