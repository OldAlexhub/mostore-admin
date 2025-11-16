import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';

const Customers = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    const res = await api.get('/orders/customers');
    if (res.ok) setList(res.data || []);
    else toast(res.error || 'تعذر تحميل العملاء', { type: 'error' });
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const download = async () => {
    try {
      const res = await api.instance.get('/orders/customers.csv', { responseType: 'blob' });
      if (res && res.data) {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        toast('تعذر تنزيل الملف', { type: 'error' });
      }
    } catch {
      toast('تعذر تنزيل الملف', { type: 'error' });
    }
  };

  return (
    <div dir="rtl">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h3 className="mb-0">عملاء المتجر</h3>
          <div className="text-muted">قائمة بكل العملاء الذين قاموا بالشراء من خلال الطلبات.</div>
        </div>
        <button className="btn btn-sm btn-outline-success" onClick={download}>تصدير CSV</button>
      </div>

      {loading && <div>جارٍ التحميل...</div>}
      {!loading && list.length === 0 && <div className="text-muted">لا يوجد بيانات عملاء بعد.</div>}

      {!loading && list.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الهاتف</th>
                <th>العنوان</th>
                <th>عدد الطلبات</th>
                <th>إجمالي المشتريات</th>
                <th>آخر طلب</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.phoneNumber}>
                  <td>{c.name || '-'}</td>
                  <td>{c.phoneNumber}</td>
                  <td>{c.address || '-'}</td>
                  <td>{c.totalOrders}</td>
                  <td>ج.م {c.totalSpend}</td>
                  <td>{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleString('ar-EG') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Customers;
