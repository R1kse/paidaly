import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuthStore, UserRole } from './store/auth';
import { useCartStore } from './store/cart';
import AddressPicker from './components/AddressPicker';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import HomePage from './pages/HomePage';
import ClientPage from './pages/ClientPage';
import CourierPage from './pages/CourierPage';
import DispatcherPage from './pages/DispatcherPage';
import ToastHost from './components/ToastHost';
import './app.css';

function PrivateRoute({ roles, children }: { roles: UserRole[]; children: JSX.Element }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

/* ── Generic shell (home, login) ─────────────────────────── */
function AppShell({ children }: { children: JSX.Element }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="app-shell">
      <header>
        <Link to="/" className="app-shell-logo">
          <div className="app-shell-logo__icon">🌿</div>
          <h1 style={{ color: '#fff', fontSize: 18 }}>paidaly</h1>
        </Link>
        <nav>
          {user?.role === 'CLIENT'     && <Link to="/client">Меню</Link>}
          {user?.role === 'COURIER'    && <Link to="/courier">Доставки</Link>}
          {user?.role === 'DISPATCHER' && <Link to="/dispatcher">Диспетчер</Link>}
          {user ? (
            <button className="link-button" onClick={logout}>Выйти</button>
          ) : (
            <Link to="/login" style={{ color: 'rgba(255,255,255,.75)', fontSize: 14, fontWeight: 600, padding: '6px 12px' }}>Войти</Link>
          )}
        </nav>
      </header>
      <main>{children}</main>
      <ToastHost />
    </div>
  );
}

/* ── Client shell: header from the screenshot ────────────── */
function ClientShell({ children }: { children: JSX.Element }) {
  const user = useAuthStore((s) => s.user);
  const cartQty = useCartStore((s) => s.lines.reduce((sum, l) => sum + l.quantity, 0));
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="client-shell">
      {/* ── Client header ── */}
      <header className="client-header">
        {/* Logo */}
        <Link to="/client" className="client-header__logo">
          <div className="client-header__logo-icon">🌿</div>
          <span className="client-header__logo-name">paidaly</span>
        </Link>

        {/* Center nav */}
        <nav className="client-header__nav">
          <NavLink to="/client" end className={({ isActive }) => `client-nav-link${isActive ? ' client-nav-link--active' : ''}`}>Главная</NavLink>
          <NavLink to="/client/menu" className={({ isActive }) => `client-nav-link${isActive ? ' client-nav-link--active' : ''}`}>Меню</NavLink>
          <NavLink to="/client/orders" className={({ isActive }) => `client-nav-link${isActive ? ' client-nav-link--active' : ''}`}>Мои заказы</NavLink>
        </nav>

        {/* Right side */}
        <div className="client-header__right">
          {/* Address */}
          <div className="client-header-address"><AddressPicker /></div>

          {/* Search */}
          <button className="client-header__icon-btn" onClick={() => navigate('/client/menu')}>
            🔍
          </button>

          {/* Cart */}
          <button className="client-header__icon-btn" onClick={() => navigate('/client/checkout')}>
            🛍
            {cartQty > 0 && (
              <span className="client-header__cart-badge">
                {cartQty > 9 ? '9+' : cartQty}
              </span>
            )}
          </button>

          {/* Bell */}
          <button className="client-header__icon-btn">
            🔔
          </button>

          {/* Avatar → profile */}
          <div className="client-header__avatar-wrap">
            <button
              title="Профиль"
              onClick={() => navigate('/client/profile')}
              className="client-header__avatar-btn"
            >
              {initials}
            </button>
          </div>
        </div>
      </header>

      <div className="client-shell__content">
        {children}
      </div>
      <MobileTabBar />
      <ToastHost />
    </div>
  );
}

/* ── Mobile tab bar (shown ≤768px) ───────────────────────── */
function MobileTabBar() {
  const cartQty = useCartStore((s) => s.lines.reduce((sum, l) => sum + l.quantity, 0));

  return (
    <nav className="mobile-tab-bar">
      <NavLink to="/client" end className={({ isActive }) => `mobile-tab-item${isActive ? ' active' : ''}`}>
        <span className="tab-icon">🏠</span>
        <span>Главная</span>
      </NavLink>
      <NavLink to="/client/menu" className={({ isActive }) => `mobile-tab-item${isActive ? ' active' : ''}`}>
        <span className="tab-icon">🥗</span>
        <span>Меню</span>
      </NavLink>
      <NavLink to="/client/orders" className={({ isActive }) => `mobile-tab-item${isActive ? ' active' : ''}`}>
        <span className="tab-icon">📦</span>
        <span>Заказы</span>
      </NavLink>
      <NavLink to="/client/profile" className={({ isActive }) => `mobile-tab-item${isActive ? ' active' : ''}`}>
        <span className="tab-icon mobile-tab-icon-wrap">
          👤
          {cartQty > 0 && (
            <span className="mobile-tab-badge">{cartQty > 9 ? '9+' : cartQty}</span>
          )}
        </span>
        <span>Профиль</span>
      </NavLink>
    </nav>
  );
}


function CourierShell({ children }: { children: JSX.Element }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const prevHtml = html.style.background;
    const prevBody = body.style.background;
    const prevTheme = meta?.content ?? '';
    html.style.background = '#0E1814';
    body.style.background = '#0E1814';
    if (meta) meta.content = '#0E1814';
    return () => {
      html.style.background = prevHtml;
      body.style.background = prevBody;
      if (meta) meta.content = prevTheme;
    };
  }, []);

  return (
    <div style={{ background: '#0E1814', minHeight: '100vh', fontFamily: 'Inter, Segoe UI, system-ui, sans-serif' }}>
      {children}
      <ToastHost />
    </div>
  );
}

/* ── App ─────────────────────────────────────────────────── */
export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const token = useAuthStore((s) => s.token);
  // Start ready if we already have a cached user, so no flash on reload
  const [ready, setReady] = useState(() => !!useAuthStore.getState().user);

  useEffect(() => {
    fetchMe().finally(() => setReady(true));
  }, [fetchMe, token]);

  if (!ready) {
    return (
      <div className="app-loading">
        <p className="app-loading__text">Загрузка...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login"         element={<AppShell><LoginPage /></AppShell>} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/"              element={<AppShell><HomePage /></AppShell>} />

      <Route
        path="/client/*"
        element={
          <PrivateRoute roles={['CLIENT']}>
            <ClientShell><ClientPage /></ClientShell>
          </PrivateRoute>
        }
      />

      <Route
        path="/courier"
        element={
          <PrivateRoute roles={['COURIER']}>
            <CourierShell><CourierPage /></CourierShell>
          </PrivateRoute>
        }
      />

      {/* Dispatcher: full-screen layout, no shell */}
      <Route
        path="/dispatcher"
        element={
          <PrivateRoute roles={['DISPATCHER']}>
            <>
              <DispatcherPage />
              <ToastHost />
            </>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
