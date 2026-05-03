import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

type Msg = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  'Что поесть при гастрите?',
  'Низкокалорийный обед',
  'Без лактозы на завтрак',
  'Что посоветуешь при СРК?',
];

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const send = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || loading) return;
    const newHistory: Msg[] = [...history, { role: 'user', content: t }];
    setHistory(newHistory);
    setInput('');
    setLoading(true);
    try {
      const { data } = await api.post('/ai/chat', { history: newHistory });
      setHistory([...newHistory, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      const status = err?.response?.status;
      const errMsg = status === 500
        ? 'Ошибка сервера. Проверьте, что GROQ_API_KEY установлен в Railway.'
        : status === 401
        ? 'Необходима авторизация. Попробуйте перезайти.'
        : 'Не удалось получить ответ. Проверьте соединение.';
      setHistory([...newHistory, { role: 'assistant', content: errMsg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom) + 76px)', right: 16,
          width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: open ? '#1B3A2D' : 'var(--green)',
          boxShadow: '0 4px 20px rgba(58,158,95,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, zIndex: 200, transition: 'background 0.2s, transform 0.2s',
          transform: open ? 'scale(0.92)' : 'scale(1)',
        }}
        title="AI-ассистент"
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom) + 138px)', right: 16,
          width: 'min(360px, calc(100vw - 32px))',
          height: 'min(500px, calc(100vh - 200px))',
          background: '#fff', borderRadius: 20,
          boxShadow: '0 8px 40px rgba(27,58,45,0.18)',
          border: '1.5px solid var(--line)',
          display: 'flex', flexDirection: 'column',
          zIndex: 199, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px 12px', borderBottom: '1.5px solid var(--line)', background: 'var(--green)', flexShrink: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#fff' }}>🤖 AI-ассистент</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontWeight: 600 }}>
              Спросите про меню, питание и рацион
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.length === 0 && (
              <>
                <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', fontWeight: 600, padding: '8px 0' }}>
                  Привет! Я помогу подобрать блюда под ваши потребности 🌿
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      style={{
                        padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--line)',
                        background: 'var(--bg-tint)', cursor: 'pointer', textAlign: 'left',
                        fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'Nunito, sans-serif',
                        transition: 'background 0.15s',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            {history.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {msg.role === 'assistant' && (
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--green)', marginBottom: 3, paddingLeft: 4 }}>
                    🤖 Ассистент
                  </div>
                )}
                <div style={{
                  maxWidth: '85%',
                  padding: '9px 13px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? 'var(--green)' : 'var(--bg-tint)',
                  color: msg.role === 'user' ? '#fff' : 'var(--ink)',
                  fontSize: 13, fontWeight: 600, lineHeight: 1.5,
                  border: msg.role === 'assistant' ? '1px solid var(--line)' : 'none',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: 'var(--bg-tint)', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{
                        width: 7, height: 7, borderRadius: '50%', background: 'var(--muted)',
                        animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1.5px solid var(--line)', display: 'flex', gap: 8, background: '#fff', flexShrink: 0 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Спросить об питании..."
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 12,
                border: '1.5px solid var(--line)', background: 'var(--bg-tint)',
                color: 'var(--ink)', fontSize: 13, outline: 'none',
                fontFamily: 'Nunito, sans-serif', fontWeight: 600,
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: input.trim() && !loading ? 'var(--green)' : 'var(--line)',
                border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'grid', placeItems: 'center', transition: 'background 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#fff' : '#aaa'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}
