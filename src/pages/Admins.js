import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';

const Admins = ({ admin }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState({ username: '', email: '', password: '', role: 'manager' });
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    const res = await api.get('/admins');
    if (res.ok) {
      setList(res.data || []);
      // initialize roles map for inline editing
      const map = {};
      (res.data || []).forEach(a => { map[a._id] = a.role; });
      setRoles(map);
    }
    else toast(res.error || 'Failed to load admins', { type: 'error' });
    setLoading(false);
  };

  useEffect(()=>{ load(); }, []);

  const save = async () => {
    if (!model.username || !model.email || !model.password) return toast('username,email,password required', { type: 'error' });
    const res = await api.post('/admins', model);
    if (res.ok) { toast('Admin created', { type: 'success' }); setModel({ username:'', email:'', password:'', role:'manager' }); load(); }
    else toast(res.error || 'Create failed', { type: 'error' });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete admin?')) return;
    const res = await api.del(`/admins/${id}`);
    if (res.ok) { toast('Deleted', { type: 'success' }); load(); }
    else toast(res.error || 'Delete failed', { type: 'error' });
  };

  const [roles, setRoles] = useState({});

  const setRoleFor = (id, v) => setRoles(r => ({ ...r, [id]: v }));

  const saveRole = async (id) => {
    const newRole = roles[id];
    if (!newRole) return toast('Select a role', { type: 'error' });
    const res = await api.put(`/admins/${id}`, { role: newRole });
    if (res.ok) { toast('Role updated', { type: 'success' }); load(); }
    else toast(res.error || 'Update failed', { type: 'error' });
  };

  return (
    <div>
      <h3>Admins</h3>
      <div className="mb-3">Manage administrative users. Creation and deletion require superadmin role.</div>

      {admin?.role === 'superadmin' && (
        <div className="card p-3 mb-3">
          <h5>Create Admin</h5>
          <div className="mb-2"><label>Username</label><input className="form-control" value={model.username} onChange={e=>setModel(m=>({...m, username: e.target.value}))} /></div>
          <div className="mb-2"><label>Email</label><input className="form-control" value={model.email} onChange={e=>setModel(m=>({...m, email: e.target.value}))} /></div>
          <div className="mb-2"><label>Password</label><input type="password" className="form-control" value={model.password} onChange={e=>setModel(m=>({...m, password: e.target.value}))} /></div>
          <div className="mb-2"><label>Role</label>
            <select className="form-control" value={model.role} onChange={e=>setModel(m=>({...m, role: e.target.value}))}>
              <option value="manager">manager</option>
              <option value="staff">staff</option>
              <option value="superadmin">superadmin</option>
            </select>
          </div>
          <div><button className="btn btn-primary" onClick={save}>Create Admin</button></div>
        </div>
      )}

      <div className="card p-3">
        <h5>Existing Admins</h5>
        {loading && <div>Loading…</div>}
        {!loading && list.map(a => (
          <div key={a._id} style={{display:'flex', justifyContent:'space-between', padding:8, borderBottom:'1px solid #eee'}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700}}>{a.username} <span style={{fontWeight:400, color:'#666'}}>({a.role})</span></div>
              <div className="text-muted">{a.email}</div>
            </div>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              {admin?.role === 'superadmin' && (
                <>
                  <select className="form-control form-select" value={roles[a._id] ?? a.role} onChange={e=>setRoleFor(a._id, e.target.value)} style={{width:140}}>
                    <option value="manager">manager</option>
                    <option value="staff">staff</option>
                    <option value="superadmin">superadmin</option>
                  </select>
                  <button className="btn btn-sm btn-outline-primary" onClick={()=>saveRole(a._id)}>Save Role</button>
                </>
              )}
              {admin?.role === 'superadmin' && String(a._id) !== String(admin.id || admin._id) && (
                <button className="btn btn-sm btn-outline-danger" onClick={()=>remove(a._id)}>Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admins;
