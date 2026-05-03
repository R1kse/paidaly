import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getSocket, subscribeOrder } from '../ws/socket';

type Msg = {
  id: string;
  orderId: string;
  text: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
};

const ROLE_LABEL: Record<string, string> = {
  CLIENT: 'Клиент',
  COURIER: 'Курьер',
  DISPATCHER: 'Диспетчер',
};

const ROLE_COLOR: Record<string, string> = {
  CLIENT: '#4ABDE8',
  COURIER: '#8BC34A',
  DISPATCHER: '#F9C74F',
};

interface Props {
  orderId: string;
  dark?: boolean;
}

export default function ChatPanel({ orderId, dark = false }: Props) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // load history
  useEffect(() => {
    if (!orderId) return;
    api.get(`/messages/${orderId}`).then((r) => setMessages(r.data)).catch(() => {});
  }, [orderId]);

  // real-time
  useEffect(() => {
    if (!token || !orderId) return;
    const socket = getSocket(token);

    subscribeOrder(orderId);

    const handler = (msg: Msg) => {
      if (msg.orderId === orderId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };
    socket.on('chat.message', handler);
    return () => { socket.off('chat.message', handler); };
  }, [token, orderId]);

  // auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    const optimistic: Msg = {
      id: `opt-${Date.now()}`,
      orderId,
      text: t,
      createdAt: new Date().toISOString(),
      sender: { id: user?.id ?? '', name: user?.name ?? 'Вы', role: user?.role ?? 'CLIENT' },
    };
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    setSending(true);
    try {
      const { data } = await api.post(`/messages/${orderId}`, { text: t });
      setMessages((prev) =>
        prev.map((m) => m.id === optimistic.id ? { ...data, orderId } : m),
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setText(t);
    } finally {
      setSending(false);
    }
  };

  const bg     = dark ? '#0E1814' : '#F7FAF5';
  const card   = dark ? '#172521' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.07)' : '#E3ECE1';
  const ink    = dark ? '#E8F3EC' : '#1B3A2D';
  const muted  = dark ? '#8FA69A' : '#6B8F71';
  const inputBg = dark ? '#1A2E22' : '#F7FAF5';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: bg }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: muted, fontSize: 13, marginTop: 24 }}>
            Нет сообщений. Начните переписку.
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender.id === user?.id;
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              {!isMe && (
                <div style={{ fontSize: 10, fontWeight: 800, color: ROLE_COLOR[msg.sender.role] ?? muted, marginBottom: 2, paddingLeft: 4 }}>
                  {msg.sender.name} · {ROLE_LABEL[msg.sender.role] ?? msg.sender.role}
                </div>
              )}
              <div style={{
                maxWidth: '78%',
                padding: '8px 12px',
                borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isMe ? '#3A9E5F' : card,
                color: isMe ? '#fff' : ink,
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.45,
                border: isMe ? 'none' : `1px solid ${border}`,
                wordBreak: 'break-word',
              }}>
                {msg.text}
              </div>
              <div style={{ fontSize: 10, color: muted, marginTop: 2, paddingLeft: 4, paddingRight: 4 }}>
                {new Date(msg.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${border}`, display: 'flex', gap: 8, background: card, flexShrink: 0 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Написать сообщение..."
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 12,
            border: `1.5px solid ${border}`, background: inputBg,
            color: ink, fontSize: 13, outline: 'none',
            fontFamily: 'Nunito, sans-serif', fontWeight: 600,
          }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: text.trim() ? '#3A9E5F' : (dark ? '#1A2E22' : '#E3ECE1'),
            border: 'none', cursor: text.trim() ? 'pointer' : 'default',
            display: 'grid', placeItems: 'center', transition: 'background 0.15s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={text.trim() ? '#fff' : muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
