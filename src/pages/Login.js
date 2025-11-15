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
    if (!res.ok) return setErr(res.data?.error || 'Login failed');
    api.setToken(res.data.token);
    const adm = res.data.admin || null;
    try { if (adm) localStorage.setItem('adminUser', JSON.stringify(adm)); } catch (e) {}
    onLogin(adm);
  };

  return (
    <div style={{maxWidth:420, margin:'40px auto', padding:16, border:'1px solid #eee', borderRadius:8}}>
      <h3>Admin Login</h3>
      {err && <div style={{color:'#c00', marginBottom:8}}>{err}</div>}
      <form onSubmit={submit}>
        <div style={{marginBottom:8}}>
          <label>Username</label>
          <input value={username} onChange={e=>setUsername(e.target.value)} className="form-control" />
        </div>
        <div style={{marginBottom:12}}>
          <label>Password</label>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" className="form-control" />
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn btn-primary">Login</button>
        </div>
      </form>
    </div>
  );
};

export default Login;
