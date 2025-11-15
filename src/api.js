import axios from 'axios';

const API_BASE = (process.env.REACT_APP_API_BASE && process.env.REACT_APP_API_BASE.trim()) || '/api';

const instance = axios.create({ baseURL: API_BASE, withCredentials: true, headers: { 'Content-Type': 'application/json' } });
// helpful debug: show the API base in the browser console when the admin app loads
if (typeof window !== 'undefined' && window.console && window.console.debug) {
  console.debug('[admin.api] API base:', API_BASE);
}

let adminToken = localStorage.getItem('adminToken') || null;
export function setToken(token) {
  adminToken = token;
  if (token) {
    localStorage.setItem('adminToken', token);
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('adminToken');
    delete instance.defaults.headers.common['Authorization'];
  }
}

async function ensureCsrf() {
  if (typeof document === 'undefined') return;
  if (document.cookie && document.cookie.split(';').some(c => c.trim().startsWith('csrf='))) return;
  try {
    await instance.get('/auth/csrf');
  } catch (err) {
    // ignore
  }
}

function getCsrfFromCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split(';').map(s => s.trim()).find(s => s.startsWith('csrf='));
  if (!match) return null;
  return decodeURIComponent(match.split('=')[1] || '');
}

async function wrap(promise) {
  try {
    const res = await promise;
    return { ok: true, data: res.data };
  } catch (err) {
    const data = err.response ? err.response.data : null;
    const error = data && (data.error || data.message) ? (data.error || data.message) : (err.message || 'Request failed');
    return { ok: false, error, data };
  }
}

export async function post(path, body) {
  await ensureCsrf();
  const csrf = getCsrfFromCookie();
  const headers = csrf ? { 'X-CSRF-Token': csrf } : {};
  return wrap(instance.post(path, body, { headers }));
}

export async function get(path) {
  return wrap(instance.get(path));
}

export async function put(path, body) {
  await ensureCsrf();
  const csrf = getCsrfFromCookie();
  const headers = csrf ? { 'X-CSRF-Token': csrf } : {};
  return wrap(instance.put(path, body, { headers }));
}

export async function del(path) {
  await ensureCsrf();
  const csrf = getCsrfFromCookie();
  const headers = csrf ? { 'X-CSRF-Token': csrf } : {};
  return wrap(instance.delete(path, { headers }));
}

export default { setToken, post, get, put, del, instance };
