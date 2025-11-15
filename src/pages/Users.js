import { useEffect, useState } from 'react';
import api from '../api';

const OrdersListModal = ({ user, onClose }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(()=>{
    const load = async () => {
      setLoading(true);
      const res = await api.get(`/orders?user=${encodeURIComponent(user._id)}&limit=200`);
      if (res.ok) setOrders(res.data.orders || []);
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <div style={{position:'fixed', inset:0, zIndex:1050}}>
      <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.4)'}} onClick={onClose} />
      <div style={{position:'relative', maxWidth:900, margin:'40px auto', background:'#fff', borderRadius:8, padding:20, zIndex:1060}}>
        <div className="d-flex justify-content-between align-items-center">
          <h5>Orders for {user.username}</h5>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Close</button>
        </div>
        <div style={{marginTop:12}}>
          {loading && <div>Loading…</div>}
          {!loading && orders.length===0 && <div className="text-muted">No orders</div>}
          {!loading && orders.map(o=> (
            <div key={o._id} style={{border:'1px solid #eee', padding:8, borderRadius:6, marginBottom:8}}>
              <div className="d-flex justify-content-between">
                <div>
                  <div style={{fontWeight:700}}>#{o._id.slice(-8)} — {o.status}</div>
                  <div className="text-muted">{new Date(o.createdAt).toLocaleString()}</div>
                  <div className="text-muted">ج.م {o.totalPrice}</div>
                </div>
                <div>
                  <button className="btn btn-sm btn-outline-primary" onClick={()=>setSelected(o)}>View</button>
                </div>
              </div>
              {selected && selected._id === o._id && (
                <div style={{marginTop:8}}>
                  <div><strong>Items</strong></div>
                  {Array.isArray(o.products) ? o.products.map(p=> (
                    <div key={p.product} style={{display:'flex', justifyContent:'space-between', padding:'6px 0'}}>
                      <div>{p.productDetails?.Name || p.productDetails?.name || 'Item' } × {p.quantity}</div>
                      <div>ج.م {(p.productDetails?.Sell || 0) * p.quantity}</div>
                    </div>
                  )) : <div className="text-muted">No items</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Users = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [model, setModel] = useState({ username: '', Address: '', phoneNumber: '' });
  const [showOrdersFor, setShowOrdersFor] = useState(null);

  const load = async () => {
    setLoading(true);
    const res = await api.get('/users?includeTotals=true');
    if (res.ok) setList(res.data || []);
    setLoading(false);
  };

  useEffect(()=>{ load(); }, []);

  const save = async () => {
    if (!editing) return;
    const res = await api.put(`/users/${editing}`, model);
    if (res.ok) { setEditing(null); setModel({ username:'', Address:'', phoneNumber:'' }); load(); }
  };

  const edit = (u) => { setEditing(u._id); setModel({ username: u.username || '', Address: u.Address || '', phoneNumber: u.phoneNumber || '' }); };
  const remove = async (id) => { if (!window.confirm('Delete user?')) return; const res = await api.del(`/users/${id}`); if (res.ok) load(); };

  return (
    <div>
      <h3>Users</h3>

      <div style={{marginBottom:12}}>
        <div style={{display:'flex', gap:12}}>
          <div style={{flex:1}}>
            <div style={{marginBottom:8}}><label>Username</label><input className="form-control" value={model.username} onChange={e=>setModel(m=>({...m, username:e.target.value}))} /></div>
            <div style={{marginBottom:8}}><label>Address</label><input className="form-control" value={model.Address} onChange={e=>setModel(m=>({...m, Address:e.target.value}))} /></div>
            <div style={{marginBottom:8}}><label>Phone</label><input className="form-control" value={model.phoneNumber} onChange={e=>setModel(m=>({...m, phoneNumber:e.target.value}))} /></div>
            <div style={{display:'flex', gap:8}}>
              <button className="btn btn-primary" onClick={save} disabled={!editing}>Save</button>
              {editing && <button className="btn btn-secondary" onClick={()=>{ setEditing(null); setModel({ username:'', Address:'', phoneNumber:'' }); }}>Cancel</button>}
            </div>
          </div>
          <div style={{width:200}}>
            <h5>Summary</h5>
            <div className="text-muted">Users: {list.length}</div>
            <div style={{marginTop:8}}>
              <button className="btn btn-sm btn-outline-success" onClick={async ()=>{
                try {
                  const resp = await api.instance.get('/users/export', { responseType: 'blob' });
                  if (resp && resp.status === 200) {
                    const url = window.URL.createObjectURL(new Blob([resp.data]));
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `users-${Date.now()}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } else {
                    alert('Failed to download CSV');
                  }
                } catch (err) {
                  alert('Failed to download CSV');
                }
              }}>Download CSV</button>
            </div>
          </div>
        </div>
      </div>

      <div>
        {loading && <div>Loading…</div>}
        {!loading && (
          <div style={{overflowX:'auto'}}>
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Created</th>
                  <th>Total Spend</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map(u => (
                  <tr key={u._id}>
                    <td style={{fontWeight:700}}>{u.username}</td>
                    <td>{u.phoneNumber}</td>
                    <td style={{maxWidth:300}}>{u.Address}</td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}</td>
                    <td style={{fontWeight:700}}>ج.م {(u.totalSpend || 0).toFixed ? (u.totalSpend || 0).toFixed(2) : u.totalSpend}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={()=>setShowOrdersFor(u)}>View Orders</button>
                      <button className="btn btn-sm btn-outline-secondary me-2" onClick={()=>edit(u)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={()=>remove(u._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showOrdersFor && <OrdersListModal user={showOrdersFor} onClose={()=>setShowOrdersFor(null)} />}
    </div>
  );
};

export default Users;
