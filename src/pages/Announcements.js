import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';

const Announcements = ({ admin }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [model, setModel] = useState({ text: '', href: '', active: true, priority: 0, startsAt: '', endsAt: '' });

  const load = async () => {
    setLoading(true);
    const res = await api.get('/announcements');
    if (res.ok) {
      // backend might return single object or array
      if (Array.isArray(res.data)) setList(res.data);
      else if (res.data) setList([res.data]);
      else setList([]);
    } else {
      setList([]);
    }
    // sort by priority desc then createdAt desc
    setList(ls => ls.slice().sort((a,b) => (b.priority||0) - (a.priority||0) || (new Date(b.createdAt||0) - new Date(a.createdAt||0))));
    setLoading(false);
  };

  useEffect(()=>{ load(); }, []);

  const toast = useToast();

  const canEdit = admin && (admin.role === 'manager' || admin.role === 'superadmin');

  const save = async () => {
    if (!canEdit) return toast('Insufficient privileges to create announcements', { type: 'error' });
    if (!model.text || model.text.trim()==='') {
      return toast('Text is required', { type: 'error' });
    }
    setSaving(true);
    try {
      // prepare payload: convert datetime-local to ISO if present
      const payload = { ...model };
      if (payload.startsAt === '') delete payload.startsAt;
      if (payload.endsAt === '') delete payload.endsAt;
      if (payload.startsAt && typeof payload.startsAt === 'string' && payload.startsAt.includes('T')) payload.startsAt = new Date(payload.startsAt).toISOString();
      if (payload.endsAt && typeof payload.endsAt === 'string' && payload.endsAt.includes('T')) payload.endsAt = new Date(payload.endsAt).toISOString();

      if (editing) {
        const res = await api.put(`/announcements/${editing}`, payload);
        if (res.ok) { setEditing(null); setModel({ text:'', href:'', active:true, priority:0, startsAt:'', endsAt:'' }); load(); toast('Announcement saved', { type: 'success' }); }
        else toast(res.error || 'Could not save', { type: 'error' });
        return;
      }
      const res = await api.post('/announcements', payload);
      if (res.ok) { setModel({ text:'', href:'', active:true, priority:0, startsAt:'', endsAt:'' }); load(); toast('Announcement created', { type: 'success' }); }
      else toast(res.error || 'Could not create', { type: 'error' });
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!canEdit) return toast('Insufficient privileges to delete announcements', { type: 'error' });
    if (!window.confirm('Delete announcement?')) return;
    const res = await api.del(`/announcements/${id}`);
    if (res.ok) { load(); toast('Announcement deleted', { type: 'success' }); }
    else toast(res.error || 'Could not delete', { type: 'error' });
  };

  const edit = (ann) => {
    if (!canEdit) return toast('Insufficient privileges to edit announcements', { type: 'error' });
    setEditing(ann._id);
    setModel({ text: ann.text || '', href: ann.href || '', active: !!ann.active, priority: ann.priority || 0, startsAt: ann.startsAt ? toInputDate(ann.startsAt) : '', endsAt: ann.endsAt ? toInputDate(ann.endsAt) : '' });
  };

  const toInputDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    // format to YYYY-MM-DDTHH:MM for datetime-local
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth()+1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const changePriority = async (ann, delta) => {
    if (!canEdit) return toast('Insufficient privileges to change announcement priority', { type: 'error' });
    const newPriority = (ann.priority || 0) + delta;
    const res = await api.put(`/announcements/${ann._id}`, { priority: newPriority });
    if (res.ok) { load(); toast('Priority updated', { type: 'success' }); }
    else toast(res.error || 'Could not update priority', { type: 'error' });
  };

  const toggleActive = async (ann) => {
    if (!canEdit) return toast('Insufficient privileges to change announcement state', { type: 'error' });
    // optimistic update
    setList(ls => ls.map(l => l._id === ann._id ? { ...l, active: !l.active } : l));
    const res = await api.put(`/announcements/${ann._id}`, { active: !ann.active });
    if (!res.ok) {
      // revert
      setList(ls => ls.map(l => l._id === ann._id ? { ...l, active: ann.active } : l));
      toast(res.error || 'Could not update active state', { type: 'error' });
    } else {
      toast(`Announcement ${!ann.active ? 'activated' : 'deactivated'}`, { type: 'success' });
    }
  };

  const niceDate = (iso) => {
    try { return new Date(iso).toLocaleString(); } catch(e) { return '-'; }
  };

  return (
    <div>
      <h3>Announcements</h3>
      <div style={{display:'flex', gap:12}}>
        <div style={{flex:1}}>
          <div style={{marginBottom:8}}>
            <label>Preview</label>
            <div style={{padding:10, border:'1px solid #ddd', borderRadius:6, background: model.active ? '#fffbe6' : '#f7f7f7'}}>
              {model.href ? <a href={model.href} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'#333', fontWeight:700}}>{model.text || '(no text)'}</a> : <div style={{fontWeight:700}}>{model.text || '(no text)'}</div>}
              <div style={{fontSize:12, color:'#666'}}>{model.active ? 'Visible' : 'Hidden'} · Priority {model.priority || 0}</div>
            </div>
          </div>
          <div style={{marginBottom:8}}>
            <label>Text</label>
            <input className="form-control" value={model.text} onChange={e=>setModel(m=>({...m, text:e.target.value}))} />
          </div>
          <div style={{marginBottom:8}}>
            <label>Link (optional)</label>
            <input className="form-control" value={model.href} onChange={e=>setModel(m=>({...m, href:e.target.value}))} />
          </div>
          <div style={{display:'flex', gap:12, marginBottom:8}}>
            <div style={{flex:'1 0 140px'}}>
              <label>Priority</label>
              <input type="number" className="form-control" value={model.priority} onChange={e=>setModel(m=>({...m, priority: Number(e.target.value||0)}))} />
            </div>
            <div style={{flex:'1 0 200px'}}>
              <label>Starts At</label>
              <input type="datetime-local" className="form-control" value={model.startsAt || ''} onChange={e=>setModel(m=>({...m, startsAt: e.target.value}))} />
            </div>
            <div style={{flex:'1 0 200px'}}>
              <label>Ends At</label>
              <input type="datetime-local" className="form-control" value={model.endsAt || ''} onChange={e=>setModel(m=>({...m, endsAt: e.target.value}))} />
            </div>
          </div>
          <div style={{marginBottom:8}}>
            <label><input type="checkbox" checked={model.active} onChange={e=>setModel(m=>({...m, active:e.target.checked}))} /> Active</label>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button className="btn btn-primary" onClick={save} disabled={saving || !model.text.trim()}>{saving ? 'Saving…' : (editing ? 'Save' : 'Create')}</button>
            {editing && <button className="btn btn-secondary" onClick={()=>{ setEditing(null); setModel({ text:'', href:'', active:true, priority:0, startsAt:'', endsAt:'' }); }}>Cancel</button>}
          </div>
        </div>

        <div style={{width:420}}>
          <h5>Existing</h5>
          {loading && <div>Loading…</div>}
          {!loading && list.length===0 && <div>No announcements</div>}
          {!loading && list.map(a=> (
            <div key={a._id} style={{padding:12, border:'1px solid #eee', marginBottom:10, borderRadius:6}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
                <div style={{fontWeight:700}}>{a.text}</div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:12, color:'#666'}}>Priority: <strong>{a.priority||0}</strong></div>
                  <div style={{fontSize:12, color:'#666'}}>{a.active ? 'Active' : 'Inactive'}</div>
                </div>
              </div>
              {a.href && <div style={{fontSize:13, color:'#007bff'}}><a href={a.href} target="_blank" rel="noreferrer">{a.href}</a></div>}
              <div style={{fontSize:12, color:'#666', marginTop:6}}>Created: {niceDate(a.createdAt)}{a.startsAt ? ` · Starts: ${niceDate(a.startsAt)}` : ''}{a.endsAt ? ` · Ends: ${niceDate(a.endsAt)}` : ''}</div>
              <div style={{marginTop:8, display:'flex', gap:8, alignItems:'center'}}>
                <button className="btn btn-sm btn-outline-secondary" onClick={()=>edit(a)}>Edit</button>
                <button className="btn btn-sm btn-outline-danger" onClick={()=>remove(a._id)}>Delete</button>
                <button className="btn btn-sm btn-outline-primary" onClick={()=>toggleActive(a)}>{a.active ? 'Deactivate' : 'Activate'}</button>
                <div style={{marginLeft:'auto', display:'flex', gap:6}}>
                  <button className="btn btn-sm btn-outline-secondary" title="Increase priority" onClick={()=>changePriority(a, 1)}>▲</button>
                  <button className="btn btn-sm btn-outline-secondary" title="Decrease priority" onClick={()=>changePriority(a, -1)}>▼</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Announcements;
