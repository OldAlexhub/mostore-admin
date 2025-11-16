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
      const res = await api.instance.get(path, { responseType: 'blob' });
      if (res && res.data) {
        downloadBlob(res.data, filename);
        toast('تم تنزيل الملف');
      } else {
        toast('تعذر تحميل الملف', { type: 'error' });
      }
    } catch {
      toast('تعذر تحميل الملف', { type: 'error' });
    } finally {
      setLoading(null);
    }
  };

  const cards = [
    { title: 'العملاء', description: 'يشمل إجمالي مشتريات كل عميل', path: '/reports/users', file: () => `users-${Date.now()}.csv` },
    { title: 'الطلبات', description: 'تفاصيل الطلبات والكوبونات', path: '/reports/orders', file: () => `orders-${Date.now()}.csv` },
    { title: 'المنتجات', description: 'قائمة المنتجات والمخزون والأسعار', path: '/reports/products', file: () => `products-${Date.now()}.csv` },
    { title: 'العروض الترويجية', description: 'جميع الأكواد وعدد الاستخدام', path: '/reports/promotions', file: () => `promotions-${Date.now()}.csv` }
  ];

  return (
    <div dir="rtl">
      <h3>التقارير</h3>
      <div className="mb-3 text-muted">قم بتنزيل ملفات CSV للاحتفاظ بنسخة احتياطية أو تحليل البيانات خارج النظام.</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
        {cards.map(card => (
          <div key={card.title} style={{ padding: 12, border: '1px solid #eee', borderRadius: 6 }}>
            <div style={{ fontWeight: 700 }}>{card.title}</div>
            <div className="text-muted">{card.description}</div>
            <div className="mt-2">
              <button className="btn btn-sm btn-primary" disabled={loading === card.path} onClick={() => download(card.path, card.file())}>
                {loading === card.path ? 'جاري التنزيل...' : 'تنزيل CSV'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;
