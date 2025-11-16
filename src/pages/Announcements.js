import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';

const Announcements = ({ admin }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [model, setModel] = useState({ text: '', href: '', active: true, priority: 0, startsAt: '', endsAt: '' });
  const toast = useToast();

  const canEdit = admin && (admin.role === 'manager' || admin.role === 'superadmin');

  const load = async () => {
    setLoading(true);
    const res = await api.get('/announcements/manage');
    if (res.ok) {
      const data = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      setList(data.sort((a, b) => (b.priority || 0) - (a.priority || 0) || (new Date(b.createdAt || 0) - new Date(a.createdAt || 0))));
    } else {
      setList([]);
      toast(res.error || 'تعذر تحميل الإشعارات', { type: 'error' });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toInputDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const save = async () => {
    if (!canEdit) return toast('ليست لديك صلاحية التعديل', { type: 'error' });
    if (!model.text.trim()) return toast('اكتب نص الإعلان', { type: 'error' });
    setSaving(true);
    try {
      const payload = { ...model };
      if (!payload.startsAt) delete payload.startsAt;
      else if (payload.startsAt.includes('T')) payload.startsAt = new Date(payload.startsAt).toISOString();
      if (!payload.endsAt) delete payload.endsAt;
      else if (payload.endsAt.includes('T')) payload.endsAt = new Date(payload.endsAt).toISOString();

      if (editing) {
        const res = await api.put(`/announcements/${editing}`, payload);
        if (res.ok) {
          toast('تم حفظ الإعلان', { type: 'success' });
          setEditing(null);
          setModel({ text: '', href: '', active: true, priority: 0, startsAt: '', endsAt: '' });
          load();
        } else toast(res.error || 'تعذر الحفظ', { type: 'error' });
      } else {
        const res = await api.post('/announcements', payload);
        if (res.ok) {
          toast('تم إنشاء الإعلان', { type: 'success' });
          setModel({ text: '', href: '', active: true, priority: 0, startsAt: '', endsAt: '' });
          load();
        } else toast(res.error || 'تعذر الإنشاء', { type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!canEdit) return toast('ليست لديك صلاحية الحذف', { type: 'error' });
    if (!window.confirm('حذف هذا الإعلان؟')) return;
    const res = await api.del(`/announcements/${id}`);
    if (res.ok) { toast('تم الحذف', { type: 'success' }); load(); }
    else toast(res.error || 'تعذر الحذف', { type: 'error' });
  };

  const edit = (ann) => {
    if (!canEdit) return toast('ليست لديك صلاحية التعديل', { type: 'error' });
    setEditing(ann._id);
    setModel({
      text: ann.text || '',
      href: ann.href || '',
      active: !!ann.active,
      priority: ann.priority || 0,
      startsAt: ann.startsAt ? toInputDate(ann.startsAt) : '',
      endsAt: ann.endsAt ? toInputDate(ann.endsAt) : ''
    });
  };

  const changePriority = async (ann, delta) => {
    if (!canEdit) return toast('ليست لديك صلاحية التعديل', { type: 'error' });
    const newPriority = (ann.priority || 0) + delta;
    const res = await api.put(`/announcements/${ann._id}`, { priority: newPriority });
    if (res.ok) { toast('تم تحديث الترتيب', { type: 'success' }); load(); }
    else toast(res.error || 'تعذر التحديث', { type: 'error' });
  };

  const toggleActive = async (ann) => {
    if (!canEdit) return toast('ليست لديك صلاحية التعديل', { type: 'error' });
    setList(ls => ls.map(l => l._id === ann._id ? { ...l, active: !l.active } : l));
    const res = await api.put(`/announcements/${ann._id}`, { active: !ann.active });
    if (!res.ok) {
      setList(ls => ls.map(l => l._id === ann._id ? { ...l, active: ann.active } : l));
      toast(res.error || 'تعذر تحديث الحالة', { type: 'error' });
    }
  };

  return (
    <div dir="rtl">
      <h3>الإشعارات والتنبيهات</h3>
      <div className="text-muted mb-3">اعرض الرسائل العلوية الظاهرة للمستخدمين واضبط مواعيد ظهورها.</div>

      {canEdit && (
        <div className="card p-3 mb-3">
          <h5>{editing ? 'تعديل إعلان' : 'إضافة إعلان'}</h5>
          <div className="mb-2"><label>نص الإعلان</label><textarea className="form-control" rows={2} value={model.text} onChange={e => setModel(m => ({ ...m, text: e.target.value }))} /></div>
          <div className="mb-2"><label>رابط اختياري</label><input className="form-control" value={model.href} onChange={e => setModel(m => ({ ...m, href: e.target.value }))} placeholder="https://..." /></div>
          <div className="mb-2"><label>الأولوية</label><input className="form-control" type="number" value={model.priority} onChange={e => setModel(m => ({ ...m, priority: Number(e.target.value || 0) }))} /></div>
          <div className="mb-2 d-flex gap-2">
            <div style={{ flex: 1 }}>
              <label>يبدأ من</label>
              <input type="datetime-local" className="form-control" value={model.startsAt} onChange={e => setModel(m => ({ ...m, startsAt: e.target.value }))} />
            </div>
            <div style={{ flex: 1 }}>
              <label>ينتهي في</label>
              <input type="datetime-local" className="form-control" value={model.endsAt} onChange={e => setModel(m => ({ ...m, endsAt: e.target.value }))} />
            </div>
          </div>
          <div className="form-check form-switch mb-3">
            <input className="form-check-input" type="checkbox" checked={model.active} onChange={e => setModel(m => ({ ...m, active: e.target.checked }))} id="ann-active" />
            <label className="form-check-label" htmlFor="ann-active">مفعل</label>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
            {editing && <button className="btn btn-secondary" onClick={() => { setEditing(null); setModel({ text: '', href: '', active: true, priority: 0, startsAt: '', endsAt: '' }); }}>إلغاء</button>}
          </div>
        </div>
      )}

      <div className="card p-3">
        <h5>الإعلانات الحالية</h5>
        {loading && <div>جاري التحميل...</div>}
        {!loading && list.length === 0 && <div className="text-muted text-center py-3">لا يوجد أي إعلان حالياً.</div>}
        {!loading && list.map(ann => (
          <div key={ann._id} style={{ borderBottom: '1px solid #f0f0f0', padding: '8px 0', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{ann.text}</div>
              {ann.href && <div className="text-muted" style={{ fontSize: 13 }}>{ann.href}</div>}
              <div className="text-muted" style={{ fontSize: 12 }}>الأولوية: {ann.priority || 0}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                {ann.startsAt ? `من ${new Date(ann.startsAt).toLocaleString('ar-EG')}` : 'يبدأ فوراً'} - {ann.endsAt ? `حتى ${new Date(ann.endsAt).toLocaleString('ar-EG')}` : 'بدون نهاية'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
              <span className={`badge ${ann.active ? 'bg-success' : 'bg-secondary'}`}>{ann.active ? 'مفعل' : 'مخفي'}</span>
              {canEdit && (
                <>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => toggleActive(ann)}>{ann.active ? 'إخفاء' : 'إظهار'}</button>
                  <div className="d-flex gap-1">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => changePriority(ann, 1)}>رفع</button>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => changePriority(ann, -1)}>خفض</button>
                  </div>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => edit(ann)}>تعديل</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => remove(ann._id)}>حذف</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Announcements;
