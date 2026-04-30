import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import { useToastStore } from '../../store/toast';

const MENU_ROWS = [
  { emoji: '📍', t: 'Адреса',           s: '3 сохранённых' },
  { emoji: '💳', t: 'Способы оплаты',   s: '2 карты' },
  { emoji: '❤️', t: 'Избранные блюда',  s: '12' },
  { emoji: '🔔', t: 'Уведомления',      s: 'Push, SMS' },
  { emoji: '⭐', t: 'Пригласить друга', s: '500₸ бонус' },
];

export default function ClientProfilePage() {
  const user    = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout  = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.show);

  const [editing, setEditing]     = useState(false);
  const [savingProfile, setSaving] = useState(false);
  const [editName, setEditName]   = useState(user?.name ?? '');
  const [editPhone, setEditPhone] = useState(user?.phone ?? '');

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const profileIncomplete = !user?.phone;

  const openEdit = () => {
    setEditName(user?.name ?? '');
    setEditPhone(user?.phone ?? '');
    setEditing(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/auth/profile', {
        name: editName.trim() || undefined,
        phone: editPhone.trim() || undefined,
      });
      setUser({ ...user!, ...data });
      showToast('Профиль обновлён');
      setEditing(false);
    } catch {
      showToast('Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>

      {/* ── Edit sheet ── */}
      {editing && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(27,58,45,0.35)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setEditing(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 520,
              background: '#fff', borderRadius: '24px 24px 0 0',
              padding: '24px 24px 36px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 18, margin: 0, color: '#1B3A2D' }}>
                Редактировать профиль
              </h3>
              <button onClick={() => setEditing(false)} style={{
                background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B8F71',
              }}>✕</button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700, color: '#6B8F71' }}>
                Имя
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ваше имя"
                  style={{
                    padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E3ECE1',
                    fontSize: 14, fontFamily: 'Nunito, sans-serif', color: '#1B3A2D',
                    outline: 'none',
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700, color: '#6B8F71' }}>
                Телефон
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+7 700 000 00 00"
                  style={{
                    padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E3ECE1',
                    fontSize: 14, fontFamily: 'Nunito, sans-serif', color: '#1B3A2D',
                    outline: 'none',
                  }}
                />
              </label>

              <button
                onClick={saveProfile}
                disabled={savingProfile}
                style={{
                  padding: '13px 0', borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg, #3A9E5F, #8BC34A)',
                  color: '#fff', fontWeight: 800, fontSize: 15,
                  fontFamily: 'Nunito, sans-serif', cursor: 'pointer', marginTop: 4,
                }}
              >
                {savingProfile ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header section ── */}
      <div style={{
        position: 'relative', padding: '24px 24px 70px',
        background: 'linear-gradient(160deg, #EEF6EC 0%, #F7FAF5 100%)',
        borderRadius: 24, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -20, right: -40,
          width: 180, height: 180, borderRadius: '50%',
          background: 'radial-gradient(circle, #CFE4C5 0%, transparent 70%)',
          opacity: 0.6,
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 22, margin: 0, fontWeight: 700, color: '#1B3A2D' }}>
            Профиль
          </h2>
          <button
            onClick={openEdit}
            style={{
              width: 38, height: 38, borderRadius: 12,
              background: '#fff', border: 'none',
              display: 'grid', placeItems: 'center',
              boxShadow: '0 2px 8px rgba(27,58,45,0.1)',
              cursor: 'pointer', fontSize: 18,
            }}
            title="Настройки"
          >
            ⚙️
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18, position: 'relative' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #8BC34A, #3A9E5F)',
            display: 'grid', placeItems: 'center',
            color: '#fff', fontWeight: 800, fontSize: 26,
            border: '4px solid #fff',
            boxShadow: '0 4px 16px rgba(58,158,95,0.3)',
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 20, fontWeight: 700, color: '#1B3A2D' }}>
              {user?.name ?? 'Пользователь'}
            </div>
            <div style={{ fontSize: 12, color: '#6B8F71', marginTop: 2 }}>
              {user?.phone ?? user?.email}
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
              <span style={{ padding: '3px 8px', borderRadius: 999, background: '#1B3A2D', color: '#fff', fontSize: 10, fontWeight: 800 }}>
                ⭐ Gold
              </span>
              <span style={{ padding: '3px 8px', borderRadius: 999, background: '#fff', color: '#3A9E5F', fontSize: 10, fontWeight: 800 }}>
                820 ₿
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Fill profile banner ── */}
      {profileIncomplete && (
        <div style={{
          margin: '-20px 0 0',
          background: 'linear-gradient(135deg, #FFF6DF, #FDF1E3)',
          border: '1.5px solid #F9C74F',
          borderRadius: 18, padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 4px 14px -8px rgba(249,199,79,0.4)',
        }}>
          <span style={{ fontSize: 24 }}>📋</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#7A5C00' }}>Анкета не заполнена</div>
            <div style={{ fontSize: 11, color: '#A07820', marginTop: 2 }}>
              Добавьте телефон для быстрой доставки
            </div>
          </div>
          <button
            onClick={openEdit}
            style={{
              padding: '7px 14px', borderRadius: 10,
              background: '#F9C74F', border: 'none',
              fontWeight: 800, fontSize: 12, color: '#7A5C00',
              fontFamily: 'Nunito, sans-serif', cursor: 'pointer',
            }}
          >
            Заполнить
          </button>
        </div>
      )}

      {/* ── Goal card ── */}
      <div style={{
        marginTop: profileIncomplete ? 12 : '-40px',
        background: '#fff', borderRadius: 18, padding: 16,
        boxShadow: '0 10px 24px -16px rgba(27,58,45,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#6B8F71', fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Цель: похудение
          </div>
          <span style={{ fontSize: 12, color: '#3A9E5F', fontWeight: 800, cursor: 'pointer' }}>Изменить</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
          <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 22, fontWeight: 700, color: '#1B3A2D' }}>
            1 720 <span style={{ fontSize: 12, color: '#6B8F71', fontWeight: 700 }}>/ 1 800 ккал</span>
          </div>
          <div style={{ fontSize: 11, color: '#6B8F71', fontWeight: 700 }}>Сегодня</div>
        </div>
        <div style={{ marginTop: 8, height: 8, borderRadius: 4, background: '#EEF6EC', overflow: 'hidden' }}>
          <div style={{ width: '95%', height: '100%', background: 'linear-gradient(90deg, #3A9E5F, #8BC34A)', borderRadius: 4 }} />
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
          {[
            { l: 'Белки',  v: '88г',  max: '/100', c: '#4ABDE8', pct: '88%' },
            { l: 'Углев.', v: '180г', max: '/220', c: '#F9C74F', pct: '82%' },
            { l: 'Жиры',   v: '55г',  max: '/60',  c: '#E07070', pct: '92%' },
          ].map((m) => (
            <div key={m.l} style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: '#6B8F71', fontWeight: 700 }}>{m.l}</div>
              <div style={{ fontWeight: 800, fontSize: 12, marginTop: 2 }}>
                {m.v}<span style={{ color: '#6B8F71', fontWeight: 600 }}>{m.max}</span>
              </div>
              <div style={{ marginTop: 4, height: 4, borderRadius: 2, background: '#EEF6EC' }}>
                <div style={{ width: m.pct, height: '100%', background: m.c, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Settings menu ── */}
      <div style={{ marginTop: 16, background: '#fff', borderRadius: 18, overflow: 'hidden' }}>
        {MENU_ROWS.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 14,
              borderBottom: i === MENU_ROWS.length - 1 ? 'none' : '1px solid #EEF6EC',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#EEF6EC', display: 'grid', placeItems: 'center',
              fontSize: 16,
            }}>
              {row.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#1B3A2D' }}>{row.t}</div>
              <div style={{ fontSize: 11, color: '#6B8F71' }}>{row.s}</div>
            </div>
            <span style={{ fontSize: 16, color: '#6B8F71' }}>›</span>
          </div>
        ))}
      </div>

      {/* ── Logout ── */}
      <button
        onClick={() => { logout(); navigate('/login'); }}
        style={{
          marginTop: 16, marginBottom: 8, width: '100%',
          padding: '14px 0', borderRadius: 16,
          background: '#FBE4E4', border: 'none',
          color: '#C0392B', fontWeight: 800, fontSize: 14,
          fontFamily: 'Nunito, sans-serif', cursor: 'pointer',
        }}
      >
        Выйти из аккаунта
      </button>
    </div>
  );
}
