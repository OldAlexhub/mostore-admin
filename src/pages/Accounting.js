import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';

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
      else toast('Failed to load expenses', { type: 'error' });
    } catch (e) { toast('Failed to load expenses', { type: 'error' }); }
    setLoading(false);
  };

  useEffect(()=>{ loadExpenses(); }, []);

  const saveExpense = async () => {
    if (!form.amount) return toast('Amount required', { type: 'error' });
    const payload = { ...form, amount: Number(form.amount) };
    const res = await api.post('/accounting/expenses', payload);
    if (res.ok) { toast('Expense saved', { type: 'success' }); setForm({ amount:'', category:'', description:'', date:'' }); loadExpenses(); }
    else toast(res.error || 'Save failed', { type: 'error' });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete expense?')) return;
    const res = await api.del(`/accounting/expenses/${id}`);
    if (res.ok) { toast('Deleted', { type: 'success' }); loadExpenses(); }
    else toast(res.error || 'Delete failed', { type: 'error' });
  };

  const genPL = async () => {
    try {
      const qs = [];
      if (range.start) qs.push(`start=${encodeURIComponent(range.start)}`);
      if (range.end) qs.push(`end=${encodeURIComponent(range.end)}`);
      if (range.group) qs.push(`group=${encodeURIComponent(range.group)}`);
      const url = `/accounting/pl${qs.length ? '?'+qs.join('&') : ''}`;
      const res = await api.get(url);
      if (res.ok) setPl(res.data);
      else toast(res.error || 'Failed to generate P&L', { type: 'error' });
    } catch (e) { toast('Failed to generate P&L', { type: 'error' }); }
  };

  const exportCsv = async () => {
    try {
      const qs = [];
      if (range.start) qs.push(`start=${encodeURIComponent(range.start)}`);
      if (range.end) qs.push(`end=${encodeURIComponent(range.end)}`);
      if (range.group) qs.push(`group=${encodeURIComponent(range.group)}`);
      const url = `/accounting/pl.csv${qs.length ? '?'+qs.join('&') : ''}`;
      // request as blob
      const res = await api.instance.get(url, { responseType: 'blob' });
      const blob = res.data;
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = dlUrl; a.download = `pl-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(dlUrl);
    } catch (e) { toast('Failed to export CSV', { type: 'error' }); }
  };

  return (
    <div>
      <h3>Accounting / المحاسبة</h3>
      <div style={{display:'flex', gap:12}}>
        <div style={{flex:1}}>
          <div className="card p-3 mb-3">
            <h5>Add Expense</h5>
            <div className="mb-2"><label>Amount</label><input className="form-control" type="number" value={form.amount} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} /></div>
            <div className="mb-2"><label>Category</label><input className="form-control" value={form.category} onChange={e=>setForm(f=>({...f, category:e.target.value}))} /></div>
            <div className="mb-2"><label>Date</label><input className="form-control" type="date" value={form.date} onChange={e=>setForm(f=>({...f, date:e.target.value}))} /></div>
            <div className="mb-2"><label>Description</label><input className="form-control" value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} /></div>
            <div><button className="btn btn-primary" onClick={saveExpense}>Save Expense</button></div>
          </div>

          <div className="card p-3">
            <h5>Expenses</h5>
            {loading && <div>Loading…</div>}
            {!loading && expenses.map(e => (
              <div key={e._id} style={{display:'flex', justifyContent:'space-between', padding:8, borderBottom:'1px solid #eee'}}>
                <div>
                  <div style={{fontWeight:700}}>{e.category} — {e.amount}</div>
                  <div className="text-muted">{new Date(e.date).toLocaleString()} — {e.description}</div>
                </div>
                <div><button className="btn btn-sm btn-outline-danger" onClick={()=>remove(e._id)}>Delete</button></div>
              </div>
            ))}
          </div>
        </div>

        <div style={{width:420}}>
          <div className="card p-3 mb-3">
            <h5>Profit & Loss</h5>
            <div className="mb-2"><label>Start</label><input type="date" className="form-control" value={range.start} onChange={e=>setRange(r=>({...r, start: e.target.value}))} /></div>
            <div className="mb-2"><label>End</label><input type="date" className="form-control" value={range.end} onChange={e=>setRange(r=>({...r, end: e.target.value}))} /></div>
            <div className="mb-2"><label>Group</label>
              <select className="form-control" value={range.group} onChange={e=>setRange(r=>({...r, group: e.target.value}))}>
                <option value="none">No grouping</option>
                <option value="month">By month</option>
                <option value="year">By year</option>
              </select>
            </div>
            <div className="d-flex gap-2"><button className="btn btn-primary" onClick={genPL}>Generate</button>
              {pl && <button className="btn btn-outline-secondary" onClick={exportCsv}>Export CSV</button>}
            </div>
            {pl && (
              <div style={{marginTop:12}}>
                <div>Revenue: <strong>{pl.revenue}</strong></div>
                <div>COGS: <strong>{pl.cogs}</strong> {pl.cogsSnapshot ? <span style={{color:'#555', fontSize:12}}>({Math.round((pl.cogsSnapshot||0)*100)/100} snapshot)</span> : null}</div>
                <div>Gross Profit: <strong>{pl.grossProfit}</strong></div>
                <div>Expenses: <strong>{pl.expenses}</strong></div>
                <div>Net Profit: <strong>{pl.netProfit}</strong></div>
                {pl.series && (
                  <div style={{marginTop:8}}>
                    <h6>Series</h6>
                    <div style={{maxHeight:240, overflow:'auto'}}>
                      <table className="table">
                        <thead><tr><th>Period</th><th>Revenue</th><th>COGS</th><th>Snapshot%</th><th>Gross</th><th>Expenses</th><th>Net</th></tr></thead>
                        <tbody>
                          {pl.series.map(s => (
                            <tr key={s.period}><td>{s.period}</td><td>{s.revenue}</td><td>{s.cogs}</td><td>{s.cogsSnapshotPercent ?? 0}%</td><td>{s.grossProfit}</td><td>{s.expenses}</td><td>{s.netProfit}</td></tr>
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
