import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toaster';
import getPrimaryImage, { buildImageProxyUrl } from '../utils/getPrimaryImage';

const STATUS_OPTIONS = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

const statusLabel = (status) => {
  const labels = {
    pending: 'قيد المراجعة',
    paid: 'مدفوع',
    processing: 'جارٍ التحضير',
    shipped: 'تم الشحن',
    delivered: 'تم التسليم',
    cancelled: 'ملغي',
    refunded: 'مسترجع'
  };
  return labels[status] || status;
};

const currency = (value) => {
  try {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value || 0);
  } catch {
    return `?.? ${Number(value || 0).toFixed(0)}`;
  }
};

const OrderModal = ({ order, onClose, onChangeStatus, onReload }) => {
  const toast = useToast();
  if (!order) return null;
  const shipping = order.shipping || {
    address: order.userDetails?.Address || order.userDetails?.address || '',
    phone: order.userDetails?.phoneNumber || order.userDetails?.phone || '',
    email: order.userDetails?.email || ''
  };
  const items = Array.isArray(order.products) ? order.products : [];
  const goodsTotal = order.originalTotalPrice ?? order.totalPrice ?? 0;
  const storeDiscountAmount = order.storeDiscountAmount || 0;
  const couponDiscountAmount = order.discountAmount || 0;
  const shippingFee = order.shippingFee || 0;

  const removeCoupon = async () => {
    if (!window.confirm('إزالة الكود الترويجي من الطلب؟')) return;
    const res = await api.post(`/orders/${order._id}/remove-coupon`);
    if (res.ok) {
      toast('تم إزالة الكود', { type: 'success' });
      if (onReload) onReload(order._id);
    } else {
      toast(res.error || 'تعذر الإزالة', { type: 'error' });
    }
  };

  const API_BASE = (process.env.REACT_APP_API_BASE && process.env.REACT_APP_API_BASE.trim()) || '/api';
  const deriveServerOrigin = () => {
    try {
      if (API_BASE.startsWith('http')) {
        const u = new URL(API_BASE);
        return u.origin;
      }
    } catch (e) {
      // ignore
    }
    // fallback for dev: assume backend runs on localhost:3000 unless overridden
    return (process.env.REACT_APP_API_HOST && process.env.REACT_APP_API_HOST.trim()) || 'http://localhost:3000';
  };

  const resolvePreviewImg = (value) => {
    const origin = deriveServerOrigin();
    const normalized = origin && value && typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
      ? `${origin}${value}`
      : value;
    if (/drive\.google\.com|googleusercontent\.com/i.test(normalized || '')) {
      return buildImageProxyUrl(normalized);
    }
    return normalized;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1050 }} dir="rtl">
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', maxWidth: 900, margin: '40px auto', width: 'calc(100% - 40px)', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', boxSizing: 'border-box', background: '#fff', borderRadius: 8, padding: 20, zIndex: 1060 }}>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h5>تفاصيل الطلب #{order.orderNumber || order._id.slice(-8)}</h5>
            <div className="text-muted">{new Date(order.createdAt).toLocaleString('ar-EG')}</div>
          </div>
          <div className="d-flex gap-2">
            {order.coupon?.code && <button className="btn btn-sm btn-outline-danger" onClick={removeCoupon}>إزالة الكوبون</button>}
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>إغلاق</button>
          </div>
        </div>

        <div className="row mt-3">
          <div className="col-md-6">
            <h6>العميل</h6>
            <div><strong>{order.userDetails?.username || order.user || '-'}</strong></div>
            <div className="text-muted">البريد: {shipping.email || '-'}</div>
            <div className="text-muted">الهاتف: {shipping.phone || '-'}</div>
            <div className="mt-2"><strong>عنوان الشحن</strong>
              <div className="text-muted">{shipping.address || '-'}</div>
            </div>
            {order.shipping?.notes && <div className="mt-2"><strong>ملاحظات</strong><div className="text-muted">{order.shipping.notes}</div></div>}
          </div>
          <div className="col-md-6">
            <h6>الدفع والحالة</h6>
            <div className="mb-2">الإجمالي: <strong>ج.م {order.totalPrice}</strong></div>
            {order.originalTotalPrice != null && (
              <div className="mb-1 text-muted">السعر قبل الخصم: <del>ج.م {order.originalTotalPrice}</del></div>
            )}
            {order.discountAmount > 0 && (
              <div className="mb-1 text-success">قيمة الخصم: <strong>- ج.م {order.discountAmount}</strong></div>
            )}
            {order.coupon?.code && (
              <div className="mb-2"><small className="badge bg-info text-dark">كود: {order.coupon.code}</small></div>
            )}
            <div className="mb-3 bg-light rounded p-2">
              <div className="d-flex justify-content-between">
                <span>قيمة المنتجات</span>
                <strong>{currency(goodsTotal)}</strong>
              </div>
              {storeDiscountAmount > 0 && (
                <div className="d-flex justify-content-between text-success">
                  <span>خصم المتجر</span>
                  <strong>- {currency(storeDiscountAmount)}</strong>
                </div>
              )}
              {couponDiscountAmount > 0 && (
                <div className="d-flex justify-content-between text-success">
                  <span>خصم الكوبون</span>
                  <strong>- {currency(couponDiscountAmount)}</strong>
                </div>
              )}
              {shippingFee > 0 && (
                <div className="d-flex justify-content-between">
                  <span>رسوم الشحن</span>
                  <strong>{currency(shippingFee)}</strong>
                </div>
              )}
              <div className="d-flex justify-content-between border-top pt-2 mt-1 fw-semibold">
                <span>الإجمالي النهائي</span>
                <span>{currency(order.totalPrice)}</span>
              </div>
            </div>
            <div className="mb-2">الحالة: <strong>{statusLabel(order.status)}</strong></div>
            <div className="mb-2">طريقة الدفع: <strong>{order.payment?.method || order.paymentMethod || '-'}</strong></div>
            {order.payment?.transactionId && <div className="mb-2">رقم العملية: <strong>{order.payment.transactionId}</strong></div>}
            <div className="mt-2">
              <label className="form-label">تغيير الحالة</label>
              <select className="form-select" value={order.status} onChange={(e) => onChangeStatus(order._id, e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <h6>المنتجات</h6>
          {items.length === 0 && <div className="text-muted">لا يوجد عناصر.</div>}
            {items.map((it) => {
              const itemPrice = Number(it.price ?? it.productDetails?.Sell ?? it.productDetails?.sell ?? 0);
              const itemName = it.Name || it.productName || it.productDetails?.Name || it.productDetails?.name || '-';
              let img = resolvePreviewImg(getPrimaryImage(it, it.productDetails));
              return (
              <div key={it._id || it.product} className="d-flex align-items-center" style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>
                <div style={{ width: 64, height: 64, marginInlineEnd: 12, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {img ? <img src={img} alt={it.Name || ''} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{ fontSize: 11, color: '#999' }}>بدون صورة</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{itemName} <span className="text-muted" style={{ fontWeight: 400 }}>×{it.quantity}</span></div>
                  <div className="text-muted">ج.م {itemPrice} للقطعة</div>
                </div>
                <div style={{ width: 120, textAlign: 'left' }}>ج.م {(itemPrice * (it.quantity || 1)).toFixed(2)}</div>
              </div>
            )})}
        </div>
      </div>
    </div>
  );
};

const tabConfig = {
  new: { label: 'جديدة', status: 'pending', sinceMinutes: 30 },
  pending: { label: 'معلقة', status: 'pending' },
  completed: { label: 'تم التسليم', status: 'shipped,delivered' },
  cancelled: { label: 'ملغاة', status: 'cancelled' }
};

const Orders = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('new');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);
  const toast = useToast();
  const limit = 30;

  const tabs = ['new', 'all', ...STATUS_OPTIONS];
  const labelForTab = (key) => {
    if (key === 'all') return 'الكل';
    if (key === 'new') return 'جديدة';
    return statusLabel(key);
  };

  const buildQuery = (tabKey, pageValue = page) => {
    const qs = new URLSearchParams();
    qs.set('limit', String(limit));
    qs.set('page', String(pageValue));

    // special 'new' tab: recent pending orders
    if (tabKey === 'new') {
      const since = new Date(Date.now() - (tabConfig.new.sinceMinutes || 30) * 60 * 1000).toISOString();
      qs.set('status', 'pending');
      qs.set('since', since);
      return qs.toString();
    }

    // 'all' tab: no status filter
    if (tabKey === 'all') return qs.toString();

    // if tabKey matches a single status, filter by that status
    if (STATUS_OPTIONS.includes(tabKey)) {
      qs.set('status', tabKey);
      return qs.toString();
    }

    // fallback: default to pending
    qs.set('status', 'pending');
    return qs.toString();
  };

  const loadSummary = async () => {
    const res = await api.get('/orders/summary');
    if (res.ok) setSummary(res.data);
  };

  const loadOrders = async (pageValue = page, tabValue = tab) => {
    setLoading(true);
    const qs = buildQuery(tabValue, pageValue);
    const res = await api.get(`/orders?${qs}`);
    if (res.ok) {
      const items = Array.isArray(res.data) ? res.data : (res.data?.orders || []);
      // update list

      setList(items);
      setTotal(res.data?.total ?? items.length);
      setPage(pageValue);
    } else {
      toast(res.error || 'تعذر تحميل الطلبات', { type: 'error' });
      setList([]);
      setTotal(0);
    }
    setLoading(false);
  };

  useEffect(() => { loadSummary(); loadOrders(1, tab); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoRefresh) return undefined;
    intervalRef.current = setInterval(() => {
      loadSummary();
      loadOrders(1, tab);
    }, 30000);
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const openOrder = async (order) => {
    setSelected(order);
    if (!order.adminSeen) {
      await api.put(`/orders/${order._id}`, { adminSeen: true });
      setList((prev) => prev.map((it) => it._id === order._id ? { ...it, adminSeen: true } : it));
    }
  };

  const changeStatus = async (id, status) => {
    const res = await api.put(`/orders/${id}`, { status });
    if (res.ok) {
      toast('تم تحديث الحالة', { type: 'success' });
      setList((prev) => prev.map((it) => it._id === id ? { ...it, status } : it));
      if (selected && selected._id === id) setSelected({ ...selected, status });
      loadSummary();
    } else toast(res.error || 'تعذر التحديث', { type: 'error' });
  };

  const reloadSingle = async (id) => {
    const res = await api.get(`/orders/${id}`);
    if (res.ok) {
      setSelected(res.data);
      setList((prev) => prev.map((it) => it._id === id ? res.data : it));
      loadSummary();
    }
  };

  const totalPages = total ? Math.ceil(total / limit) : 1;

  return (
    <div dir="rtl">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h3 className="mb-0">إدارة الطلبات</h3>
        <div className="form-check form-switch">
          <input className="form-check-input" type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} id="autoRefresh" />
          <label className="form-check-label" htmlFor="autoRefresh">تحديث تلقائي كل 30 ثانية</label>
        </div>
      </div>

      {summary && (
        <div className="row g-3 mb-3">
          <div className="col-6 col-md-3">
            <div className="card p-3 text-center">
              <div className="text-muted">طلبات جديدة</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.counts?.new || 0}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card p-3 text-center">
              <div className="text-muted">قيد التنفيذ</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.counts?.pending || 0}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card p-3 text-center">
              <div className="text-muted">تم الشحن/التسليم</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{(summary.counts?.shipped || 0) + (summary.counts?.delivered || 0)}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card p-3 text-center">
              <div className="text-muted">ملغاة</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.counts?.cancelled || 0}</div>
            </div>
          </div>
        </div>
      )}

      <div className="btn-group mb-3" role="group">
        {tabs.map((key) => (
          <button key={key} className={`btn btn-sm ${tab === key ? 'btn-brand' : 'btn-outline-secondary'}`} onClick={() => { setTab(key); loadOrders(1, key); }}>
            {labelForTab(key)}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0">
            <thead>
              <tr>
                <th>الطلب</th>
                <th>العميل</th>
                <th>الهاتف</th>
                <th>الإجمالي</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="7" className="text-center py-4">جارٍ التحميل...</td></tr>
              )}
              {!loading && list.length === 0 && (
                <tr><td colSpan="7" className="text-center py-4 text-muted">لا توجد طلبات في هذه القائمة.</td></tr>
              )}
              {!loading && list.map(o => (
                <tr key={o._id} style={{ background: !o.adminSeen ? 'rgba(255,243,205,0.6)' : undefined }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>#{o.orderNumber || o._id.slice(-6)}</div>
                    <div className="text-muted small">{o.products?.length || 0} منتج</div>
                  </td>
                  <td>{o.userDetails?.username || '-'}</td>
                  <td>{o.userDetails?.phoneNumber || '-'}</td>
                  <td>ج.م {o.totalPrice}</td>
                  <td><span className="badge bg-light text-dark">{statusLabel(o.status)}</span></td>
                  <td>{new Date(o.createdAt).toLocaleString('ar-EG')}</td>
                  <td><button className="btn btn-sm btn-outline-primary" onClick={() => openOrder(o)}>عرض</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="d-flex justify-content-center align-items-center gap-2 p-3">
            <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => loadOrders(page - 1, tab)}>السابق</button>
            <span>صفحة {page} من {totalPages}</span>
            <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => loadOrders(page + 1, tab)}>التالي</button>
          </div>
        )}
      </div>

      {selected && (
        <OrderModal
          order={selected}
          onClose={() => setSelected(null)}
          onChangeStatus={changeStatus}
          onReload={reloadSingle}
        />
      )}
    </div>
  );
};

export default Orders;
