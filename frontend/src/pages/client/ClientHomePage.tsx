import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useCartStore } from '../../store/cart';
import { useToastStore } from '../../store/toast';
import './client-home.css';

const CATEGORIES = [
  { e: '🥗', t: 'Салаты',  c: '#E0F1E6', type: 'SALAD' },
  { e: '🍲', t: 'Супы',    c: '#FFF6DF', type: 'SOUP' },
  { e: '🥩', t: 'Белки',   c: '#FBE4E4', type: 'MAIN' },
  { e: '🥤', t: 'Смузи',   c: '#F0E1F0', type: 'DRINK' },
  { e: '🥣', t: 'Каши',    c: '#FDF1E3', type: 'BREAKFAST' },
  { e: '🍞', t: 'Тосты',   c: '#F4EAD8', type: 'SNACK' },
];

function dishEmoji(dishType: string) {
  const map: Record<string, string> = {
    BREAKFAST: '🥣', SOUP: '🍲', MAIN: '🍽', SALAD: '🥗',
    SNACK: '🥜', DESSERT: '🍓', DRINK: '🥤',
  };
  return map[dishType] ?? '🍴';
}

function dishBg(dishType: string) {
  const map: Record<string, string> = {
    BREAKFAST: '#F4EFE1', SOUP: '#FDF4E4', MAIN: '#EAF2DF',
    SALAD: '#E9F3DB', SNACK: '#FFF6DF', DESSERT: '#F3E8F0', DRINK: '#E8EEF8',
  };
  return map[dishType] ?? '#EEF6EC';
}

export default function ClientHomePage() {
  const navigate = useNavigate();
  const addLine = useCartStore((s) => s.addLine);
  const showToast = useToastStore((s) => s.show);

  const { data } = useQuery({
    queryKey: ['menu'],
    queryFn: async () => (await api.get('/menu')).data,
  });

  const items: any[] = data?.items ?? [];
  const popular = items.slice(0, 4);
  const newest  = items.slice(4, 7);

  const addToCart = (item: any) => {
    // Auto-select first option for each SINGLE group as default
    const optionIds: string[] = [];
    const labels: string[] = [];
    for (const group of (item.modifierGroups ?? [])) {
      if (group.options?.length === 0) continue;
      if (group.type === 'SINGLE') {
        const first = group.options[0];
        optionIds.push(first.id);
        labels.push(`${group.title}: ${first.title}`);
      }
    }
    addLine({
      lineId: crypto.randomUUID(),
      menuItemId: item.id,
      title: item.title,
      basePrice: item.price,
      quantity: 1,
      modifierOptionIds: optionIds.sort(),
      modifiersLabel: labels.join(' | '),
    });
    showToast(`${item.title} добавлен в корзину`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Hero banner ── */}
      <div className="home-hero">
        <div className="home-hero__circle" />
        <div className="home-hero__label">МЕНЮ НЕДЕЛИ</div>
        <div className="home-hero__title">
          −20% на программу<br/>«Детокс»
        </div>
        <button className="home-hero__btn" onClick={() => navigate('/client/menu')}>
          Смотреть →
        </button>
      </div>

      {/* ── Categories ── */}
      <div className="home-categories">
        <div className="home-section-header">
          <h3>Категории</h3>
          <span className="home-section-header__link" onClick={() => navigate('/client/menu')}>Все →</span>
        </div>
        <div className="home-categories__scroll no-sb">
          {CATEGORIES.map((cat, i) => (
            <div
              key={cat.type}
              onClick={() => navigate('/client/menu')}
              className={`home-category-card ${i === 0 ? 'home-category-card--active' : 'home-category-card--inactive'}`}
              style={{ background: cat.c }}
            >
              <div className="home-category-card__emoji">{cat.e}</div>
              <div className="home-category-card__title">{cat.t}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Popular today ── */}
      {popular.length > 0 && (
        <div className="home-popular">
          <div className="home-section-header">
            <h3>Популярное сегодня</h3>
            <span className="home-section-header__link" onClick={() => navigate('/client/menu')}>Все →</span>
          </div>
          <div className="home-popular__scroll no-sb">
            {popular.map((item: any) => (
              <div key={item.id} className="home-popular-card">
                <div className="home-popular-card__image" style={{ background: dishBg(item.dishType) }}>
                  {dishEmoji(item.dishType)}
                </div>
                <div className="home-popular-card__body">
                  <div className="home-popular-card__title">{item.title}</div>
                  <div className="home-popular-card__desc">{item.description}</div>
                  <div className="home-popular-card__footer">
                    <span className="home-popular-card__price">{item.price} ₸</span>
                    <button className="home-popular-card__add-btn" onClick={() => addToCart(item)}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Новинки (list) ── */}
      {newest.length > 0 && (
        <div className="home-newest">
          <h3 className="home-newest__heading">Новинки</h3>
          <div className="home-newest__list">
            {newest.map((item: any) => (
              <div key={item.id} className="home-newest-card">
                <div className="home-newest-card__image" style={{ background: dishBg(item.dishType) }}>
                  {dishEmoji(item.dishType)}
                </div>
                <div className="home-newest-card__info">
                  <div className="home-newest-card__title">{item.title}</div>
                  <div className="home-newest-card__desc">{item.description}</div>
                </div>
                <div className="home-newest-card__right">
                  <span className="home-newest-card__price">{item.price} ₸</span>
                  <button className="home-newest-card__add-btn" onClick={() => addToCart(item)}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
