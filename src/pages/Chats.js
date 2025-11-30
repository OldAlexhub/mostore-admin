import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../api';
import { useToast } from '../components/Toaster';
import newMessageSound from '../media/newmessage.mp3';
import getPrimaryImage, { buildImageProxyUrl } from '../utils/getPrimaryImage';

const resolveSocketUrl = () => {
  const explicit = (process.env.REACT_APP_SOCKET_URL && process.env.REACT_APP_SOCKET_URL.trim()) || '';
  if (explicit) return explicit;
  const base = (process.env.REACT_APP_API_BASE && process.env.REACT_APP_API_BASE.trim()) || '/api';
  if (base.startsWith('http')) {
    try {
      const url = new URL(base);
      return `${url.protocol}//${url.host}`;
    } catch (e) {
      return base.replace(/\/api$/, '');
    }
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

const SOCKET_URL = resolveSocketUrl();

const API_BASE = (process.env.REACT_APP_API_BASE && process.env.REACT_APP_API_BASE.trim()) || '/api';

const deriveServerOrigin = () => {
  try {
    if (API_BASE.startsWith('http')) {
      const url = new URL(API_BASE);
      return url.origin;
    }
  } catch (e) {
    // ignore
  }
  return (process.env.REACT_APP_API_HOST && process.env.REACT_APP_API_HOST.trim())
    || (typeof window !== 'undefined' ? window.location.origin : '');
};

const SERVER_ORIGIN = deriveServerOrigin();

const withServerOrigin = (value) => {
  if (!value || typeof value !== 'string') return '';
  if (value.startsWith('/') && !value.startsWith('//')) {
    return `${SERVER_ORIGIN}${value}`;
  }
  return value;
};

const resolvePreviewImg = (value) => {
  const normalized = withServerOrigin(value);
  if (/drive\.google\.com|googleusercontent\.com/i.test(normalized || '')) {
    return buildImageProxyUrl(normalized);
  }
  return normalized;
};

const formatTime = (value) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    }).format(new Date(value));
  } catch {
    return '';
  }
};

const formatCurrency = (value) => {
  try {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value || 0);
  } catch {
    return `?.? ${Number(value || 0).toFixed(0)}`;
  }
};

const ORDER_STATUS_LABELS = {
  pending: 'قيد المراجعة',
  paid: 'مدفوع',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
  refunded: 'مرتجع'
};

const orderStatusLabel = (status) => ORDER_STATUS_LABELS[status] || status;

