import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';
import { downloadCsvFromBlob, downloadCsvFromText } from '../utils/csv';

const defaultFilters = {
  category: '',
  subcategory: '',
  material: '',
  season: '',
  style: '',
  range: 'this-month',
  start: '',
  end: '',
  limit: 50,
  minUnits: ''
};

const defaultProductFilters = {
  category: '',
  subcategory: '',
  material: '',
  season: '',
  style: '',
  minQty: '',
  search: ''
};

const Reports = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [loadingCard, setLoadingCard] = useState(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [filterOptions, setFilterOptions] = useState({ categories: [], subcategories: [], materials: [], seasons: [], styles: [] });
  const [salesFilters, setSalesFilters] = useState(defaultFilters);
  const [salesResults, setSalesResults] = useState([]);
  const [salesMeta, setSalesMeta] = useState(null);
  const [salesError, setSalesError] = useState(null);
  const [salesQuery, setSalesQuery] = useState('');
  const [productFilters, setProductFilters] = useState(defaultProductFilters);
  const [productResults, setProductResults] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const loadFilters = async () => {
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
    loadFilters();
  }, []);

  const download = async (path, filename) => {
    try {
      setLoadingCard(path);
      const res = await api.instance.get(path, { responseType: 'blob' });
      if (res && res.data) {
        await downloadCsvFromBlob(res.data, filename);
        toast('تم تنزيل الملف');
      } else {
        toast('تعذر تحميل الملف', { type: 'error' });
      }
    } catch {
      toast('تعذر تحميل الملف', { type: 'error' });
    } finally {
      setLoadingCard(null);
    }
  };

  const cards = [
    { title: 'العملاء', description: 'يشمل إجمالي مشتريات كل عميل', path: '/reports/users', file: () => `users-${Date.now()}.csv` },
    { title: 'الطلبات', description: 'تفاصيل الطلبات والكوبونات', path: '/reports/orders', file: () => `orders-${Date.now()}.csv` },
    { title: 'المنتجات', description: 'قائمة المنتجات والمخزون والأسعار', path: '/reports/products', file: () => `products-${Date.now()}.csv` },
    { title: 'العروض الترويجية', description: 'جميع الأكواد وعدد الاستخدام', path: '/reports/promotions', file: () => `promotions-${Date.now()}.csv` }
  ];

  const handleSalesFilterChange = (field, value) => {
    setSalesFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleProductFilterChange = (field, value) => {
    setProductFilters((prev) => ({ ...prev, [field]: value }));
  };

  const resetSalesFilters = () => {
    setSalesFilters(defaultFilters);
    setSalesResults([]);
    setSalesMeta(null);
    setSalesError(null);
    setSalesQuery('');
  };

  const buildSalesQuery = () => {
    const params = new URLSearchParams();
    params.set('range', salesFilters.range);
    if (salesFilters.category) params.set('category', salesFilters.category);
    if (salesFilters.subcategory) params.set('subcategory', salesFilters.subcategory);
    if (salesFilters.material) params.set('material', salesFilters.material);
    if (salesFilters.season) params.set('season', salesFilters.season);
    if (salesFilters.style) params.set('style', salesFilters.style);
    if (salesFilters.range === 'custom') {
      if (salesFilters.start) params.set('start', salesFilters.start);
      if (salesFilters.end) params.set('end', salesFilters.end);
    }
    if (salesFilters.limit) params.set('limit', String(salesFilters.limit));
    if (salesFilters.minUnits) params.set('minUnits', String(salesFilters.minUnits));
    return params.toString();
  };

  const runProductSalesReport = async (e) => {
    e.preventDefault();
    try {
      setSalesLoading(true);
      setSalesError(null);
      const query = buildSalesQuery();
      const res = await api.get(`/reports/product-sales?${query}`);
      if (!res.ok) throw new Error(res.error || 'تعذر تحميل التقرير');
      setSalesResults(res.data?.rows || []);
      setSalesMeta(res.data?.meta || null);
      setSalesQuery(query);
      toast('تم تحديث التقرير');
    } catch (err) {
      setSalesResults([]);
      setSalesMeta(null);
      setSalesQuery('');
      setSalesError(err.message || 'تعذر تحميل التقرير');
      toast(err.message || 'تعذر تحميل التقرير', { type: 'error' });
    } finally {
      setSalesLoading(false);
    }
  };

  const downloadCurrentReport = async () => {
    if (!salesQuery) return;
    try {
      const append = `${salesQuery}${salesQuery ? '&' : ''}format=csv`;
      const res = await api.instance.get(`/reports/product-sales?${append}`, { responseType: 'blob' });
      if (!res || !res.data) throw new Error('تعذر تنزيل الملف');
      await downloadCsvFromBlob(res.data, `product-sales-${Date.now()}.csv`);
      toast('تم تنزيل ملف التقرير');
    } catch (err) {
      toast(err.message || 'تعذر تنزيل الملف', { type: 'error' });
    }
  };

  const numberFormatter = useMemo(() => new Intl.NumberFormat('ar-EG'), []);
  const currencyFormatter = useMemo(() => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }), []);
  const formatDate = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString('ar-EG');
    } catch {
      return value;
    }
  };

  const runProductInventoryReport = async (e) => {
    e.preventDefault();
    try {
      setProductLoading(true);
      setProductError(null);
      const params = new URLSearchParams();
      if (productFilters.category) params.set('Category', productFilters.category);
      if (productFilters.subcategory) params.set('Subcategory', productFilters.subcategory);
      if (productFilters.material) params.set('Material', productFilters.material);
      if (productFilters.season) params.set('Season', productFilters.season);
      if (productFilters.style) params.set('Style', productFilters.style);
      const query = params.toString();
      const endpoint = query ? `/products?${query}` : '/products';
      const res = await api.get(endpoint);
      if (!res.ok) throw new Error(res.error || 'تعذر تحميل المنتجات');
      const items = Array.isArray(res.data?.products) ? res.data.products : Array.isArray(res.data) ? res.data : [];
      const filtered = items.filter((p) => {
        const matchesSearch = productFilters.search
          ? (p.Name || '').toLowerCase().includes(productFilters.search.toLowerCase()) ||
            String(p.Number || '').includes(productFilters.search)
          : true;
        const meetsQty = productFilters.minQty !== ''
          ? Number(p.QTY ?? 0) <= Number(productFilters.minQty)
          : true;
        return matchesSearch && meetsQty;
      });
      setProductResults(filtered);
      toast('تم تحديث تقرير المنتجات');
    } catch (err) {
      setProductResults([]);
      setProductError(err.message || 'تعذر تحميل المنتجات');
      toast(err.message || 'تعذر تحميل المنتجات', { type: 'error' });
    } finally {
      setProductLoading(false);
    }
  };

  const resetProductFilters = () => {
    setProductFilters(defaultProductFilters);
    setProductResults([]);
    setProductError(null);
  };

  const downloadProductReport = () => {
    if (!productResults.length) return;
    const header = ['Number', 'Name', 'Category', 'Subcategory', 'Material', 'Season', 'Style', 'QTY', 'minQty', 'Sell', 'cost'];
    const rows = productResults.map((p) => header.map((key) => (p[key] ?? '')).join(','));
    const csv = [header.join(',')].concat(rows).join('\n');
    downloadCsvFromText(csv, `products-report-${Date.now()}.csv`);
  };

  return (
    <div dir="rtl">
      <h3>التقارير</h3>
      <div className="mb-3 text-muted">قم بتنزيل ملفات CSV أو شغّل التقارير التفصيلية داخل النظام.</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {cards.map(card => (
          <div key={card.title} style={{ padding: 12, border: '1px solid #eee', borderRadius: 6 }}>
            <div style={{ fontWeight: 700 }}>{card.title}</div>
            <div className="text-muted">{card.description}</div>
            <div className="mt-2">
              <button className="btn btn-sm btn-primary" disabled={loadingCard === card.path} onClick={() => download(card.path, card.file())}>
                {loadingCard === card.path ? 'جاري التنزيل...' : 'تنزيل CSV'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-4 p-3">
        <div className="d-flex gap-2 border-bottom pb-2 mb-3 flex-wrap">
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'sales' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('sales')}
          >
            تقرير مبيعات المنتجات
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'products' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('products')}
          >
            تقرير المنتجات والمخزون
          </button>
        </div>

        {activeTab === 'sales' && (
        <>
        <p className="text-muted mb-3">اضبط الفلاتر، شغّل التقرير لرؤية النتائج في الجدول، ثم حمّله كملف CSV إذا احتجت إليه.</p>
        <form className="row g-3" onSubmit={runProductSalesReport}>
          <div className="col-12 col-md-4">
            <label className="form-label">القسم الرئيسي</label>
            <select className="form-select" value={salesFilters.category} onChange={(e) => handleSalesFilterChange('category', e.target.value)}>
              <option value="">الكل</option>
              {filterOptions.categories.map((cat) => (
                <option key={cat || 'cat-empty'} value={cat}>{cat || 'غير محدد'}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">التصنيف الفرعي</label>
            <select className="form-select" value={salesFilters.subcategory} onChange={(e) => handleSalesFilterChange('subcategory', e.target.value)}>
              <option value="">الكل</option>
              {filterOptions.subcategories.map((sub) => (
                <option key={sub || 'sub-empty'} value={sub}>{sub || 'غير محدد'}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">الخامة</label>
            <select className="form-select" value={salesFilters.material} onChange={(e) => handleSalesFilterChange('material', e.target.value)}>
              <option value="">الكل</option>
              {filterOptions.materials.map((mat) => (
                <option key={mat || 'mat-empty'} value={mat}>{mat || 'غير محدد'}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">الموسم</label>
            <select className="form-select" value={salesFilters.season} onChange={(e) => handleSalesFilterChange('season', e.target.value)}>
              <option value="">الكل</option>
              {filterOptions.seasons.map((sea) => (
                <option key={sea || 'season-empty'} value={sea}>{sea || 'غير محدد'}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">الستايل</label>
            <select className="form-select" value={salesFilters.style} onChange={(e) => handleSalesFilterChange('style', e.target.value)}>
              <option value="">الكل</option>
              {filterOptions.styles.map((st) => (
                <option key={st || 'style-empty'} value={st}>{st || 'غير محدد'}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">الفترة الزمنية</label>
            <select className="form-select" value={salesFilters.range} onChange={(e) => handleSalesFilterChange('range', e.target.value)}>
              <option value="this-month">هذا الشهر</option>
              <option value="last-month">الشهر الماضي</option>
              <option value="last-quarter">الربع السابق</option>
              <option value="last-6-months">آخر 6 أشهر</option>
              <option value="last-12-months">آخر 12 شهر</option>
              <option value="custom">فترة مخصصة</option>
            </select>
          </div>
          {salesFilters.range === 'custom' && (
            <>
              <div className="col-6 col-md-3">
                <label className="form-label">تاريخ البداية</label>
                <input type="date" className="form-control" value={salesFilters.start} onChange={(e) => handleSalesFilterChange('start', e.target.value)} />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">تاريخ النهاية</label>
                <input type="date" className="form-control" value={salesFilters.end} onChange={(e) => handleSalesFilterChange('end', e.target.value)} />
              </div>
            </>
          )}
          <div className="col-12 col-md-3">
            <label className="form-label">عدد المنتجات (أعلى نتيجة)</label>
            <input type="number" className="form-control" min="1" max="500" value={salesFilters.limit} onChange={(e) => handleSalesFilterChange('limit', e.target.value)} />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">حد أدنى للوحدات المباعة</label>
            <input type="number" className="form-control" min="0" value={salesFilters.minUnits} onChange={(e) => handleSalesFilterChange('minUnits', e.target.value)} />
          </div>
          <div className="col-12 d-flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary" disabled={salesLoading}>{salesLoading ? 'جاري تجهيز التقرير...' : 'تشغيل التقرير'}</button>
            <button type="button" className="btn btn-outline-secondary" onClick={resetSalesFilters} disabled={salesLoading}>مسح الإعدادات</button>
            {salesResults.length > 0 && (
              <button type="button" className="btn btn-outline-success ms-auto" onClick={downloadCurrentReport}>تنزيل CSV للتقرير الحالي</button>
            )}
          </div>
        </form>

        {salesError && <div className="alert alert-danger mt-3">{salesError}</div>}

        {salesResults.length > 0 && (
          <div className="mt-4">
            <div className="d-flex flex-wrap justify-content-between mb-3">
              <div>
                <strong>{salesMeta?.count || 0}</strong> منتج — إجمالي الوحدات: <strong>{numberFormatter.format(salesMeta?.totalUnits || 0)}</strong>
              </div>
              <div>إجمالي المبيعات: <strong>{currencyFormatter.format(salesMeta?.totalGrossSales || 0)}</strong></div>
            </div>
            <div className="table-responsive">
              <table className="table table-striped table-sm">
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>الكود</th>
                    <th>القسم</th>
                    <th>التصنيف</th>
                    <th>الخامة</th>
                    <th>الموسم</th>
                    <th>الستايل</th>
                    <th>الوحدات المباعة</th>
                    <th>إجمالي المبيعات</th>
                    <th>متوسط السعر</th>
                    <th>آخر طلب</th>
                  </tr>
                </thead>
                <tbody>
                  {salesResults.map((row) => (
                    <tr key={`${row.productId || row.number}-${row.lastOrderDate}`}>
                      <td>{row.name || '-'}</td>
                      <td>{row.number || '-'}</td>
                      <td>{row.category || '-'}</td>
                      <td>{row.subcategory || '-'}</td>
                      <td>{row.material || '-'}</td>
                      <td>{row.season || '-'}</td>
                      <td>{row.style || '-'}</td>
                      <td>{numberFormatter.format(row.unitsSold || 0)}</td>
                      <td>{currencyFormatter.format(row.grossSales || 0)}</td>
                      <td>{currencyFormatter.format(row.avgPrice || 0)}</td>
                      <td>{formatDate(row.lastOrderDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!salesLoading && !salesError && salesResults.length === 0 && salesQuery && (
          <div className="alert alert-info mt-3">لا توجد نتائج تطابق الفلاتر المحددة.</div>
        )}
        </>
        )}

        {activeTab === 'products' && (
          <>
            <p className="text-muted mb-3">تقرير المنتجات الحالي يسمح لك بتصفية الأصناف حسب الأقسام والخامات والحد الأدنى للمخزون لسرعة المتابعة.</p>
            <form className="row g-3" onSubmit={runProductInventoryReport}>
              <div className="col-12 col-md-4">
                <label className="form-label">القسم الرئيسي</label>
                <select className="form-select" value={productFilters.category} onChange={(e) => handleProductFilterChange('category', e.target.value)}>
                  <option value="">الكل</option>
                  {filterOptions.categories.map((cat) => (
                    <option key={cat || 'prod-cat-empty'} value={cat}>{cat || 'غير محدد'}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">التصنيف الفرعي</label>
                <select className="form-select" value={productFilters.subcategory} onChange={(e) => handleProductFilterChange('subcategory', e.target.value)}>
                  <option value="">الكل</option>
                  {filterOptions.subcategories.map((sub) => (
                    <option key={sub || 'prod-sub-empty'} value={sub}>{sub || 'غير محدد'}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">الخامة</label>
                <select className="form-select" value={productFilters.material} onChange={(e) => handleProductFilterChange('material', e.target.value)}>
                  <option value="">الكل</option>
                  {filterOptions.materials.map((mat) => (
                    <option key={mat || 'prod-mat-empty'} value={mat}>{mat || 'غير محدد'}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">الموسم</label>
                <select className="form-select" value={productFilters.season} onChange={(e) => handleProductFilterChange('season', e.target.value)}>
                  <option value="">الكل</option>
                  {filterOptions.seasons.map((sea) => (
                    <option key={sea || 'prod-season-empty'} value={sea}>{sea || 'غير محدد'}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">الستايل</label>
                <select className="form-select" value={productFilters.style} onChange={(e) => handleProductFilterChange('style', e.target.value)}>
                  <option value="">الكل</option>
                  {filterOptions.styles.map((st) => (
                    <option key={st || 'prod-style-empty'} value={st}>{st || 'غير محدد'}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">بحث بالاسم أو الكود</label>
                <input className="form-control" value={productFilters.search} onChange={(e) => handleProductFilterChange('search', e.target.value)} placeholder="مثال: فستان صيفي" />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">حد أقصى للمخزون</label>
                <input className="form-control" type="number" min="0" value={productFilters.minQty} onChange={(e) => handleProductFilterChange('minQty', e.target.value)} placeholder="مثال: 5" />
              </div>
              <div className="col-12 d-flex flex-wrap gap-2">
                <button type="submit" className="btn btn-primary" disabled={productLoading}>{productLoading ? 'جاري التحميل...' : 'تشغيل التقرير'}</button>
                <button type="button" className="btn btn-outline-secondary" onClick={resetProductFilters} disabled={productLoading}>مسح الإعدادات</button>
                {productResults.length > 0 && (
                  <button type="button" className="btn btn-outline-success ms-auto" onClick={downloadProductReport}>تنزيل CSV للتقرير الحالي</button>
                )}
              </div>
            </form>

            {productError && <div className="alert alert-danger mt-3">{productError}</div>}

            {productResults.length > 0 && (
              <div className="table-responsive mt-4">
                <table className="table table-striped table-sm">
                  <thead>
                    <tr>
                      <th>اسم المنتج</th>
                      <th>الكود</th>
                      <th>القسم</th>
                      <th>التصنيف</th>
                      <th>الخامة</th>
                      <th>الموسم</th>
                      <th>الستايل</th>
                      <th>الكمية المتاحة</th>
                      <th>حد التنبيه</th>
                      <th>سعر البيع</th>
                      <th>التكلفة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productResults.map((product) => (
                      <tr key={product._id || product.Number || product.Name}>
                        <td>{product.Name || '-'}</td>
                        <td>{product.Number || '-'}</td>
                        <td>{product.Category || '-'}</td>
                        <td>{product.Subcategory || '-'}</td>
                        <td>{product.Material || '-'}</td>
                        <td>{product.Season || '-'}</td>
                        <td>{product.Style || '-'}</td>
                        <td>{numberFormatter.format(product.QTY ?? 0)}</td>
                        <td>{numberFormatter.format(product.minQty ?? 0)}</td>
                        <td>{currencyFormatter.format(product.Sell || 0)}</td>
                        <td>{currencyFormatter.format(product.cost || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!productLoading && !productError && productResults.length === 0 && (
              <div className="alert alert-info mt-3">قم بتحديد الفلاتر ثم اضغط تشغيل التقرير لعرض المنتجات.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
