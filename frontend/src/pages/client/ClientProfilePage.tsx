import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import { useToastStore } from '../../store/toast';
import './client-profile.css';

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
    <div className="profile-page">

      {/* ── Edit sheet ── */}
      {editing && (
        <div className="profile-overlay" onClick={() => setEditing(false)}>
          <div className="profile-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="profile-sheet__header">
              <h3 className="profile-sheet__title">Редактировать профиль</h3>
              <button className="profile-sheet__close-btn" onClick={() => setEditing(false)}>✕</button>
            </div>

            <div className="profile-sheet__form">
              <label className="profile-sheet__label">
                Имя
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ваше имя"
                  className="profile-sheet__input"
                />
              </label>
              <label className="profile-sheet__label">
                Телефон
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+7 700 000 00 00"
                  className="profile-sheet__input"
                />
              </label>

              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="profile-sheet__save-btn"
              >
                {savingProfile ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header section ── */}
      <div className="profile-header">
        <div className="profile-header__circle" />

        <div className="profile-header__top">
          <h2 className="profile-header__title">Профиль</h2>
          <button
            onClick={openEdit}
            className="profile-header__settings-btn"
            title="Настройки"
          >
            ⚙️
          </button>
        </div>

        <div className="profile-header__user">
          <div className="profile-header__avatar">{initials}</div>
          <div>
            <div className="profile-header__name">{user?.name ?? 'Пользователь'}</div>
            <div className="profile-header__phone">{user?.phone ?? user?.email}</div>
            <div className="profile-header__badges">
              <span className="profile-badge--gold">⭐ Gold</span>
              <span className="profile-badge--bonus">820 ₿</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Fill profile banner ── */}
      {profileIncomplete && (
        <div className="profile-banner">
          <span className="profile-banner__emoji">📋</span>
          <div className="profile-banner__body">
            <div className="profile-banner__title">Анкета не заполнена</div>
            <div className="profile-banner__subtitle">Добавьте телефон для быстрой доставки</div>
          </div>
          <button onClick={openEdit} className="profile-banner__btn">Заполнить</button>
        </div>
      )}

      {/* ── Goal card ── */}
      <div className={`profile-goal ${profileIncomplete ? 'profile-goal--with-banner' : 'profile-goal--no-banner'}`}>
        <div className="profile-goal__header">
          <div className="profile-goal__label">Цель: похудение</div>
          <span className="profile-goal__change">Изменить</span>
        </div>
        <div className="profile-goal__kcal-row">
          <div className="profile-goal__kcal-value">
            1 720 <span className="profile-goal__kcal-max">/ 1 800 ккал</span>
          </div>
          <div className="profile-goal__today">Сегодня</div>
        </div>
        <div className="profile-goal__bar-bg">
          <div className="profile-goal__bar-fill" />
        </div>
        <div className="profile-goal__macros">
          {[
            { l: 'Белки',  v: '88г',  max: '/100', c: '#4ABDE8', pct: '88%' },
            { l: 'Углев.', v: '180г', max: '/220', c: '#F9C74F', pct: '82%' },
            { l: 'Жиры',   v: '55г',  max: '/60',  c: '#E07070', pct: '92%' },
          ].map((m) => (
            <div key={m.l} className="profile-macro">
              <div className="profile-macro__label">{m.l}</div>
              <div className="profile-macro__value">
                {m.v}<span className="profile-macro__max">{m.max}</span>
              </div>
              <div className="profile-macro__bar-bg">
                <div className="profile-macro__bar-fill" style={{ width: m.pct, background: m.c }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Settings menu ── */}
      <div className="profile-settings">
        {MENU_ROWS.map((row, i) => (
          <div
            key={i}
            className={`profile-settings__row ${i === MENU_ROWS.length - 1 ? '' : 'profile-settings__row--bordered'}`}
          >
            <div className="profile-settings__row-icon">{row.emoji}</div>
            <div className="profile-settings__row-body">
              <div className="profile-settings__row-title">{row.t}</div>
              <div className="profile-settings__row-sub">{row.s}</div>
            </div>
            <span className="profile-settings__row-arrow">›</span>
          </div>
        ))}
      </div>

      {/* ── Logout ── */}
      <button
        onClick={() => { logout(); navigate('/login'); }}
        className="profile-logout-btn"
      >
        Выйти из аккаунта
      </button>
    </div>
  );
}
