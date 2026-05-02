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
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #3A9E5F, #8BC34A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>🌿</div>
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

  const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    fontSize: 14,
    fontWeight: 700,
    padding: '6px 14px',
    borderRadius: 999,
    textDecoration: 'none',
    color: isActive ? '#3A9E5F' : '#1B3A2D',
    background: isActive ? 'rgba(58,158,95,.1)' : 'transparent',
    transition: 'all 0.15s',
    fontFamily: 'Nunito, sans-serif',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAF5', fontFamily: 'Nunito, sans-serif' }}>
      {/* ── Client header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#fff',
        borderBottom: '1.5px solid #E3ECE1',
        height: 'calc(60px + env(safe-area-inset-top))',
        paddingTop: 'env(safe-area-inset-top)',
        display: 'flex', alignItems: 'center',
        paddingLeft: 24, paddingRight: 24, gap: 0,
      }}>
        {/* Logo */}
        <Link to="/client" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginRight: 28, flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #3A9E5F, #8BC34A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
          }}>🌿</div>
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: 17, color: '#1B3A2D', letterSpacing: '-0.01em' }}>
            paidaly
          </span>
        </Link>

        {/* Center nav */}
        <nav className="client-header-nav" style={{ display: 'flex', gap: 2, flex: 1 }}>
          <NavLink to="/client" end style={navLinkStyle}>Главная</NavLink>
          <NavLink to="/client/menu" style={navLinkStyle}>Меню</NavLink>
          <NavLink to="/client/orders" style={navLinkStyle}>Мои заказы</NavLink>
        </nav>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Address */}
          <div className="client-header-address"><AddressPicker /></div>

          {/* Search */}
          <button className="client-header-search" onClick={() => navigate('/client/menu')} style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#F7FAF5', border: '1.5px solid #E3ECE1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, cursor: 'pointer', color: '#1B3A2D', padding: 0,
          }}>
            🔍
          </button>

          {/* Cart */}
          <button onClick={() => navigate('/client/checkout')} style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#F7FAF5', border: '1.5px solid #E3ECE1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, cursor: 'pointer', color: '#1B3A2D', position: 'relative', padding: 0,
          }}>
            🛍
            {cartQty > 0 && (
              <span style={{
                position: 'absolute', top: -3, right: -3,
                width: 16, height: 16, borderRadius: '50%',
                background: '#E07070', color: '#fff',
                fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #fff',
              }}>
                {cartQty > 9 ? '9+' : cartQty}
              </span>
            )}
          </button>

          {/* Bell */}
          <button className="client-header-bell" style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#F7FAF5', border: '1.5px solid #E3ECE1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, cursor: 'pointer', color: '#1B3A2D', position: 'relative', padding: 0,
          }}>
            🔔
          </button>

          {/* Avatar → profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              title="Профиль"
              onClick={() => navigate('/client/profile')}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #8BC34A, #3A9E5F)',
                border: 'none', color: '#fff',
                fontWeight: 800, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0,
                fontFamily: 'Nunito, sans-serif',
              }}
            >
              {initials}
            </button>
          </div>
        </div>
      </header>

      <div className="client-content-wrapper" style={{ maxWidth: 1160, margin: '0 auto', padding: '24px 24px 64px' }}>
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
        <span className="tab-icon" style={{ position: 'relative', display: 'inline-block' }}>
          👤
          {cartQty > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -8,
              minWidth: 14, height: 14, borderRadius: 7,
              background: '#E07070', color: '#fff',
              fontSize: 8, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid #fff', padding: '0 2px',
            }}>{cartQty > 9 ? '9+' : cartQty}</span>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F7FAF5' }}>
        <p style={{ color: '#6B8F71', fontFamily: 'Nunito, sans-serif', fontWeight: 600 }}>Загрузка...</p>
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