const Chats = () => {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState('open');
  const [selectedSession, setSelectedSession] = useState(null);
  const selectedSessionRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [closing, setClosing] = useState(false);
  const messageContainerRef = useRef(null);
  const socketRef = useRef(null);
  const selectedIdRef = useRef(null);
  const filterRef = useRef('open');
  const initialSoundPreference = (() => {
    try {
      return localStorage.getItem('adminChatSound') !== 'false';
    } catch {
      return true;
    }
  })();
  const [soundEnabled, setSoundEnabled] = useState(initialSoundPreference);
  const soundEnabledRef = useRef(initialSoundPreference);
  const audioRef = useRef(null);
  const [orderPreview, setOrderPreview] = useState(null);
  const [orderPreviewLoading, setOrderPreviewLoading] = useState(false);
  const [orderPreviewError, setOrderPreviewError] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickOrders, setQuickOrders] = useState([]);
  const [quickSearchLoading, setQuickSearchLoading] = useState(false);
  const [quickSearchError, setQuickSearchError] = useState('');

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  useEffect(() => {
    selectedSessionRef.current = selectedSession;
  }, [selectedSession]);

  const extractOrderFromResponse = (payload) => {
    if (!payload) return null;
    if (payload.order) return payload.order;
    if (Array.isArray(payload.orders)) return payload.orders[0] || null;
    if (payload._id) return payload;
    if (Array.isArray(payload)) return payload[0] || null;
    return null;
  };

  const loadOrderPreview = useCallback(async (session) => {
    if (!session || (!session.orderId && !session.orderNumber)) {
      setOrderPreview(null);
      setOrderPreviewError('');
      setOrderPreviewLoading(false);
      return;
    }
    setOrderPreviewLoading(true);
    setOrderPreviewError('');
    let res;
    if (session.orderId) {
      res = await api.get(`/orders/${session.orderId}`);
    } else if (session.orderNumber) {
      res = await api.get(`/orders?q=${encodeURIComponent(session.orderNumber)}&limit=1`);
    }
    if (res?.ok) {
      const order = extractOrderFromResponse(res.data);
      if (order) {
        setOrderPreview(order);
        setOrderPreviewError('');
      } else {
        setOrderPreview(null);
        setOrderPreviewError('لا توجد بيانات لهذا الطلب.');
      }
    } else {
      setOrderPreview(null);
      setOrderPreviewError(res?.error || 'تعذر تحميل تفاصيل الطلب.');
    }
    setOrderPreviewLoading(false);
  }, []);

  useEffect(() => {
    loadOrderPreview(selectedSession);
  }, [selectedSession, loadOrderPreview]);

  const handleQuickPhoneChange = (event) => {
    const next = event.target.value.replace(/[^0-9+]/g, '');
    setQuickPhone(next);
    if (!next.trim()) {
      setQuickOrders([]);
      setQuickSearchError('');
    }
  };

  const handleQuickSearch = async (event) => {
    event.preventDefault();
    const normalized = quickPhone.replace(/\D/g, '');
    if (!normalized) {
      setQuickSearchError('أدخل رقم الهاتف أولاً');
      setQuickOrders([]);
      return;
    }
    setQuickSearchLoading(true);
    setQuickSearchError('');
    const res = await api.get(`/orders?q=${encodeURIComponent(normalized)}&limit=5`);
    if (res.ok) {
      const orders = Array.isArray(res.data?.orders) ? res.data.orders : (Array.isArray(res.data) ? res.data : []);

      // For entries where the first product lacks details, attempt to fetch the product record
      const enriched = await Promise.all(orders.map(async (order) => {
        try {
          const firstItem = Array.isArray(order.products) && order.products.length ? order.products[0] : null;
          // if we already have productDetails or an image, keep as-is
          if (!firstItem) return order;
          const haveImage = !!getPrimaryImage(firstItem, firstItem?.productDetails);
          const haveName = !!(firstItem?.productDetails?.Name || firstItem?.Name || firstItem?.productName);
          if (haveImage && haveName) return order;

          // if the product field is present and looks like an objectId, fetch product details
          const pid = firstItem.product || firstItem.productId || firstItem._id;
          // Prefer fetching by product ObjectId when possible
          if (pid && /^[0-9a-fA-F]{24}$/.test(String(pid))) {
            const prodRes = await api.get(`/products/${encodeURIComponent(pid)}`);
            if (prodRes.ok && prodRes.data) {
              // put resolved productDetails into first product (non-destructive)
              const first = { ...(firstItem || {}), productDetails: { ...(firstItem?.productDetails || {}), ...(prodRes.data || {}) } };
              const newOrder = { ...order };
              newOrder.products = Array.isArray(order.products) ? [...order.products] : [];
              newOrder.products[0] = first;
              return newOrder;
            }
          }

          // Fallback: try searching by product name (best-effort) to find a product record with an image
          const candidateName = firstItem?.productDetails?.Name || firstItem?.Name || firstItem?.productName;
          if (candidateName && candidateName.length > 2) {
            try {
              const searchRes = await api.get(`/products/search?q=${encodeURIComponent(candidateName)}&limit=1`);
              if (searchRes.ok && Array.isArray(searchRes.data) && searchRes.data.length > 0) {
                const found = searchRes.data[0];
                const first = { ...(firstItem || {}), productDetails: { ...(firstItem?.productDetails || {}), ...(found || {}) } };
                const newOrder = { ...order };
                newOrder.products = Array.isArray(order.products) ? [...order.products] : [];
                newOrder.products[0] = first;
                return newOrder;
              }
            } catch (e) {
              // ignore fallback errors
            }
          }
          return order;
        } catch (e) {
          return order;
        }
      }));

      setQuickOrders(enriched);
      if (!orders.length) setQuickSearchError('لا توجد طلبات مطابقة لهذا الرقم.');
    } else {
      setQuickOrders([]);
      setQuickSearchError(res.error || 'تعذر تنفيذ البحث.');
    }
    setQuickSearchLoading(false);
  };

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    try {
      localStorage.setItem('adminChatSound', soundEnabled ? 'true' : 'false');
    } catch (e) {
      // ignore
    }
  }, [soundEnabled]);

  useEffect(() => {
    const audio = new Audio(newMessageSound);
    audio.volume = 0.6;
    audioRef.current = audio;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      query: { role: 'admin' }
    });
    socketRef.current = socket;

    socket.on('chat:sessionUpdated', (summary) => {
      if (!summary) return;
      setSessions((prev) => {
        const matches = filterRef.current === 'all' || summary.status === filterRef.current;
        const existingIndex = prev.findIndex((s) => s._id === summary._id);
        const next = [...prev];
        if (!matches && existingIndex > -1) {
          next.splice(existingIndex, 1);
          return next;
        }
        if (!matches) return prev;
        if (existingIndex > -1) {
          const merged = { ...next[existingIndex], ...summary };
          next.splice(existingIndex, 1);
          next.unshift(merged);
        } else {
          next.unshift(summary);
        }
        return next;
      });
      if (selectedIdRef.current === summary._id) {
        setSelectedSession((prev) => (prev ? { ...prev, ...summary } : prev));
      }
    });

    socket.on('chat:message', ({ sessionId, message }) => {
      if (!sessionId || !message) return;
      const isCurrent = selectedIdRef.current === sessionId;
      if (isCurrent) {
        setMessages((prev) => [...prev, message]);
      }
      if (message.sender === 'customer' && soundEnabledRef.current && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    });

    socket.on('chat:sessionClosed', ({ sessionId }) => {
      if (selectedIdRef.current === sessionId) {
        setSelectedSession((prev) => (prev ? { ...prev, status: 'closed', closedAt: new Date().toISOString() } : prev));
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!messageContainerRef.current) return;
    messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
  }, [messages]);

  const loadSession = useCallback(async (sessionId) => {
    if (!sessionId) return;
    setLoadingSession(true);
    const res = await api.get(`/chat/sessions/${sessionId}`);
    if (res.ok) {
      const nextSession = res.data?.session;
      setSelectedSession(nextSession);
      selectedSessionRef.current = nextSession;
      selectedIdRef.current = nextSession?._id || null;
      setMessages(nextSession?.messages || []);
      setMessageText('');
    } else {
      toast(res.error || 'تعذر تحميل المحادثة');
    }
    setLoadingSession(false);
  }, [toast]);

  const fetchSessions = useCallback(async () => {
    setLoadingList(true);
    const res = await api.get(`/chat/sessions?status=${filter}`);
    if (res.ok) {
      const list = res.data?.sessions || [];
      setSessions(list);
      const currentSelected = selectedSessionRef.current;
      if (!list.length) {
        setSelectedSession(null);
        selectedSessionRef.current = null;
        setMessages([]);
        selectedIdRef.current = null;
      } else if (currentSelected && !list.some((s) => s._id === currentSelected._id)) {
        setSelectedSession(null);
        selectedSessionRef.current = null;
        selectedIdRef.current = null;
      }
    } else {
      toast(res.error || 'تعذر تحميل المحادثات');
    }
    setLoadingList(false);
  }, [filter, toast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (!selectedSessionRef.current && sessions.length > 0) {
      const firstId = sessions[0]._id;
      if (firstId) {
        selectedIdRef.current = firstId;
        loadSession(firstId);
      }
    }
  }, [sessions, loadSession]);

  const handleSend = (event) => {
    event.preventDefault();
    if (!socketRef.current || !selectedIdRef.current) return;
    const trimmed = messageText.trim();
    if (!trimmed || (selectedSession && selectedSession.status === 'closed')) return;
    socketRef.current.emit('chat:message', {
      sessionId: selectedIdRef.current,
      sender: 'admin',
      text: trimmed
    });
    setMessageText('');
  };

  const handleCloseSession = async () => {
    if (!selectedSession?._id) return;
    setClosing(true);
    const res = await api.post(`/chat/sessions/${selectedSession._id}/close`);
    if (!res.ok) {
      toast(res.error || 'تعذر إغلاق المحادثة');
    } else {
      toast('تم إغلاق المحادثة');
      setSelectedSession((prev) => (prev ? { ...prev, status: 'closed', closedAt: new Date().toISOString() } : prev));
    }
    setClosing(false);
  };

  const filteredSessions = sessions;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>دردشة العملاء</h2>
          <p style={{ margin: '4px 0 0', color: '#666' }}>راقب المحادثات الحية وردّ على العملاء فوراً.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '6px 8px' }}>
            <option value="open">محادثات مفتوحة</option>
            <option value="all">كل المحادثات</option>
          </select>
          <button onClick={fetchSessions} disabled={loadingList} style={{ padding: '6px 12px' }}>
            {loadingList ? 'تحديث...' : 'تحديث'}
          </button>
          <button onClick={() => setSoundEnabled((prev) => !prev)} style={{ padding: '6px 12px' }}>
            {soundEnabled ? 'إيقاف الصوت' : 'تشغيل الصوت'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
          <div style={{ padding: 12, borderBottom: '1px solid #eee', fontWeight: 600 }}>المحادثات</div>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {filteredSessions.map((session) => {
              const isActive = selectedSession?._id === session._id;
              return (
                <button
                  key={session._id}
                  onClick={() => loadSession(session._id)}
                  style={{
                    width: '100%',
                    textAlign: 'right',
                    border: 'none',
                    borderBottom: '1px solid #f5f5f5',
                    background: isActive ? '#f3ecff' : '#fff',
                    padding: 12,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{session.customerName || 'عميل'}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {session.orderNumber ? `طلب #${session.orderNumber}` : 'استفسار عام'}
                  </div>
                  <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>
                    {session.lastText ? session.lastText.slice(0, 60) : '...'}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{formatTime(session.lastMessageAt)}</span>
                    <span>{session.status === 'open' ? 'مفتوح' : 'مغلق'}</span>
                  </div>
                </button>
              );
            })}
            {!filteredSessions.length && (
              <div style={{ padding: 24, textAlign: 'center', color: '#777' }}>لا توجد محادثات حالياً.</div>
            )}
          </div>
        </div>
        <div style={{ border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
            <div style={{ padding: 12, borderBottom: '1px solid #eee', fontWeight: 600 }}>بحث سريع عن الطلبات</div>
            <form onSubmit={handleQuickSearch} style={{ padding: 12, display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="رقم الهاتف"
                value={quickPhone}
                onChange={handleQuickPhoneChange}
                style={{ flex: 1, border: '1px solid #ccc', borderRadius: 6, padding: '6px 10px' }}
              />
              <button type="submit" disabled={quickSearchLoading} style={{ padding: '6px 12px' }}>
                {quickSearchLoading ? 'جارٍ...' : 'بحث'}
              </button>
            </form>
            {quickSearchError && <div style={{ color: '#b42318', fontSize: 13, padding: '0 12px 8px' }}>{quickSearchError}</div>}
            <div style={{ maxHeight: 220, overflowY: 'auto', padding: '0 12px 12px' }}>
              {!quickOrders.length && !quickSearchError && (
                <div style={{ fontSize: 13, color: '#666' }}>ابحث برقم الهاتف لعرض آخر الطلبات المرتبطة به.</div>
              )}
              {quickOrders.map((order) => {
                const firstItem = Array.isArray(order.products) && order.products.length ? order.products[0] : null;
                const rawImg = order.firstProductImage || getPrimaryImage(firstItem, firstItem?.productDetails);
                const previewImg = resolvePreviewImg(rawImg);
                const productName = firstItem?.productDetails?.Name || firstItem?.Name || firstItem?.productName || '';
                return (
                  <div key={order._id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f3f3', alignItems: 'center' }}>
                    <div style={{ width: 56, height: 56, background: '#fafafa', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {previewImg ? (
                        <img src={previewImg} alt={productName || order.orderNumber || order._id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 11, color: '#999' }}>لا صورة</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {productName ? (
                        <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{productName}</div>
                      ) : (
                        <div style={{ fontWeight: 600 }}>#{order.orderNumber || order._id?.slice(-6)}</div>
                      )}
                      <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{orderStatusLabel(order.status)}</div>
                      <div style={{ fontSize: 12, color: '#777' }}>{formatCurrency(order.totalPrice)}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>{order.createdAt ? new Date(order.createdAt).toLocaleString('ar-EG') : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ border: '1px solid #eee', borderRadius: 8, background: '#fff', minHeight: 520, display: 'flex', flexDirection: 'column' }}>
          {loadingSession && <div style={{ padding: 16 }}>جاري التحميل...</div>}
          {!loadingSession && !selectedSession && <div style={{ padding: 24 }}>اختر محادثة من القائمة لعرض التفاصيل.</div>}
          {!loadingSession && selectedSession && (
            <>
              <div style={{ padding: 16, borderBottom: '1px solid #eee' }}>
                <div style={{ fontWeight: 700 }}>{selectedSession.customerName}</div>
                <div style={{ fontSize: 13, color: '#555' }}>{selectedSession.customerPhone}</div>
                <div style={{ fontSize: 12, color: '#777' }}>
                  {selectedSession.orderNumber ? `طلب #${selectedSession.orderNumber}` : 'استفسار بدون طلب'}
                </div>
              </div>

              {(selectedSession.orderNumber || orderPreviewLoading || orderPreview || orderPreviewError) && (
                <div style={{ borderBottom: '1px solid #eee', padding: '12px 16px', background: '#fdfbf5' }}>
                  {orderPreviewLoading && <div style={{ fontSize: 13, color: '#555' }}>جارٍ تحميل تفاصيل الطلب...</div>}
                  {!orderPreviewLoading && orderPreview && (
                    <>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
                        <div>#{orderPreview.orderNumber || orderPreview._id?.slice(-6)}</div>
                        <div>الحالة: <strong>{orderStatusLabel(orderPreview.status)}</strong></div>
                        <div>الإجمالي: <strong>{formatCurrency(orderPreview.totalPrice)}</strong></div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {Array.isArray(orderPreview.products) && orderPreview.products.length ? (
                          orderPreview.products.slice(0, 3).map((item, idx) => {
                            const previewImg = resolvePreviewImg(getPrimaryImage(item, item.productDetails));
                            const qty = item.quantity || item.qty || 1;
                            const name = item.productDetails?.Name || item.Name || `منتج ${idx + 1}`;
                            return (
                              <div key={`${item.product || idx}`} style={{ flex: '1 1 30%', minWidth: 140, border: '1px solid #eee', borderRadius: 8, padding: 6, display: 'flex', gap: 8, alignItems: 'center', background: '#fff' }}>
                                <div style={{ width: 44, height: 44, background: '#fafafa', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {previewImg ? <img src={previewImg} alt={name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 11, color: '#999' }}>لا صورة</span>}
                                </div>
                                <div style={{ fontSize: 12 }}>
                                  <div style={{ fontWeight: 600 }} className="text-truncate">{name}</div>
                                  <div style={{ color: '#555' }}>x{qty}</div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ fontSize: 12, color: '#777' }}>لا توجد منتجات لهذا الطلب.</div>
                        )}
                      </div>
                    </>
                  )}
                  {!orderPreviewLoading && !orderPreview && orderPreviewError && (
                    <div style={{ fontSize: 12, color: '#b42318' }}>{orderPreviewError}</div>
                  )}
                  {!orderPreviewLoading && !orderPreview && !orderPreviewError && selectedSession.orderNumber && (
                    <div style={{ fontSize: 12, color: '#777' }}>لا توجد بيانات معروضة لهذا الطلب حتى الآن.</div>
                  )}
                </div>
              )}

              <div
                ref={messageContainerRef}
                style={{ flex: 1, padding: 16, overflowY: 'auto', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                {messages.map((message, index) => (
                  <div
                    key={`${message.createdAt}-${index}`}
                    style={{
                      alignSelf: message.sender === 'admin' ? 'flex-end' : 'flex-start',
                      background: message.sender === 'admin' ? '#e8def8' : '#fff',
                      borderRadius: 10,
                      padding: '8px 10px',
                      maxWidth: '75%'
                    }}
                  >
                    <div style={{ fontSize: 13 }}>{message.text}</div>
                    <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>{formatTime(message.createdAt)}</div>
                  </div>
                ))}
                {!messages.length && <div style={{ textAlign: 'center', color: '#777' }}>لا توجد رسائل بعد.</div>}
              </div>

              <div style={{ borderTop: '1px solid #eee', padding: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder={selectedSession.status === 'closed' ? 'المحادثة مغلقة' : 'اكتب رسالة للعميل...'}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={selectedSession.status !== 'open'}
                  style={{ flex: 1, border: '1px solid #ccc', borderRadius: 8, padding: '8px 10px' }}
                />
                <button onClick={handleSend} disabled={!messageText.trim() || selectedSession.status !== 'open'} style={{ padding: '8px 16px' }}>
                  إرسال
                </button>
                <button onClick={handleCloseSession} disabled={selectedSession.status !== 'open' || closing} style={{ padding: '8px 16px' }}>
                  {closing ? 'جاري الإغلاق...' : 'إنهاء'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chats;
