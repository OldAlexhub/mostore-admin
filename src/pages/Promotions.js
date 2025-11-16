import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';

const emptyPromo = { code: '', type: 'percent', value: 0, description: '', active: true, startsAt: '', endsAt: '', usageLimit: 0 };

const Promotions = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [model, setModel] = useState(emptyPromo);
  const [search, setSearch] = useState('');
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    const res = await api.get('/promotions');
    if (res.ok) setList(res.data || []);
    else toast(res.error || 'تعذر تحميل العروض', { type: 'error' });
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    const payload = { ...model };
    try {
      payload.code = (payload.code || '').toUpperCase();
      payload.value = Number(payload.value || 0);
      payload.usageLimit = Number(payload.usageLimit || 0);
      if (payload.startsAt) payload.startsAt = new Date(payload.startsAt).toISOString();
      else delete payload.startsAt;
      if (payload.endsAt) payload.endsAt = new Date(payload.endsAt).toISOString();
      else delete payload.endsAt;

      if (editing) {
        const res = await api.put(`/promotions/${editing}`, payload);
        if (res.ok) {
          toast('تم تعديل العرض', { type: 'success' });
          setEditing(null);
          setModel(emptyPromo);
          load();
        } else toast(res.error || 'تعذر الحفظ', { type: 'error' });
      } else {
        const res = await api.post('/promotions', payload);
        if (res.ok) {
          toast('تم إنشاء العرض', { type: 'success' });
          setModel(emptyPromo);
          load();
        } else toast(res.error || 'تعذر الإنشاء', { type: 'error' });
      }
    } catch {
      toast('تأكد من البيانات المدخلة', { type: 'error' });
    }
  };

  const edit = (promo) => {
    setEditing(promo._id);
    setModel({
      code: promo.code || '',
      type: promo.type || 'percent',
      value: promo.value || 0,
      description: promo.description || '',
      active: !!promo.active,
      startsAt: promo.startsAt ? new Date(promo.startsAt).toISOString().slice(0, 16) : '',
      endsAt: promo.endsAt ? new Date(promo.endsAt).toISOString().slice(0, 16) : '',
      usageLimit: promo.usageLimit || 0
    });
  };

  const remove = async (id) => {
    if (!window.confirm('حذف هذا الكود؟')) return;
    const res = await api.del(`/promotions/${id}`);
    if (res.ok) { toast('تم الحذف', { type: 'success' }); load(); }
    else toast(res.error || 'تعذر الحذف', { type: 'error' });
  };

  const filtered = list.filter((p) => {
    if (!search) return true;
    const q = search.trim().toLowerCase();
    return (p.code || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
  });

  return (
    <div dir="rtl">
      <h3>الكوبونات والعروض</h3>
      <div className="text-muted mb-3">قم بإنشاء أكواد خصم ومتابعة استخدامها.</div>

      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 320, background: '#fff', padding: 12, border: '1px solid #eee', borderRadius: 6 }}>
          <h5>{editing ? 'تعديل كود' : 'إضافة كود'}</h5>
          <div className="mb-2"><label>الكود</label><input className="form-control" value={model.code} onChange={e => setModel(m => ({ ...m, code: e.target.value.toUpperCase() }))} placeholder="مثال: BLACKFRIDAY" /></div>
          <div className="mb-2">
            <label>نوع الخصم</label>
            <select className="form-select" value={model.type} onChange={e => setModel(m => ({ ...m, type: e.target.value }))}>
              <option value="percent">نسبة مئوية</option>
              <option value="amount">قيمة ثابتة</option>
            </select>
          </div>
          <div className="mb-2"><label>قيمة الخصم</label><input className="form-control" type="number" value={model.value} onChange={e => setModel(m => ({ ...m, value: e.target.value }))} /></div>
          <div className="mb-2"><label>وصف داخلي</label><input className="form-control" value={model.description} onChange={e => setModel(m => ({ ...m, description: e.target.value }))} /></div>
          <div className="mb-2"><label>يبدأ في</label><input className="form-control" type="datetime-local" value={model.startsAt} onChange={e => setModel(m => ({ ...m, startsAt: e.target.value }))} /></div>
          <div className="mb-2"><label>ينتهي في</label><input className="form-control" type="datetime-local" value={model.endsAt} onChange={e => setModel(m => ({ ...m, endsAt: e.target.value }))} /></div>
          <div className="mb-2"><label>حد الاستخدام</label><input className="form-control" type="number" value={model.usageLimit} onChange={e => setModel(m => ({ ...m, usageLimit: e.target.value }))} placeholder="0 يعني بدون حد" /></div>
          <div className="form-check form-switch mb-3">
            <input className="form-check-input" type="checkbox" checked={model.active} onChange={e => setModel(m => ({ ...m, active: e.target.checked }))} id="promo-active" />
            <label className="form-check-label" htmlFor="promo-active">مفعل</label>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-primary" onClick={save}>{editing ? 'حفظ التعديلات' : 'حفظ الكود'}</button>
            {editing && <button className="btn btn-secondary" onClick={() => { setEditing(null); setModel(emptyPromo); }}>إلغاء</button>}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 360 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input className="form-control" placeholder="بحث باسم الكود أو الوصف" value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setSearch('')}>مسح</button>
          </div>

          <h5>الأكواد الحالية</h5>
          {loading && <div>جارٍ التحميل...</div>}
          {!loading && filtered.length === 0 && <div className="text-muted">لا يوجد أكواد.</div>}
          {!loading && filtered.map((p) => (
            <div key={p._id} style={{ padding: 10, border: '1px solid #eee', marginBottom: 10, borderRadius: 6, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.code} <small className="text-muted ms-2">{p.type === 'percent' ? `${p.value}%` : `ج.م ${p.value}`}</small></div>
                  <div className="text-muted" style={{ fontSize: 13 }}>{p.description}</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <span className={`badge ${p.active ? 'bg-success' : 'bg-secondary'}`}>{p.active ? 'مفعل' : 'موقوف'}</span>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {p.startsAt ? `من ${new Date(p.startsAt).toLocaleString('ar-EG')}` : 'يبدأ فوراً'}
                    {p.endsAt ? <div>حتى {new Date(p.endsAt).toLocaleString('ar-EG')}</div> : <div>بدون تاريخ انتهاء</div>}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="text-muted">الاستخدام: {p.usedCount || 0} / {p.usageLimit || 'غير محدود'}</div>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => edit(p)}>تعديل</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => remove(p._id)}>حذف</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Promotions;
