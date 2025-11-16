import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';

const Admins = ({ admin }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState({ username: '', email: '', password: '', role: 'manager' });
  const [roles, setRoles] = useState({});
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    const res = await api.get('/admins');
    if (res.ok) {
      setList(res.data || []);
      const map = {};
      (res.data || []).forEach(a => { map[a._id] = a.role; });
      setRoles(map);
    } else {
      toast(res.error || 'تعذر تحميل قائمة المشرفين', { type: 'error' });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!model.username || !model.email || !model.password) {
      return toast('ادخل اسم المستخدم والبريد وكلمة السر', { type: 'error' });
    }
    const res = await api.post('/admins', model);
    if (res.ok) {
      toast('تم إنشاء المشرف', { type: 'success' });
      setModel({ username: '', email: '', password: '', role: 'manager' });
      load();
    } else toast(res.error || 'تعذر الإنشاء', { type: 'error' });
  };

  const remove = async (id) => {
    if (!window.confirm('حذف هذا المشرف؟')) return;
    const res = await api.del(`/admins/${id}`);
    if (res.ok) { toast('تم الحذف', { type: 'success' }); load(); }
    else toast(res.error || 'تعذر الحذف', { type: 'error' });
  };

  const setRoleFor = (id, value) => setRoles((prev) => ({ ...prev, [id]: value }));

  const saveRole = async (id) => {
    const newRole = roles[id];
    if (!newRole) return toast('اختر الصلاحية المطلوبة', { type: 'error' });
    const res = await api.put(`/admins/${id}`, { role: newRole });
    if (res.ok) { toast('تم تحديث الصلاحية', { type: 'success' }); load(); }
    else toast(res.error || 'تعذر التحديث', { type: 'error' });
  };

  const roleLabel = (value) => {
    if (value === 'superadmin') return 'مدير عام';
    if (value === 'manager') return 'مدير';
    if (value === 'staff') return 'موظف';
    return value;
  };

  return (
    <div dir="rtl">
      <h3>فريق الإدارة</h3>
      <div className="text-muted mb-3">إدارة حسابات المشرفين. الإنشاء والحذف متاحان فقط للمدير العام.</div>

      {admin?.role === 'superadmin' && (
        <div className="card p-3 mb-3">
          <h5>إضافة مشرف جديد</h5>
          <div className="mb-2"><label>اسم المستخدم</label><input className="form-control" value={model.username} onChange={e => setModel(m => ({ ...m, username: e.target.value }))} /></div>
          <div className="mb-2"><label>البريد الإلكتروني</label><input className="form-control" value={model.email} onChange={e => setModel(m => ({ ...m, email: e.target.value }))} /></div>
          <div className="mb-2"><label>كلمة السر</label><input type="password" className="form-control" value={model.password} onChange={e => setModel(m => ({ ...m, password: e.target.value }))} /></div>
          <div className="mb-2">
            <label>الصلاحية</label>
            <select className="form-control" value={model.role} onChange={e => setModel(m => ({ ...m, role: e.target.value }))}>
              <option value="manager">مدير</option>
              <option value="staff">موظف</option>
              <option value="superadmin">مدير عام</option>
            </select>
          </div>
          <div><button className="btn btn-primary" onClick={save}>حفظ المشرف</button></div>
        </div>
      )}

      <div className="card p-3">
        <h5>جميع المشرفين</h5>
        {loading && <div>جاري التحميل...</div>}
        {!loading && list.map(a => (
          <div key={a._id} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, borderBottom: '1px solid #eee' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{a.username} <span style={{ fontWeight: 400, color: '#666' }}>({roleLabel(a.role)})</span></div>
              <div className="text-muted">{a.email}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {admin?.role === 'superadmin' && (
                <>
                  <select className="form-control form-select" value={roles[a._id] ?? a.role} onChange={e => setRoleFor(a._id, e.target.value)} style={{ width: 150 }}>
                    <option value="manager">مدير</option>
                    <option value="staff">موظف</option>
                    <option value="superadmin">مدير عام</option>
                  </select>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => saveRole(a._id)}>حفظ الصلاحية</button>
                </>
              )}
              {admin?.role === 'superadmin' && String(a._id) !== String(admin.id || admin._id) && (
                <button className="btn btn-sm btn-outline-danger" onClick={() => remove(a._id)}>حذف</button>
              )}
            </div>
          </div>
        ))}
        {!loading && list.length === 0 && <div className="text-muted text-center py-3">لا يوجد مشرفين بعد.</div>}
      </div>
    </div>
  );
};

export default Admins;
