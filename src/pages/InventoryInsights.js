import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';

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
      else toast(res.error || 'Failed to load insights', { type: 'error' });
    } catch (e) { toast('Failed to load insights', { type: 'error' }); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  const exportCsv = (list, name, mapRow) => {
    const header = Object.keys(mapRow(list[0] || {}));
    const rows = (list || []).map(item => header.map(h => {
      const v = mapRow(item)[h];
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.indexOf('"') !== -1 || s.indexOf(',') !== -1 || s.indexOf('\n') !== -1) return '"' + s.replace(/"/g,'""') + '"';
      return s;
    }).join(','));
    const csv = [header.join(',')].concat(rows).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${name}-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h3>Stock Insights / إدارة المخزون</h3>
      <div className="mb-3">Quick view of top sellers, slow sellers and low stock items to help buying and promotions</div>

      <div style={{display:'flex', gap:8, marginBottom:12}}>
        <div>Window (days): <input type="number" className="form-control" value={days} onChange={e=>setDays(parseInt(e.target.value||0,10))} style={{width:120, display:'inline-block', marginLeft:8}} /></div>
        <div>Top N: <input type="number" className="form-control" value={topN} onChange={e=>setTopN(parseInt(e.target.value||0,10))} style={{width:120, display:'inline-block', marginLeft:8}} /></div>
        <div><button className="btn btn-secondary" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button></div>
      </div>

      {insights && (
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
          <div style={{padding:12, border:'1px solid #eee', borderRadius:6}}>
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <strong>High Demand (Top {topN})</strong>
              <div><button className="btn btn-sm btn-outline-primary" onClick={()=>exportCsv(insights.highDemand, 'high-demand', (r)=>({ productId: r.productId, name: r.product?.Name || r.inventory?.Name || '', soldQty: r.soldQty, currentQty: r.inventory?.currentQty || '' }))}>Export CSV</button></div>
            </div>
            <div style={{marginTop:8}}>
              {insights.highDemand.map(h=> (
                <div key={h.productId} style={{padding:8, borderBottom:'1px solid #f2f2f2'}}>
                  <div style={{fontWeight:700}}>{h.product?.Name || h.inventory?.Name || '—'}</div>
                  <div className="text-muted">Sold: {h.soldQty} — Stock: {h.inventory?.currentQty ?? '—'}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{padding:12, border:'1px solid #eee', borderRadius:6}}>
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <strong>Slow Selling</strong>
              <div><button className="btn btn-sm btn-outline-primary" onClick={()=>exportCsv(insights.slowSelling, 'slow-selling', (r)=>({ inventoryId: r._id, name: r.Name, currentQty: r.currentQty }))}>Export CSV</button></div>
            </div>
            <div style={{marginTop:8}}>
              {insights.slowSelling.map(s=> (
                <div key={s._id} style={{padding:8, borderBottom:'1px solid #f2f2f2'}}>
                  <div style={{fontWeight:700}}>{s.Name}</div>
                  <div className="text-muted">Stock: {s.currentQty} — Min: {s.minQty || 0}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{gridColumn:'1 / -1', padding:12, border:'1px solid #eee', borderRadius:6}}>
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <strong>Low Stock</strong>
              <div><button className="btn btn-sm btn-outline-primary" onClick={()=>exportCsv(insights.lowStock, 'low-stock', (r)=>({ inventoryId: r._id, name: r.Name, currentQty: r.currentQty, minQty: r.minQty }))}>Export CSV</button></div>
            </div>
            <div style={{marginTop:8}}>
              {insights.lowStock.map(l=> (
                <div key={l._id} style={{padding:8, borderBottom:'1px solid #f2f2f2'}}>
                  <div style={{fontWeight:700}}>{l.Name}</div>
                  <div className="text-muted">Stock: {l.currentQty} — Min: {l.minQty || 0}</div>
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
