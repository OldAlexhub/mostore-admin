import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import getPrimaryImage from '../utils/getPrimaryImage';

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
    return `ج.م ${Number(value || 0).toFixed(0)}`;
  }
};

const OrderPreviewModal = ({ order, onClose }) => {
  if (!order) return null;
  const shipping = order.shipping || {
    address: order.userDetails?.Address || order.userDetails?.address || '',
    phone: order.userDetails?.phoneNumber || order.userDetails?.phone || '',
    email: order.userDetails?.email || ''
  };
  const items = Array.isArray(order.products) ? order.products : [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1050 }} dir="rtl">
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', maxWidth: 900, margin: '40px auto', background: '#fff', borderRadius: 10, padding: 20 }}>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h5>تفاصيل الطلب #{order.orderNumber || order._id.slice(-6)}</h5>
            <div className="text-muted">{new Date(order.createdAt).toLocaleString('ar-EG')}</div>
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>إغلاق</button>
        </div>

        <div className="row mt-3">
          <div className="col-md-6">
            <h6>العميل والشحن</h6>
            <div><strong>{order.userDetails?.username || 'بدون اسم'}</strong></div>
            <div className="text-muted">الهاتف: {shipping.phone || '-'}</div>
            <div className="text-muted">البريد: {shipping.email || '-'}</div>
            <div className="mt-2">العنوان: <span className="text-muted">{shipping.address || '-'}</span></div>
          </div>
          <div className="col-md-6">
            <h6>حالة الطلب</h6>
            <div>الإجمالي: <strong>{currency(order.totalPrice)}</strong></div>
            {order.discountAmount > 0 && (
              <div className="text-success small">خصم: {currency(order.discountAmount)}</div>
            )}
            <div>الحالة الحالية: <strong>{statusLabel(order.status)}</strong></div>
            <div className="text-muted small">طريقة الدفع: {order.payment?.method || order.paymentMethod || 'غير محدد'}</div>
          </div>
        </div>

        <div className="mt-3">
          <h6>المنتجات</h6>
          {items.length === 0 && <div className="text-muted">لا يوجد منتجات داخل الطلب.</div>}
          {items.map((p, idx) => {
            const preview = getPrimaryImage(p, p.productDetails);
            const name = p.productDetails?.Name || p.Name || p.productName || 'منتج';
            return (
              <div key={`${p.product}-${idx}`} className="d-flex align-items-center border-bottom py-2">
                <div style={{ width: 56, height: 56, borderRadius: 8, background: '#f4f4f4', marginInlineStart: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {preview ? (
                    <img src={preview} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ fontSize: 11, color: '#999' }}>لا صورة</div>
                  )}
                </div>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                  <div className="text-muted small">الكمية: {p.quantity} × {currency(p.productDetails?.Sell)}</div>
                </div>
                <div style={{ width: 120, textAlign: 'left' }}>{currency((p.productDetails?.Sell || 0) * (p.quantity || 1))}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtitle }) => (
  <div className="card p-3 text-center">
    <div className="card-body">
      <div className="text-muted" style={{ fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
      {subtitle && <div className="text-muted" style={{ fontSize: 12 }}>{subtitle}</div>}
    </div>
  </div>
);

const Dashboard = ({ setPage }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ products: 0, orders: 0, users: 0, revenue: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const requests = await Promise.allSettled([
      api.get('/products'),
      api.get('/orders?page=1&limit=8'),
      api.get('/orders/customers'),
      api.get('/revenue')
    ]);

    const unwrap = (result) => (result.status === 'fulfilled' ? result.value : { ok: false });
    const [productsRes, ordersRes, customersRes, revenueRes] = requests.map(unwrap);

    if (!productsRes.ok && !ordersRes.ok) {
      setError('حصلت مشكلة أثناء تحميل البيانات، حاول لاحقاً.');
    }

    const products = productsRes.ok ? (Array.isArray(productsRes.data) ? productsRes.data : productsRes.data?.products || []) : [];
    const orders = ordersRes.ok ? (Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data?.orders || []) : [];
    const users = customersRes.ok
      ? (Array.isArray(customersRes.data) ? customersRes.data : customersRes.data?.customers || [])
      : [];
    const revenue = revenueRes.ok ? (revenueRes.data?.total ?? revenueRes.data?.revenue ?? 0) : orders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

    setStats({
      products: products.length,
      orders: orders.length,
      users: users.length,
      revenue
    });
    setRecentOrders(orders.slice(0, 6));
    setOrdersList(orders);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const attentionOrders = useMemo(() => {
    return (ordersList || [])
      .filter((o) => ['pending', 'processing'].includes(o.status))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(0, 6);
  }, [ordersList]);

  return (
    <div dir="rtl">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h3 className="mb-0">لوحة المتابعة</h3>
          <div className="text-muted">نظرة سريعة على الطلبات والمبيعات اليوم.</div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>
            {loading ? 'يتم التحديث...' : 'تحديث البيانات'}
          </button>
          <button className="btn btn-primary" onClick={() => setPage('orders')}>إدارة الطلبات</button>
        </div>
      </div>

      {error && <div className="alert alert-warning">{error}</div>}

      <div className="row g-3">
        <div className="col-6 col-md-3"><StatCard title="طلبات جديدة" value={stats.orders} subtitle="آخر ٨ طلبات" /></div>
        <div className="col-6 col-md-3"><StatCard title="إجمالي المبيعات" value={currency(stats.revenue)} /></div>
        <div className="col-6 col-md-3"><StatCard title="عدد المنتجات" value={stats.products} /></div>
        <div className="col-6 col-md-3"><StatCard title="عدد العملاء" value={stats.users} /></div>
      </div>

      <div className="row g-3 mt-3">
        <div className="col-md-7">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">أحدث الطلبات</h5>
                <button className="btn btn-sm btn-link" onClick={() => setPage('orders')}>عرض الكل</button>
              </div>
              {recentOrders.length === 0 && <div className="text-muted text-center py-4">لا يوجد طلبات حديثة.</div>}
              {recentOrders.map((order) => (
                <div key={order._id} className="d-flex align-items-center justify-content-between border-bottom py-2">
                  <div>
                    <div style={{ fontWeight: 600 }}>#{order.orderNumber || order._id.slice(-6)}</div>
                    <div className="text-muted small">{new Date(order.createdAt).toLocaleString('ar-EG')}</div>
                  </div>
                  <div>{currency(order.totalPrice)}</div>
                  <div className="badge bg-light text-dark">{statusLabel(order.status)}</div>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedOrder(order)}>عرض</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-md-5">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">طلبات تحتاج متابعة</h5>
                <button className="btn btn-sm btn-link" onClick={() => setPage('orders')}>متابعة الطلبات</button>
              </div>
              {attentionOrders.length === 0 && <div className="text-muted text-center py-4">كل الطلبات محدثة حالياً.</div>}
              {attentionOrders.map((order) => (
                <div key={order._id} className="d-flex justify-content-between align-items-center border-bottom py-2">
                  <div>
                    <div style={{ fontWeight: 600 }}>#{order.orderNumber || order._id.slice(-6)}</div>
                    <div className="text-muted small">{order.userDetails?.username || 'ضيف'} • {new Date(order.createdAt).toLocaleString('ar-EG')}</div>
                  </div>
                  <div className="badge bg-warning text-dark">{statusLabel(order.status)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedOrder && <OrderPreviewModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  );
};

export default Dashboard;
