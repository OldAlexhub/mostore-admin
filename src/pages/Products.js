import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';

const emptyModel = () => ({
  Number: '',
  Name: '',
  Sell: '',
  cost: '',
  Category: '',
  Subcategory: '',
  Material: '',
  Season: '',
  Style: '',
  QTY: 0,
  minQty: 0,
  imageUrl: '',
  Description: ''
});

const Products = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [model, setModel] = useState(emptyModel());
  const [page, setPage] = useState(1);
  const limit = 20;
  const [total, setTotal] = useState(0);
  const toast = useToast();

  const normalizeResponse = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.products) return res.products;
    if (res.data && Array.isArray(res.data)) return res.data;
    return [];
  };

  const load = async (targetPage = page) => {
    setLoading(true);
    const res = await api.get(`/products?page=${targetPage}&limit=${limit}`);
    if (res.ok) {
      const items = normalizeResponse(res.data);
      setList(items);
      const t = res.data?.total ?? res.data?.count ?? items.length;
      setTotal(t);
    } else {
      toast(res.error || 'تعذر تحميل المنتجات', { type: 'error' });
      setList([]);
      setTotal(0);
    }
    setLoading(false);
  };

  useEffect(() => { load(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!model.Name || !String(model.Name).trim()) return toast('اسم المنتج مطلوب', { type: 'error' });
    if (model.Sell === '' || model.Sell === null || isNaN(Number(model.Sell))) return toast('سعر البيع مطلوب', { type: 'error' });
    if (model.cost === '' || model.cost === null || isNaN(Number(model.cost))) return toast('التكلفة مطلوبة', { type: 'error' });
    const payload = {
      ...model,
      Sell: Number(model.Sell),
      QTY: Number(model.QTY),
      cost: Number(model.cost || 0),
      minQty: Number(model.minQty || 0)
    };
    if (model.Number && String(model.Number).trim() !== '') payload.Number = Number(model.Number);
    if (editing) {
      const res = await api.put(`/products/${editing}`, payload);
      if (res.ok) {
        toast('تم حفظ التعديلات', { type: 'success' });
        setEditing(null);
        setModel(emptyModel());
        load(page);
      } else toast(res.error || 'تعذر الحفظ', { type: 'error' });
      return;
    }
    const res = await api.post('/products', payload);
    if (res.ok) {
      toast('تم إنشاء المنتج', { type: 'success' });
      setModel(emptyModel());
      setPage(1);
      load(1);
    } else toast(res.error || 'تعذر الإنشاء', { type: 'error' });
  };

  const edit = (product) => {
    setEditing(product._id);
    setModel({
      Number: product.Number || '',
      Name: product.Name || '',
      Sell: product.Sell ?? '',
      cost: product.cost ?? '',
      minQty: product.minQty || 0,
      Category: product.Category || '',
      Subcategory: product.Subcategory || '',
      Material: product.Material || '',
      Season: product.Season || '',
      Style: product.Style || '',
      QTY: product.QTY || 0,
      imageUrl: product.imageUrl || '',
      Description: product.Description || ''
    });
  };

  const remove = async (id) => {
    if (!window.confirm('حذف هذا المنتج؟')) return;
    const res = await api.del(`/products/${id}`);
    if (res.ok) { toast('تم الحذف', { type: 'success' }); load(page); }
    else toast(res.error || 'تعذر الحذف', { type: 'error' });
  };

  const prevPage = () => {
    if (page <= 1) return;
    const target = page - 1;
    setPage(target);
    load(target);
  };

  const nextPage = () => {
    const maxPages = Math.ceil((total || list.length) / limit);
    if (page >= maxPages) return;
    const target = page + 1;
    setPage(target);
    load(target);
  };

  return (
    <div className="container-admin" dir="rtl">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">المنتجات</h3>
        <button className="btn btn-outline-secondary" onClick={() => load(page)}>تحديث</button>
      </div>

      <div className="row g-3">
        <div className="col-md-5">
          <div className="card p-3">
            <h5 className="mb-3">{editing ? 'تعديل منتج' : 'إضافة منتج'}</h5>
            <div className="mb-2"><label className="form-label">الاسم</label><input className="form-control" value={model.Name} onChange={e => setModel(m => ({ ...m, Name: e.target.value }))} /></div>
            <div className="mb-2"><label className="form-label">الرقم</label><input className="form-control" value={model.Number} onChange={e => setModel(m => ({ ...m, Number: e.target.value }))} /></div>
            <div className="mb-2"><label className="form-label">سعر البيع</label><input className="form-control" type="number" value={model.Sell} onChange={e => setModel(m => ({ ...m, Sell: e.target.value }))} /></div>
            <div className="mb-2"><label className="form-label">التكلفة</label><input className="form-control" type="number" value={model.cost} onChange={e => setModel(m => ({ ...m, cost: e.target.value }))} /></div>
            <div className="mb-2"><label className="form-label">التصنيف الرئيسي</label><input className="form-control" value={model.Category} onChange={e => setModel(m => ({ ...m, Category: e.target.value }))} /></div>
            <div className="mb-2"><label className="form-label">التصنيف الفرعي</label><input className="form-control" value={model.Subcategory} onChange={e => setModel(m => ({ ...m, Subcategory: e.target.value }))} /></div>
            <div className="mb-2"><label className="form-label">الخامة</label><input className="form-control" value={model.Material} onChange={e => setModel(m => ({ ...m, Material: e.target.value }))} /></div>
            <div className="mb-2"><label className="form-label">الموسم</label><input className="form-control" value={model.Season} onChange={e => setModel(m => ({ ...m, Season: e.target.value }))} /></div>
            <div className="mb-2"><label className="form-label">الستايل</label><input className="form-control" value={model.Style} onChange={e => setModel(m => ({ ...m, Style: e.target.value }))} /></div>
            <div className="mb-2"><label className="form-label">الكمية المتاحة</label><input className="form-control" type="number" value={model.QTY} onChange={e => setModel(m => ({ ...m, QTY: e.target.value }))} /></div>
            <div className="mb-2"><label className="form-label">حد التنبيه</label><input className="form-control" type="number" value={model.minQty} onChange={e => setModel(m => ({ ...m, minQty: e.target.value }))} /></div>
            <div className="mb-2"><label className="form-label">رابط الصورة</label><input className="form-control" value={model.imageUrl} onChange={e => setModel(m => ({ ...m, imageUrl: e.target.value }))} /></div>
            {model.imageUrl && (
              <div className="mb-2">
                <img src={model.imageUrl} alt="preview" style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain', border: '1px solid #eee' }} />
              </div>
            )}
            <div className="mb-2"><label className="form-label">الوصف</label><textarea className="form-control" rows={3} value={model.Description} onChange={e => setModel(m => ({ ...m, Description: e.target.value }))} /></div>

            <div className="d-flex gap-2">
              <button className="btn btn-primary" onClick={save}>{editing ? 'حفظ التعديلات' : 'إضافة المنتج'}</button>
              {editing && <button className="btn btn-secondary" onClick={() => { setEditing(null); setModel(emptyModel()); }}>إلغاء</button>}
            </div>
          </div>
        </div>

        <div className="col-md-7">
          <div className="card p-3">
            <h5 className="mb-3">قائمة المنتجات</h5>
            {loading && <div>جارٍ التحميل...</div>}
            {!loading && list.length === 0 && <div className="text-muted">لا يوجد منتجات.</div>}
            {!loading && list.map((p) => (
              <div key={p._id} className="mb-2 p-2" style={{ border: '1px solid #eee', borderRadius: 6 }}>
                <div className="d-flex">
                  <div style={{ width: 96, height: 96, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', marginInlineEnd: 12, border: '1px solid #f0f0f0' }}>
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.Name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{ fontSize: 11, color: '#999' }}>لا توجد صورة</div>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{p.Name} {p.Number ? <span className="text-muted" style={{ fontWeight: 400, marginInlineStart:8 }}>#{p.Number}</span> : null} <span className="text-muted" style={{ fontWeight: 400 }}>- ج.م {p.Sell}</span></div>
                    <div style={{ fontSize: 12, color: '#666' }}>التكلفة: ج.م {p.cost ?? 0}</div>
                    <div style={{ fontSize: 13, color: '#666' }}>{p.Category}{p.Subcategory ? ` > ${p.Subcategory}` : ''} {p.Material ? ` | ${p.Material}` : ''}</div>
                    <div style={{ marginTop: 6, fontSize: 13 }}>{p.Description}</div>
                    <div className="mt-2 d-flex gap-2">
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => edit(p)}>تعديل</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => remove(p._id)}>حذف</button>
                    </div>
                  </div>
                  <div style={{ width: 110, textAlign: 'center' }}>
                    <div className="text-muted">المخزون</div>
                    <div style={{ fontWeight: 700 }}>{p.QTY ?? 0}</div>
                  </div>
                </div>
              </div>
            ))}

            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted">صفحة {page} - {total || list.length} منتج</div>
              <div>
                <button className="btn btn-sm btn-outline-secondary me-2" onClick={prevPage} disabled={page <= 1}>السابق</button>
                <button className="btn btn-sm btn-outline-secondary" onClick={nextPage} disabled={(total && page >= Math.ceil(total / limit)) || list.length < limit}>التالي</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
