import { useEffect, useState } from 'react';
import { api } from '../api/client';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationsToggle() {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(!!sub))
      .catch(() => undefined);
  }, []);

  const enable = async () => {
    setError('');
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError('Push не поддерживается в этом браузере');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setError('Разрешение на уведомления не выдано');
      return;
    }

    const { data } = await api.get('/notifications/vapid-public-key');
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });

    await api.post('/notifications/subscribe', {
      subscription,
    });

    setEnabled(true);
  };

  const disable = async () => {
    setError('');
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api.post('/notifications/unsubscribe', { endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
    setEnabled(false);
  };

  return (
    <div className="card">
      <h3>Уведомления</h3>
      <p className="small-text">Статус: {enabled ? 'включены' : 'выключены'}</p>
      {!enabled && <button onClick={enable}>Включить уведомления</button>}
      {enabled && <button onClick={disable}>Выключить уведомления</button>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
