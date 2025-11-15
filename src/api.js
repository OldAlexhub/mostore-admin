import axios from 'axios';

const API_BASE = (process.env.REACT_APP_API_BASE && process.env.REACT_APP_API_BASE.trim()) || '/api';

const instance = axios.create({ baseURL: API_BASE, withCredentials: true, headers: { 'Content-Type': 'application/json' } });
// helpful debug: show the API base in the browser console when the admin app loads
if (typeof window !== 'undefined' && window.console && window.console.debug) {
  console.debug('[admin.api] API base:', API_BASE);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('adminToken', token);
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('adminToken');
    delete instance.defaults.headers.common['Authorization'];
  }
}

// CSRF double-submit removed; admin API will send credentials but does not request or attach a separate CSRF token.

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
  return wrap(instance.post(path, body));
}

export async function get(path) {
  return wrap(instance.get(path));
}

export async function put(path, body) {
  return wrap(instance.put(path, body));
}

export async function del(path) {
  return wrap(instance.delete(path));
}

const apiHelpers = { setToken, post, get, put, del, instance };
export default apiHelpers;
