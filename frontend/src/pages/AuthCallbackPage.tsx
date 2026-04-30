import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function AuthCallbackPage() {
  const setToken = useAuthStore((s) => s.setToken);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    setToken(token);
    fetchMe().then(() => {
      const user = useAuthStore.getState().user;
      if (user?.role === 'CLIENT') navigate('/client', { replace: true });
      else if (user?.role === 'COURIER') navigate('/courier', { replace: true });
      else if (user?.role === 'DISPATCHER') navigate('/dispatcher', { replace: true });
      else navigate('/', { replace: true });
    });
  }, []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#F7FAF5',
    }}>
      <p style={{ color: '#6B8F71', fontFamily: 'Nunito, sans-serif', fontWeight: 600 }}>
        Входим через Google...
      </p>
    </div>
  );
}
