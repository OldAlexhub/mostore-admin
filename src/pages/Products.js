import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';
import getPrimaryImage, { buildImageProxyUrl, normalizeImageUrl } from '../utils/getPrimaryImage';

const MAX_IMAGES = 20;

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

const GalleryPreview = ({ model }) => {
  if (!model) return null;
  const explicitPrimary = (model.imageUrl || '').toString().trim();
  const explicitSecondary = (model.secondaryImageUrl || '').toString().trim();
  const galleryLines = (model.imageGalleryText || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const combined = [];
  const seen = new Set();
  const pushUnique = (u) => {
    if (!u) return;
    const s = u.toString().trim();
    if (!s) return;
    if (seen.has(s)) return;
    seen.add(s);
    combined.push(s);
  };
  pushUnique(explicitPrimary);
  pushUnique(explicitSecondary);
  galleryLines.forEach(pushUnique);
  const MAX_IMAGES = 20;
  const list = combined.slice(0, MAX_IMAGES);
  if (list.length === 0) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>معاينة الصور (عرض {list.length} من {MAX_IMAGES})</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {list.map((url, idx) => (
          <div key={`${url}-${idx}`} style={{ width: 72, height: 72, borderRadius: 6, overflow: 'hidden', border: '1px solid #eee', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImgPreview src={url} alt={`preview-${idx + 1}`} size={72} />
          </div>
        ))}
      </div>
    </div>
  );
};

const ImgPreview = ({ src, alt, size = 160 }) => {
  const [failed, setFailed] = useState(false);
  const [diag, setDiag] = useState(null);
  const normalized = normalizeImageUrl(src || '');
  // if this is a Drive URL, route it through our image-proxy to avoid client embed issues
  const isDrive = /drive\.google\.com|drive\.usercontent\.googleapis\.com|drive\.usercontent\.google\.com|drive\.usercontent/.test(normalized);
  const previewSrc = isDrive ? buildImageProxyUrl(normalized) : normalized;
  // Diagnostic: log and try fetching the image to see browser behavior
  useEffect(() => {
    if (!normalized) return;
    console.debug('[ImgPreview] normalized URL ->', normalized);
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(normalized, { method: 'GET', mode: 'cors' });
        if (!mounted) return;
        setDiag({ ok: res.ok, status: res.status, type: res.headers.get('content-type') });
      } catch (err) {
        if (!mounted) return;
        setDiag({ error: err.message });
      }
    })();
    return () => { mounted = false; };
  }, [normalized]);
  if (!src) return null;
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {!failed ? (
        <img
          src={previewSrc}
          alt={alt}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setFailed(true)}
        />
      ) : (
        <div style={{ textAlign: 'center', fontSize: 11 }}>
          <div>تعذر تحميل الصورة</div>
          <a href={normalized} target="_blank" rel="noreferrer">فتح في نافذة جديدة</a>
        </div>
      )}
      {diag && (
        <div style={{ position: 'absolute', bottom: 2, left: 2, fontSize: 10, color: '#666' }}>
          {diag.error ? `fetch error: ${diag.error}` : `status: ${diag.status} type: ${diag.type}`}
        </div>
      )}
    </div>
  );
};

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

  const limitGalleryInput = (rawText, primaryCount = 0) => {
    const allowed = Math.max(0, MAX_IMAGES - primaryCount);
    const seen = new Set();
    const lines = (rawText || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const unique = [];
    for (const line of lines) {
      const norm = normalizeImageUrl(line);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      unique.push(norm);
      if (unique.length >= allowed) break;
    }
    return unique;
  };

  const save = async () => {
    if (!model.Name || !String(model.Name).trim()) return toast('اسم المنتج مطلوب', { type: 'error' });
    if (model.Sell === '' || model.Sell === null || isNaN(Number(model.Sell))) return toast('سعر البيع مطلوب', { type: 'error' });
    if (model.cost === '' || model.cost === null || isNaN(Number(model.cost))) return toast('التكلفة مطلوبة', { type: 'error' });
    // build combined list of images (primary, secondary, then gallery lines)
    const explicitPrimary = (model.imageUrl || '').toString().trim();
    const explicitSecondary = (model.secondaryImageUrl || '').toString().trim();
    const galleryLines = (model.imageGalleryText || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const combined = [];
    const seen = new Set();
    const pushUnique = (u) => {
      if (!u) return;
      const s = u.toString().trim();
      if (!s) return;
      if (seen.has(s)) return;
      seen.add(s);
      combined.push(s);
    };
    pushUnique(explicitPrimary);
    pushUnique(explicitSecondary);
    galleryLines.forEach(pushUnique);

    // apply max total images of 20
    const limited = combined.slice(0, MAX_IMAGES);

    const payload = {
      ...model,
      Sell: Number(model.Sell),
      QTY: Number(model.QTY),
      cost: Number(model.cost || 0),
      minQty: Number(model.minQty || 0),
      // keep first item as imageUrl, second as secondaryImageUrl, rest as imageGallery
      imageUrl: limited[0] || '',
      secondaryImageUrl: limited[1] || '',
      imageGallery: limited.slice(2)
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
            <div className="mb-2">
              <label className="form-label">رابط الصورة</label>
              <input
                className="form-control"
                value={model.imageUrl}
                onChange={e => setModel(m => ({ ...m, imageUrl: e.target.value }))}
                onBlur={e => setModel(m => ({ ...m, imageUrl: normalizeImageUrl(e.target.value) }))}
              />
              <small className="text-muted">يمكنك لصق رابط Google Drive (viewer أو share) أو أي رابط صورة مباشر، سيتم تحويله تلقائيًا.</small>
            </div>
            {model.imageUrl && (
              <div className="mb-2">
                <ImgPreview src={model.imageUrl} alt="preview" size={160} />
                <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>URL: <a href={normalizeImageUrl(model.imageUrl)} target="_blank" rel="noreferrer">{normalizeImageUrl(model.imageUrl)}</a></div>
              </div>
            )}
            <div className="mb-2">
              <label className="form-label">رابط صورة إضافية</label>
              <input
                className="form-control"
                value={model.secondaryImageUrl}
                onChange={e => setModel(m => ({ ...m, secondaryImageUrl: e.target.value }))}
                onBlur={e => setModel(m => ({ ...m, secondaryImageUrl: normalizeImageUrl(e.target.value) }))}
              />
              <small className="text-muted">يمكنك لصق رابط Google Drive (viewer أو share) أو أي رابط صورة مباشر، سيتم تحويله تلقائيًا.</small>
            </div>
            {model.secondaryImageUrl && (
              <div className="mb-2">
                <ImgPreview src={model.secondaryImageUrl} alt="preview-2" size={160} />
                <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>URL: <a href={normalizeImageUrl(model.secondaryImageUrl)} target="_blank" rel="noreferrer">{normalizeImageUrl(model.secondaryImageUrl)}</a></div>
              </div>
            )}
            <div className="mb-2">
              <label className="form-label">روابط صور إضافية (سطر لكل رابط)</label>
              <textarea
                className="form-control"
                rows={3}
                value={model.imageGalleryText}
                onChange={e => setModel(m => ({ ...m, imageGalleryText: e.target.value }))}
                onBlur={e => {
                  setModel(m => {
                    const primarySet = new Set();
                    const add = (v) => { const norm = normalizeImageUrl(v || ''); if (norm) primarySet.add(norm); };
                    add(m.imageUrl);
                    add(m.secondaryImageUrl);
                    const limited = limitGalleryInput(e.target.value, primarySet.size);
                    return { ...m, imageGalleryText: limited.join('\n') };
                  });
                }}
                placeholder="https://drive.google.com/file/d/FILEID/view?usp=sharing"
              />
              {(() => {
                const primarySet = new Set();
                const add = (v) => { const norm = normalizeImageUrl(v || ''); if (norm) primarySet.add(norm); };
                add(model.imageUrl);
                add(model.secondaryImageUrl);
                const galleryList = limitGalleryInput(model.imageGalleryText, primarySet.size);
                const used = primarySet.size + galleryList.length;
                const remaining = Math.max(0, MAX_IMAGES - used);
                return (
                  <>
                    <small className="text-muted">أضف الرابط واضغط Enter لإضافة التالي. يتم قبول روابط Google Drive (viewer/share) أو أي رابط صورة مباشر.</small>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>المتاح: {remaining} من {MAX_IMAGES} (يشمل الرئيسي والثانوي).</div>
                  </>
                );
              })()}
              {/** gallery preview (show up to 20 combined images including imageUrl & secondary) */}
              <GalleryPreview model={model} />
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
              const thumb = getPrimaryImage(p);
              return (
              <div key={p._id} className="mb-2 p-2" style={{ border: '1px solid #eee', borderRadius: 6 }}>
                <div className="d-flex">
                  <div style={{ width: 96, height: 96, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', marginInlineEnd: 12, border: '1px solid #f0f0f0' }}>
                    {thumb ? <img src={thumb} alt={p.Name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{ fontSize: 11, color: '#999' }}>لا توجد صورة</div>}
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
