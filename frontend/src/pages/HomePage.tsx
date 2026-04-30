import { useState } from 'react';
import { Link } from 'react-router-dom';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const DISHES = [
  { title: 'Фитнес-салат',      desc: 'Курица, авокадо, овощи',  kcal: '450 ккал', emoji: '🥗', bg: 'dish-photo--salad' },
  { title: 'Поке с лососем',    desc: 'Рис, лосось, эдамаме',    kcal: '520 ккал', emoji: '🥣', bg: 'dish-photo--main'  },
  { title: 'Протеиновый смузи', desc: 'Банан, ягоды, протеин',   kcal: '200 ккал', emoji: '🥤', bg: 'dish-photo--drink' },
];

const ROLES = [
  {
    to: '/client',
    icon: '🥗',
    title: 'Я клиент',
    desc: 'Смотреть меню и делать заказы',
    bg: 'linear-gradient(135deg, #EAF2DF, #CFE4C5)',
    color: '#1B3A2D',
  },
  {
    to: '/courier',
    icon: '🚴',
    title: 'Я курьер',
    desc: 'Принимать и доставлять заказы',
    bg: 'linear-gradient(135deg, #E2F4FC, #B8DDEF)',
    color: '#0D3B52',
  },
  {
    to: '/dispatcher',
    icon: '📋',
    title: 'Диспетчер',
    desc: 'Управление заказами и курьерами',
    bg: 'linear-gradient(135deg, #FFF6DF, #F5E4B8)',
    color: '#5A3A00',
  },
];

export default function HomePage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const checkApi = async () => {
    setLoading(true);
    setResult('');
    try {
      const response = await fetch(`${apiUrl}/health`);
      const data = (await response.json()) as { status: string };
      setResult(`✓ API: ${data.status}`);
    } catch {
      setResult('Ошибка подключения к API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing">
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-content">
          <span className="badge" style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: '1px solid rgba(255,255,255,.3)', width: 'fit-content' }}>
            🌿 Здоровое питание
          </span>
          <h2>
            Еда, которая{' '}
            <span style={{ color: '#fff' }}>питает</span> тебя
          </h2>
          <p>
            Свежие и сбалансированные блюда с указанием БЖУ,
            онлайн-оплатой и трекингом доставки в реальном времени.
          </p>
          <div className="hero-actions">
            <Link to="/login" className="hero-btn-white">
              Смотреть меню →
            </Link>
            <button
              onClick={checkApi}
              disabled={loading}
              className="hero-btn-ghost"
            >
              {loading ? 'Проверка...' : 'Проверить API'}
            </button>
          </div>
          {result && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', fontWeight: 600, margin: 0 }}>
              {result}
            </p>
          )}
        </div>
        <div className="hero-visual">
          <div className="hero-plate">🥗</div>
          <div className="hero-leaf" />
          <div className="hero-leaf second" />
        </div>
      </section>

      {/* ── Role cards ── */}
      <section className="section" style={{ padding: '28px' }}>
        <h3 style={{ marginBottom: 4 }}>Войдите как</h3>
        <p style={{ fontSize: 13, marginBottom: 20 }}>Выберите вашу роль для входа в систему</p>
        <div className="cards">
          {ROLES.map((r) => (
            <Link key={r.to} to={r.to} className="role-card" style={{ background: r.bg, color: r.color }}>
              <div className="role-card-icon">{r.icon}</div>
              <div className="role-card-title">{r.title}</div>
              <div className="role-card-desc">{r.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Popular dishes ── */}
      <section className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Популярные блюда</h3>
          <Link to="/login" style={{ fontSize: 13, color: 'var(--green)', fontWeight: 800 }}>
            Все →
          </Link>
        </div>
        <div className="cards-grid">
          {DISHES.map((item) => (
            <div key={item.title} className="menu-card">
              <div className={`menu-photo ${item.bg}`}>
                <span style={{ fontSize: 52 }}>{item.emoji}</span>
              </div>
              <div className="menu-card-body">
                <h4 style={{ fontSize: 14, margin: 0 }}>{item.title}</h4>
                <p className="small-text" style={{ margin: 0 }}>{item.desc}</p>
              </div>
              <div className="menu-footer">
                <span className="pill-kcal">🔥 {item.kcal}</span>
                <Link
                  to="/login"
                  style={{
                    background: 'var(--grad)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 11,
                    padding: '7px 14px',
                    fontSize: 12,
                    fontWeight: 800,
                    fontFamily: 'var(--font)',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    boxShadow: '0 6px 16px -8px rgba(58,158,95,.5)',
                  }}
                >
                  + Добавить
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="section muted">
        <h3>Как это работает</h3>
        <div className="steps">
          {[
            { icon: '🥗', title: 'Выберите блюдо',     desc: 'Фильтры по БЖУ, диетам и аллергенам.' },
            { icon: '💳', title: 'Оплатите онлайн',    desc: 'Kaspi Pay, карты — быстро и безопасно.' },
            { icon: '📍', title: 'Отслеживайте заказ', desc: 'Карта курьера в реальном времени + ETA.' },
          ].map((s) => (
            <div key={s.title} className="step">
              <div className="step-icon">{s.icon}</div>
              <h4 style={{ marginBottom: 6 }}>{s.title}</h4>
              <p className="small-text">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Order timeline ── */}
      <section className="section">
        <h3>Отслеживание заказа</h3>
        <div className="timeline">
          {['Принят', 'Готовится', 'В пути', 'Доставлен'].map((label, idx) => (
            <div key={label} className={`timeline-step ${idx < 3 ? 'done' : ''}`}>
              <span className="dot" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact footer ── */}
      <section className="section contact">
        <div>
          <h4>Контакты</h4>
          <p className="small-text">+7 700 123 45 67</p>
        </div>
        <div className="contact-links">
          <Link to="/client">Меню</Link>
          <Link to="/courier">Доставка</Link>
          <Link to="/login">Войти</Link>
        </div>
      </section>
    </div>
  );
}
