import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';

const empty = { code:'', type:'percent', value:0, description:'', active:true, startsAt:'', endsAt:'', usageLimit:0 };

const fmtCurrency = (v) => `ج.م ${Number(v||0).toFixed(2)}`;

const Promotions = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [model, setModel] = useState(empty);
  const [search, setSearch] = useState('');
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    const res = await api.get('/promotions');
    if (res.ok) setList(res.data || []);
    setLoading(false);
  };

  useEffect(()=>{ load(); }, []);

  const save = async () => {
    try {
      // normalize dates to ISO or null
      const payload = { ...model };
      if (payload.startsAt === '') delete payload.startsAt; else payload.startsAt = new Date(payload.startsAt).toISOString();
      if (payload.endsAt === '') delete payload.endsAt; else payload.endsAt = new Date(payload.endsAt).toISOString();
      if (!payload.usageLimit) payload.usageLimit = 0;

      if (editing) {
        const res = await api.put(`/promotions/${editing}`, payload);
        if (res.ok) { toast('تم التحديث'); setEditing(null); setModel(empty); load(); }
      } else {
        const res = await api.post('/promotions', payload);
        if (res.ok) { toast('تم الإنشاء'); setModel(empty); load(); }
      }
    } catch (err) { toast('فشل العملية', { type: 'error' }); }
  };

  const edit = (p) => {
    setEditing(p._id);
    setModel({
      code: p.code || '',
      type: p.type || 'percent',
      value: p.value || 0,
      description: p.description || '',
      active: !!p.active,
      startsAt: p.startsAt ? new Date(p.startsAt).toISOString().slice(0,16) : '',
      endsAt: p.endsAt ? new Date(p.endsAt).toISOString().slice(0,16) : '',
      usageLimit: p.usageLimit || 0
    });
  };

  const remove = async (id) => {
    if (!window.confirm('مسح الكوبون؟')) return;
    const res = await api.del(`/promotions/${id}`);
    if (res.ok) { toast('تم الحذف'); load(); }
  };

  const filtered = list.filter(p => {
    if (!search) return true;
    const q = search.trim().toLowerCase();
    return (p.code || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
  });

  return (
    <div>
      <h3>Promotions / كوبونات الخصم</h3>
      <div style={{marginBottom:12, padding:12, background:'#fff9f0', borderLeft:'4px solid #ffce00'}}>
        <strong>شرح سريع (بالعربي):</strong>
        <div style={{marginTop:6}}>الصفحة دي بتخليك تضيف وتعدل وتحذف كوبونات الخصم. الكوبون بيكون بـكود (مثال: <em>BLACKFRIDAY</em>) والعميل يدخل الكود في صفحة السلة علشان يحصل على الخصم. النوع ممكن يكون نسبة (%) أو مبلغ ثابت. تقدر تحط صلاحية بالكام يوم وحد أقصى للاستخدام.</div>
      </div>

      <div style={{display:'flex', gap:18, alignItems:'flex-start'}}>
        <div style={{flex:1, minWidth:360, background:'#fff', padding:12, border:'1px solid #eee', borderRadius:6}}>
          <h5>{editing ? 'تعديل كوبون' : 'كوبون جديد'}</h5>
          <div className="mb-2"><label>الكود</label><input className="form-control" value={model.code} onChange={e=>setModel(m=>({...m, code:e.target.value.toUpperCase()}))} placeholder="مثال: BLACKFRIDAY" /></div>
          <div className="mb-2"><label>النوع</label>
            <select className="form-select" value={model.type} onChange={e=>setModel(m=>({...m, type:e.target.value}))}>
              <option value="percent">نسبة (%)</option>
              <option value="amount">مبلغ ثابت</option>
            </select>
          </div>
          <div className="mb-2"><label>القيمة</label><input className="form-control" type="number" value={model.value} onChange={e=>setModel(m=>({...m, value: parseFloat(e.target.value||0)}))} /></div>
          <div className="mb-2"><label>الوصف (اختياري)</label><input className="form-control" value={model.description} onChange={e=>setModel(m=>({...m, description:e.target.value}))} /></div>
          <div className="mb-2"><label>بداية الصلاحية</label><input className="form-control" type="datetime-local" value={model.startsAt} onChange={e=>setModel(m=>({...m, startsAt: e.target.value}))} /></div>
          <div className="mb-2"><label>نهاية الصلاحية</label><input className="form-control" type="datetime-local" value={model.endsAt} onChange={e=>setModel(m=>({...m, endsAt: e.target.value}))} /></div>
          <div className="mb-2"><label>حد أقصى للاستخدام (0 = غير محدود)</label><input className="form-control" type="number" value={model.usageLimit} onChange={e=>setModel(m=>({...m, usageLimit: parseInt(e.target.value||0,10)}))} /></div>
          <div className="mb-2 form-check form-switch"><input type="checkbox" checked={model.active} onChange={e=>setModel(m=>({...m, active: e.target.checked}))} /> مفعل</div>
          <div style={{display:'flex', gap:8}}>
            <button className="btn btn-primary" onClick={save}>{editing ? 'تحديث' : 'إنشاء'}</button>
            {editing && <button className="btn btn-secondary" onClick={()=>{ setEditing(null); setModel(empty); }}>إلغاء</button>}
          </div>
        </div>

        <div style={{width:480}}>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
            <input className="form-control" placeholder="ابحث بكود أو وصف" value={search} onChange={e=>setSearch(e.target.value)} />
            <button className="btn btn-sm btn-outline-secondary" onClick={()=>{ setSearch(''); }}>مسح</button>
          </div>

          <h5>القائمة</h5>
          {loading && <div>Loading…</div>}
          {!loading && filtered.length===0 && <div className="text-muted">لا توجد كوبونات</div>}
          {!loading && filtered.map(p => (
            <div key={p._id} style={{padding:10, border:'1px solid #eee', marginBottom:10, borderRadius:6, background:'#fff'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:700}}>{p.code} <small style={{marginLeft:8}} className="text-muted">{p.type === 'percent' ? `${p.value}%` : fmtCurrency(p.value)}</small></div>
                  <div className="text-muted" style={{fontSize:13}}>{p.description}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{marginBottom:6}}>{p.active ? <span className="badge bg-success">مفعل</span> : <span className="badge bg-secondary">متوقف</span>}</div>
                  <div className="text-muted" style={{fontSize:12}}>
                    {p.startsAt ? `من: ${new Date(p.startsAt).toLocaleString()}` : ''}
                    {p.endsAt ? <div>إلى: {new Date(p.endsAt).toLocaleString()}</div> : null}
                  </div>
                </div>
              </div>
              <div style={{marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div className="text-muted">استخدم: {p.usedCount || 0} / {p.usageLimit || '∞'}</div>
                <div style={{display:'flex', gap:8}}>
                  <button className="btn btn-sm btn-outline-secondary" onClick={()=>edit(p)}>تعديل</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={()=>remove(p._id)}>حذف</button>
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
