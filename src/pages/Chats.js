import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../api';
import { useToast } from '../components/Toaster';
import newMessageSound from '../media/newmessage.mp3';

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

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  useEffect(() => {
    selectedSessionRef.current = selectedSession;
  }, [selectedSession]);

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
  }, [filter, toast, loadSession]);

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
