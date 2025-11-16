import { useState } from 'react';
import api from '../api';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    const res = await api.post('/admins/login', { username, password });
    if (!res.ok) return setErr(res.data?.error || 'فشل تسجيل الدخول');
    api.setToken(res.data.token);
    const adm = res.data.admin || null;
    try { if (adm) localStorage.setItem('adminUser', JSON.stringify(adm)); } catch (e) {}
    onLogin(adm);
  };

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', padding: 16, border: '1px solid #eee', borderRadius: 8 }} dir="rtl">
      <h3 className="mb-2">تسجيل دخول الإدارة</h3>
      <p className="text-muted" style={{ fontSize: 14 }}>ادخل بيانات حساب المشرف للدخول إلى لوحة التحكم.</p>
      {err && <div style={{ color: '#c00', marginBottom: 8 }}>{err}</div>}
      <form onSubmit={submit}>
        <div className="mb-2">
          <label className="form-label">اسم المستخدم</label>
          <input value={username} onChange={e => setUsername(e.target.value)} className="form-control" placeholder="مثال: admin" />
        </div>
        <div className="mb-3">
          <label className="form-label">كلمة السر</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="form-control" placeholder="••••••••" />
        </div>
        <button className="btn btn-primary w-100">دخول</button>
      </form>
    </div>
  );
};

export default Login;
