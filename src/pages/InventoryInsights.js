import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';
import { downloadCsvFromText } from '../utils/csv';

const InventoryInsights = () => {
  const [days, setDays] = useState(30);
  const [topN, setTopN] = useState(10);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/inventory/insights?days=${days}&top=${topN}`);
      if (res.ok) setInsights(res.data);
      else toast(res.error || 'تعذر تحميل البيانات', { type: 'error' });
    } catch {
      toast('تعذر تحميل البيانات', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = (list, name, mapRow) => {
    if (!list || !list.length) return;
    const header = Object.keys(mapRow(list[0]));
    const rows = list.map(item => header.map(h => {
      const v = mapRow(item)[h];
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    }).join(','));
    const csv = [header.join(',')].concat(rows).join('\n');
    downloadCsvFromText(csv, `${name}-${Date.now()}.csv`);
  };

  return (
    <div dir="rtl">
      <h3>تحليلات المخزون</h3>
      <div className="text-muted mb-3">تعرف على أكثر الأصناف طلباً، وبطيئة البيع، والمنتجات التي تحتاج إلى إعادة توريد.</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>عدد الأيام: <input type="number" className="form-control" value={days} onChange={e => setDays(parseInt(e.target.value || 0, 10))} style={{ width: 120, display: 'inline-block', marginInlineStart: 8 }} /></div>
        <div>عدد النتائج: <input type="number" className="form-control" value={topN} onChange={e => setTopN(parseInt(e.target.value || 0, 10))} style={{ width: 120, display: 'inline-block', marginInlineStart: 8 }} /></div>
        <div><button className="btn btn-secondary" onClick={load} disabled={loading}>{loading ? 'يتم التحميل...' : 'تحديث'}</button></div>
      </div>

      {insights && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>الأكثر طلباً (أعلى {topN})</strong>
              <button className="btn btn-sm btn-outline-primary" onClick={() => exportCsv(insights.highDemand, 'high-demand', (r) => ({ productId: r.productId, name: r.product?.Name || r.inventory?.Name || '', soldQty: r.soldQty, currentQty: r.inventory?.currentQty || '' }))}>تصدير</button>
            </div>
            <div style={{ marginTop: 8 }}>
              {insights.highDemand.map(item => (
                <div key={item.productId} style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>
                  <div style={{ fontWeight: 700 }}>{item.product?.Name || item.inventory?.Name || '-'}</div>
                  <div className="text-muted">مباع: {item.soldQty} / المتوفر: {item.inventory?.currentQty ?? '-'}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>بطيئة الحركة</strong>
              <button className="btn btn-sm btn-outline-primary" onClick={() => exportCsv(insights.slowSelling, 'slow-selling', (r) => ({ inventoryId: r._id, name: r.Name, currentQty: r.currentQty, minQty: r.minQty || 0 }))}>تصدير</button>
            </div>
            <div style={{ marginTop: 8 }}>
              {insights.slowSelling.map(item => (
                <div key={item._id} style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>
                  <div style={{ fontWeight: 700 }}>{item.Name}</div>
                  <div className="text-muted">المتوفر: {item.currentQty} - الحد الأدنى: {item.minQty || 0}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1', padding: 12, border: '1px solid #eee', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>أصناف تحتاج إعادة توريد</strong>
              <button className="btn btn-sm btn-outline-primary" onClick={() => exportCsv(insights.lowStock, 'low-stock', (r) => ({ inventoryId: r._id, name: r.Name, currentQty: r.currentQty, minQty: r.minQty }))}>تصدير</button>
            </div>
            <div style={{ marginTop: 8 }}>
              {insights.lowStock.map(item => (
                <div key={item._id} style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>
                  <div style={{ fontWeight: 700 }}>{item.Name}</div>
                  <div className="text-muted">المتوفر: {item.currentQty} - الحد الأدنى: {item.minQty || 0}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryInsights;
