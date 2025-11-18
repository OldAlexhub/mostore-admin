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
  secondaryImageUrl: '',
  Description: '',
  imageGalleryText: ''
});

const statusMeta = (product) => {
  const qty = Number(product?.QTY ?? 0);
  const minQty = Number(product?.minQty ?? 0);
  const status = product?.stockStatus || (qty <= 0 ? 'out_of_stock' : (qty <= (minQty || 3) ? 'low_stock' : 'in_stock'));
  if (status === 'out_of_stock') return { label: 'نفدت الكمية', className: 'badge bg-danger' };
  if (status === 'low_stock') return { label: 'كمية محدودة', className: 'badge bg-warning text-dark' };
  return { label: 'متوفر', className: 'badge bg-success' };
};

const Products = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [model, setModel] = useState(emptyModel());
  const [page, setPage] = useState(1);
  const limit = 20;
  const [total, setTotal] = useState(0);
  const [filterOptions, setFilterOptions] = useState({ categories: [], subcategories: [], materials: [], seasons: [], styles: [] });
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const toast = useToast();

  const normalizeResponse = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.products) return res.products;
    if (res.data && Array.isArray(res.data)) return res.data;
    return [];
  };

  useEffect(() => {
    const fetchFilters = async () => {
      const res = await api.get('/products/filters');
      if (res.ok) {
        setFilterOptions({
          categories: res.data?.categories || [],
          subcategories: res.data?.subcategories || [],
          materials: res.data?.materials || [],
          seasons: res.data?.seasons || [],
          styles: res.data?.styles || []
        });
      }
    };
    fetchFilters();
  }, []);

  const applyStockFilter = (items) => {
    if (!Array.isArray(items)) return [];
    if (stockFilter === 'low') return items.filter((p) => Number(p.QTY ?? 0) <= (Number(p.minQty ?? 0) || 5));
    if (stockFilter === 'out') return items.filter((p) => Number(p.QTY ?? 0) <= 0);
    return items;
  };

  const load = async (targetPage = page, { preservePage = false } = {}) => {
    setLoading(true);
    try {
      const activeSearch = searchApplied.trim();
      let items = [];
      let totalCount = 0;

      if (activeSearch) {
        const res = await api.get(`/products/search?q=${encodeURIComponent(activeSearch)}`);
        if (!res.ok) throw new Error(res.error || 'تعذر تحميل المنتجات');
        items = normalizeResponse(res.data);
        totalCount = items.length;
      } else {
        const params = new URLSearchParams();
        params.set('page', targetPage);
        params.set('limit', limit);
        if (categoryFilter) params.set('Category', categoryFilter);
        if (subcategoryFilter) params.set('Subcategory', subcategoryFilter);
        const res = await api.get(`/products?${params.toString()}`);
        if (!res.ok) throw new Error(res.error || 'تعذر تحميل المنتجات');
        items = normalizeResponse(res.data);
        totalCount = res.data?.total ?? res.data?.count ?? items.length;
      }

      const filtered = applyStockFilter(items);
      setList(filtered);
      setTotal((stockFilter === 'all' && !searchApplied) ? totalCount : filtered.length);
      if (!preservePage) {
        setPage(searchApplied ? 1 : targetPage);
      } else if (searchApplied) {
        setPage(1);
      }
    } catch (err) {
      toast(err.message || 'تعذر تحميل المنتجات', { type: 'error' });
      setList([]);
      setTotal(0);
      if (!preservePage) setPage(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, subcategoryFilter, stockFilter, searchApplied]);

  const save = async () => {
    if (!model.Name || !String(model.Name).trim()) return toast('اسم المنتج مطلوب', { type: 'error' });
    if (model.Sell === '' || model.Sell === null || isNaN(Number(model.Sell))) return toast('سعر البيع مطلوب', { type: 'error' });
    if (model.cost === '' || model.cost === null || isNaN(Number(model.cost))) return toast('التكلفة مطلوبة', { type: 'error' });
    const gallery = (model.imageGalleryText || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const payload = {
      ...model,
      Sell: Number(model.Sell),
      QTY: Number(model.QTY),
      cost: Number(model.cost || 0),
      minQty: Number(model.minQty || 0),
      imageGallery: gallery
    };
    delete payload.imageGalleryText;
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
      secondaryImageUrl: product.secondaryImageUrl || '',
      Description: product.Description || '',
      imageGalleryText: (Array.isArray(product.imageGallery) ? product.imageGallery : []).join('\n')
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
    load(target, { preservePage: true });
  };

  const nextPage = () => {
    const maxPages = Math.ceil((total || list.length) / limit);
    if (page >= maxPages) return;
    const target = page + 1;
    setPage(target);
    load(target, { preservePage: true });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchApplied(searchInput.trim());
  };

  const resetFilters = () => {
    setCategoryFilter('');
    setSubcategoryFilter('');
    setStockFilter('all');
    setSearchInput('');
    setSearchApplied('');
  };

  const hasActiveFilters = Boolean(categoryFilter || subcategoryFilter || searchApplied || stockFilter !== 'all');

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
            <div className="mb-2"><label className="form-label">رابط صورة إضافية</label><input className="form-control" value={model.secondaryImageUrl} onChange={e => setModel(m => ({ ...m, secondaryImageUrl: e.target.value }))} /></div>
            {model.secondaryImageUrl && (
              <div className="mb-2">
                <img src={model.secondaryImageUrl} alt="preview-2" style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain', border: '1px solid #eee' }} />
              </div>
            )}
            <div className="mb-2">
              <label className="form-label">روابط صور إضافية (سطر لكل رابط)</label>
              <textarea
                className="form-control"
                rows={3}
                value={model.imageGalleryText}
                onChange={e => setModel(m => ({ ...m, imageGalleryText: e.target.value }))}
                placeholder="https://ibb.co/..."
              />
              <small className="text-muted">يمكنك لصق روابط Imgbb (viewer) أو أي رابط صورة مباشر، كل رابط في سطر مستقل.</small>
            </div>
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
            <form className="row g-2 mb-3" onSubmit={handleSearchSubmit}>
              <div className="col-12 col-md-4">
                <label className="form-label">بحث بالاسم أو الكود</label>
                <input className="form-control" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="مثال: فستان صيفي" />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">القسم الرئيسي</label>
                <select className="form-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                  <option value="">الكل</option>
                  {filterOptions.categories.map((cat) => (
                    <option key={cat || 'empty'} value={cat}>{cat || 'غير محدد'}</option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">التصنيف الفرعي</label>
                <select className="form-select" value={subcategoryFilter} onChange={e => setSubcategoryFilter(e.target.value)}>
                  <option value="">الكل</option>
                  {filterOptions.subcategories.map((sub) => (
                    <option key={sub || 'sub-empty'} value={sub}>{sub || 'غير محدد'}</option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label">حالة المخزون</label>
                <select className="form-select" value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
                  <option value="all">جميع المنتجات</option>
                  <option value="low">قريب من النفاد</option>
                  <option value="out">منتهي</option>
                </select>
              </div>
              <div className="col-6 col-md-2 d-flex align-items-end">
                <button type="submit" className="btn btn-primary w-100">بحث</button>
              </div>
            </form>
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div className="small text-muted">
                {searchApplied ? `نتائج البحث عن "${searchApplied}"` : 'كل المنتجات'}
                {categoryFilter && ` • القسم: ${categoryFilter}`}
                {subcategoryFilter && ` • الفرعي: ${subcategoryFilter}`}
                {stockFilter !== 'all' && ` • المخزون: ${stockFilter === 'low' ? 'قريب من النفاد' : 'منتهي'}`}
              </div>
              {hasActiveFilters && (
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetFilters}>مسح الفلاتر</button>
              )}
            </div>
            {loading && <div>جارٍ التحميل...</div>}
            {!loading && list.length === 0 && <div className="text-muted">لا يوجد منتجات.</div>}
            {!loading && list.map((p) => {
              const meta = statusMeta(p);
              return (
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
                    <div className="mt-2"><span className={meta.className}>{meta.label}</span></div>
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
            );})}

            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted">
                {searchApplied
                  ? `عرض ${list.length} نتيجة مطابقة`
                  : `صفحة ${page} - ${total || list.length} منتج`}
              </div>
              <div>
                <button className="btn btn-sm btn-outline-secondary me-2" onClick={prevPage} disabled={page <= 1 || Boolean(searchApplied)}>السابق</button>
                <button className="btn btn-sm btn-outline-secondary" onClick={nextPage} disabled={Boolean(searchApplied) || (total && page >= Math.ceil(total / limit)) || list.length < limit}>التالي</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
