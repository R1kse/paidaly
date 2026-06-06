import { useState } from 'react';
import { api } from '../api/client';

type Props = {
  orderId: string;
  amount: number;
  onClose: () => void;  // переход к заказу
  onBack?: () => void;  // просто закрыть модал
};

export default function KaspiQrModal({ orderId, amount, onClose, onBack }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [waitingDispatcher, setWaitingDispatcher] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await api.post(`/payments/kaspi/confirm/${orderId}`);
      setWaitingDispatcher(true);
    } catch {
      setConfirming(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, padding: 32,
        maxWidth: 380, width: '100%', textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      }}>
        {waitingDispatcher ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1E6B3C' }}>Оплата отправлена!</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 8, lineHeight: 1.6 }}>
              Ожидайте подтверждения диспетчера.<br />
              Вы получите уведомление, когда заказ будет принят.
            </div>
            <div style={{
              background: '#FFF8E1', borderRadius: 12, padding: '10px 16px',
              margin: '20px 0', border: '1.5px solid #FFE082',
              fontSize: 13, color: '#795548', fontWeight: 600,
            }}>
              Сумма: <strong style={{ color: '#E50000' }}>{amount.toLocaleString('ru-KZ')} ₸</strong>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                background: '#1E6B3C', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
              }}
            >
              Перейти к заказу →
            </button>
          </>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>📱</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#E50000' }}>Kaspi QR</span>
            </div>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 16px' }}>
              Сканируйте QR-код в приложении Kaspi
            </p>

            {/* Amount — вверху, хорошо видна */}
            <div style={{
              background: '#FFF3F3', borderRadius: 12, padding: '12px 16px',
              marginBottom: 16, border: '1.5px solid #FFD0D0',
            }}>
              <div style={{ fontSize: 11, color: '#999', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Сумма к оплате
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#E50000', marginTop: 2 }}>
                {amount.toLocaleString('ru-KZ')} ₸
              </div>
            </div>

            {/* QR image */}
            <div style={{
              border: '3px solid #E50000', borderRadius: 16,
              padding: 12, display: 'inline-block', marginBottom: 16,
              background: '#fff',
            }}>
              <img
                src={`${import.meta.env.BASE_URL}kaspi-qr.png`}
                alt="Kaspi QR"
                style={{ width: 200, height: 200, display: 'block' }}
              />
            </div>

            {/* Steps */}
            <div style={{ textAlign: 'left', marginBottom: 20, fontSize: 13, color: '#444', lineHeight: 1.8 }}>
              <div>1. Откройте приложение <strong>Kaspi</strong></div>
              <div>2. Нажмите <strong>«Сканировать QR»</strong></div>
              <div>3. Введите сумму: <strong>{amount.toLocaleString('ru-KZ')} ₸</strong></div>
              <div>4. Подтвердите оплату</div>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirm}
              disabled={confirming}
              style={{
                width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                background: confirming ? '#ccc' : '#E50000',
                color: '#fff', fontWeight: 800, fontSize: 15, cursor: confirming ? 'default' : 'pointer',
                marginBottom: 10,
              }}
            >
              {confirming ? 'Отправка...' : 'Я оплатил ✓'}
            </button>

            <button
              onClick={onBack ?? onClose}
              style={{
                width: '100%', padding: '10px', borderRadius: 14, border: '1.5px solid #ddd',
                background: 'transparent', color: '#666', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              Вернуться к заказу
            </button>
          </>
        )}
      </div>
    </div>
  );
}
