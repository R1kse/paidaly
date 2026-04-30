import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setToken = useAuthStore((s) => s.setToken);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const { data } = await api.post('/auth/login', { email, password });
        setToken(data.accessToken);
        await fetchMe();
        const role = data.user?.role ?? user?.role;
        if (role === 'CLIENT') navigate('/client');
        else if (role === 'COURIER') navigate('/courier');
        else if (role === 'DISPATCHER') navigate('/dispatcher');
        else navigate('/');
      } else {
        await api.post('/auth/register', { email, password, name, phone });
        setMode('login');
        setError('');
      }
    } catch {
      setError(mode === 'login' ? 'Неверный email или пароль' : 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🌿</div>
          <span className="auth-logo-name">paidaly</span>
        </div>

        <h2 className="auth-title">
          {mode === 'login' ? 'Добро пожаловать' : 'Создать аккаунт'}
        </h2>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Войдите, чтобы сделать заказ'
            : 'Зарегистрируйтесь — это займёт минуту'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          {mode === 'register' && (
            <>
              <label>
                Имя
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ваше имя"
                  required
                />
              </label>
              <label>
                Телефон
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 700 000 00 00"
                />
              </label>
            </>
          )}
          <label>
            Почта (email)
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </label>
          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error && (
            <div style={{
              background: '#FBE4E4', borderRadius: 12, padding: '10px 14px',
              fontSize: 13, color: '#8A2E2E', fontWeight: 700,
            }}>
              {error}
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Войти →' : 'Зарегистрироваться →'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#E3ECE1' }} />
          <span style={{ fontSize: 12, color: '#6B8F71', fontWeight: 700 }}>или</span>
          <div style={{ flex: 1, height: 1, background: '#E3ECE1' }} />
        </div>

        {/* Google button */}
        <button
          type="button"
          onClick={() => {
            const api = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            window.location.href = `${api}/auth/google`;
          }}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 14,
            border: '1.5px solid #E3ECE1', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 14,
            color: '#1B3A2D', cursor: 'pointer',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Войти через Google
        </button>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Нет аккаунта?{' '}
              <span onClick={() => { setMode('register'); setError(''); }}>
                Зарегистрироваться
              </span>
            </>
          ) : (
            <>Уже есть аккаунт?{' '}
              <span onClick={() => { setMode('login'); setError(''); }}>
                Войти
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
