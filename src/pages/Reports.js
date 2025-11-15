import { useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const Reports = () => {
  const [loading, setLoading] = useState(null);
  const toast = useToast();

  const download = async (path, filename) => {
    try {
      setLoading(path);
      // use instance to get blob
      const res = await api.instance.get(path, { responseType: 'blob' });
      if (res && res.data) {
        downloadBlob(res.data, filename);
        toast('تم التحميل');
      } else {
        toast('Failed to download', { type: 'error' });
      }
    } catch (e) {
      toast('Failed to download', { type: 'error' });
    } finally { setLoading(null); }
  };

  return (
    <div>
      <h3>Reports / تقارير</h3>
      <div className="mb-3 text-muted">Download CSV exports of collections for offline analysis or backups.</div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:12}}>
        <div style={{padding:12, border:'1px solid #eee', borderRadius:6}}>
          <div style={{fontWeight:700}}>Users</div>
          <div className="text-muted">Includes totalSpend (excludes cancelled orders)</div>
          <div className="mt-2"><button className="btn btn-sm btn-primary" disabled={loading=== '/reports/users'} onClick={()=>download('/reports/users', `users-${Date.now()}.csv`)}>{loading==='/reports/users' ? 'Downloading…' : 'Download CSV'}</button></div>
        </div>

        <div style={{padding:12, border:'1px solid #eee', borderRadius:6}}>
          <div style={{fontWeight:700}}>Orders</div>
          <div className="text-muted">Basic order fields and coupon info</div>
          <div className="mt-2"><button className="btn btn-sm btn-primary" disabled={loading=== '/reports/orders'} onClick={()=>download('/reports/orders', `orders-${Date.now()}.csv`)}>{loading==='/reports/orders' ? 'Downloading…' : 'Download CSV'}</button></div>
        </div>

        <div style={{padding:12, border:'1px solid #eee', borderRadius:6}}>
          <div style={{fontWeight:700}}>Products</div>
          <div className="text-muted">Product catalog with stock and pricing</div>
          <div className="mt-2"><button className="btn btn-sm btn-primary" disabled={loading=== '/reports/products'} onClick={()=>download('/reports/products', `products-${Date.now()}.csv`)}>{loading==='/reports/products' ? 'Downloading…' : 'Download CSV'}</button></div>
        </div>

        <div style={{padding:12, border:'1px solid #eee', borderRadius:6}}>
          <div style={{fontWeight:700}}>Promotions</div>
          <div className="text-muted">All promo codes and usage counts</div>
          <div className="mt-2"><button className="btn btn-sm btn-primary" disabled={loading=== '/reports/promotions'} onClick={()=>download('/reports/promotions', `promotions-${Date.now()}.csv`)}>{loading==='/reports/promotions' ? 'Downloading…' : 'Download CSV'}</button></div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
