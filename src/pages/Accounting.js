import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';
import { downloadCsvFromBlob } from '../utils/csv';

const Accounting = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ amount: '', category: '', description: '', date: '' });
  const [pl, setPl] = useState(null);
  const [range, setRange] = useState({ start: '', end: '', group: 'none' });
  const toast = useToast();

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounting/expenses?limit=200');
      if (res.ok) setExpenses(res.data.expenses || res.data || []);
      else toast('تعذر تحميل المصروفات', { type: 'error' });
    } catch {
      toast('تعذر تحميل المصروفات', { type: 'error' });
    }
    setLoading(false);
  };

  useEffect(() => { loadExpenses(); }, []);

  const saveExpense = async () => {
    if (!form.amount) return toast('المبلغ مطلوب', { type: 'error' });
    const payload = { ...form, amount: Number(form.amount) };
    const res = await api.post('/accounting/expenses', payload);
    if (res.ok) {
      toast('تم حفظ المصروف', { type: 'success' });
      setForm({ amount: '', category: '', description: '', date: '' });
      loadExpenses();
    } else toast(res.error || 'تعذر الحفظ', { type: 'error' });
  };

  const remove = async (id) => {
    if (!window.confirm('حذف هذا المصروف؟')) return;
    const res = await api.del(`/accounting/expenses/${id}`);
    if (res.ok) {
      toast('تم الحذف', { type: 'success' });
      loadExpenses();
    } else toast(res.error || 'تعذر الحذف', { type: 'error' });
  };

  const genPL = async () => {
    try {
      const qs = [];
      if (range.start) qs.push(`start=${encodeURIComponent(range.start)}`);
      if (range.end) qs.push(`end=${encodeURIComponent(range.end)}`);
      if (range.group) qs.push(`group=${encodeURIComponent(range.group)}`);
      const url = `/accounting/pl${qs.length ? `?${qs.join('&')}` : ''}`;
      const res = await api.get(url);
      if (res.ok) setPl(res.data);
      else toast(res.error || 'تعذر إنشاء التقرير', { type: 'error' });
    } catch {
      toast('تعذر إنشاء التقرير', { type: 'error' });
    }
  };

  const exportCsv = async () => {
    try {
      const qs = [];
      if (range.start) qs.push(`start=${encodeURIComponent(range.start)}`);
      if (range.end) qs.push(`end=${encodeURIComponent(range.end)}`);
      if (range.group) qs.push(`group=${encodeURIComponent(range.group)}`);
      const url = `/accounting/pl.csv${qs.length ? `?${qs.join('&')}` : ''}`;
      const res = await api.instance.get(url, { responseType: 'blob' });
      if (res && res.data) {
        await downloadCsvFromBlob(res.data, `pl-${Date.now()}.csv`);
      } else {
        toast('تعذر تصدير الملف', { type: 'error' });
      }
    } catch {
      toast('تعذر تصدير الملف', { type: 'error' });
    }
  };

  return (
    <div dir="rtl">
      <h3>إدارة الحسابات والمصروفات</h3>
      <div className="text-muted mb-3">تابع مصروفات التشغيل واطلع على ملخص الأرباح والخسائر.</div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="card p-3 mb-3">
            <h5>تسجيل مصروف جديد</h5>
            <div className="mb-2"><label>المبلغ</label><input className="form-control" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div className="mb-2"><label>التصنيف</label><input className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
            <div className="mb-2"><label>التاريخ</label><input className="form-control" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="mb-2"><label>الوصف</label><input className="form-control" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><button className="btn btn-primary" onClick={saveExpense}>حفظ المصروف</button></div>
          </div>

          <div className="card p-3">
            <h5>قائمة المصروفات</h5>
            {loading && <div>جاري التحميل...</div>}
            {!loading && expenses.map((e) => (
              <div key={e._id} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, borderBottom: '1px solid #eee' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{e.category} - {e.amount}</div>
                  <div className="text-muted">{new Date(e.date).toLocaleString('ar-EG')} - {e.description}</div>
                </div>
                <div><button className="btn btn-sm btn-outline-danger" onClick={() => remove(e._id)}>حذف</button></div>
              </div>
            ))}
            {!loading && expenses.length === 0 && <div className="text-muted text-center py-3">لا توجد بيانات بعد.</div>}
          </div>
        </div>

        <div style={{ width: 420 }}>
          <div className="card p-3 mb-3">
            <h5>تقرير الأرباح والخسائر</h5>
            <div className="mb-2"><label>بداية المدة</label><input type="date" className="form-control" value={range.start} onChange={e => setRange(r => ({ ...r, start: e.target.value }))} /></div>
            <div className="mb-2"><label>نهاية المدة</label><input type="date" className="form-control" value={range.end} onChange={e => setRange(r => ({ ...r, end: e.target.value }))} /></div>
            <div className="mb-2">
              <label>طريقة التجميع</label>
              <select className="form-control" value={range.group} onChange={e => setRange(r => ({ ...r, group: e.target.value }))}>
                <option value="none">بدون تجميع</option>
                <option value="month">شهري</option>
                <option value="year">سنوي</option>
              </select>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-primary" onClick={genPL}>عرض التقرير</button>
              {pl && <button className="btn btn-outline-secondary" onClick={exportCsv}>تصدير CSV</button>}
            </div>

            {pl && (
              <div style={{ marginTop: 12 }}>
                <div>الإيرادات: <strong>{pl.revenue}</strong></div>
                <div>تكلفة البضاعة: <strong>{pl.cogs}</strong> {pl.cogsSnapshot ? <span className="text-muted" style={{ fontSize: 12 }}>({Math.round((pl.cogsSnapshot || 0) * 100) / 100} من بيانات snapshot)</span> : null}</div>
                <div>الربح الإجمالي: <strong>{pl.grossProfit}</strong></div>
                <div>إجمالي المصروفات: <strong>{pl.expenses}</strong></div>
                <div>صافي الربح: <strong>{pl.netProfit}</strong></div>
                {pl.series && (
                  <div style={{ marginTop: 8 }}>
                    <h6>تفصيل حسب الفترات</h6>
                    <div style={{ maxHeight: 240, overflow: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>الفترة</th>
                            <th>الإيراد</th>
                            <th>التكلفة</th>
                            <th>نسبة snapshot</th>
                            <th>الربح الإجمالي</th>
                            <th>المصروفات</th>
                            <th>الصافي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pl.series.map((s) => (
                            <tr key={s.period}>
                              <td>{s.period}</td>
                              <td>{s.revenue}</td>
                              <td>{s.cogs}</td>
                              <td>{s.cogsSnapshotPercent ?? 0}%</td>
                              <td>{s.grossProfit}</td>
                              <td>{s.expenses}</td>
                              <td>{s.netProfit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Accounting;
