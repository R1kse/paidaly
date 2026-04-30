import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useCartStore } from '../../store/cart';
import { useToastStore } from '../../store/toast';

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
      <div style={{
        margin: '0 0 20px',
        borderRadius: 20, padding: '20px 22px',
        background: 'linear-gradient(135deg, #3A9E5F, #8BC34A)',
        color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -30, top: -20, width: 140, height: 140, borderRadius: '50%',
          background: 'rgba(255,255,255,.12)',
        }} />
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, opacity: 0.85 }}>МЕНЮ НЕДЕЛИ</div>
        <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 20, fontWeight: 700, marginTop: 6, lineHeight: 1.2 }}>
          −20% на программу<br/>«Детокс»
        </div>
        <button
          onClick={() => navigate('/client/menu')}
          style={{
            marginTop: 12, background: '#fff', color: '#1B3A2D', border: 0,
            borderRadius: 10, padding: '8px 16px', fontWeight: 800, fontSize: 13,
            fontFamily: 'Nunito, sans-serif', cursor: 'pointer',
          }}
        >
          Смотреть →
        </button>
      </div>

      {/* ── Categories ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>Категории</h3>
          <span
            onClick={() => navigate('/client/menu')}
            style={{ fontSize: 13, color: '#3A9E5F', fontWeight: 800, cursor: 'pointer' }}
          >Все →</span>
        </div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}
             className="no-sb">
          {CATEGORIES.map((cat, i) => (
            <div
              key={cat.type}
              onClick={() => navigate('/client/menu')}
              style={{
                minWidth: 80, background: cat.c, borderRadius: 16, padding: '14px 10px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                border: i === 0 ? '2px solid #3A9E5F' : '2px solid transparent',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 28 }}>{cat.e}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#1B3A2D' }}>{cat.t}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Popular today ── */}
      {popular.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 17 }}>Популярное сегодня</h3>
            <span
              onClick={() => navigate('/client/menu')}
              style={{ fontSize: 13, color: '#3A9E5F', fontWeight: 800, cursor: 'pointer' }}
            >Все →</span>
          </div>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }} className="no-sb">
            {popular.map((item: any) => (
              <div key={item.id} style={{
                minWidth: 190, background: '#fff', borderRadius: 20, overflow: 'hidden',
                boxShadow: '0 8px 20px -14px rgba(27,58,45,.22)', flexShrink: 0,
              }}>
                <div style={{
                  height: 130, background: dishBg(item.dishType),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 52, position: 'relative',
                }}>
                  {dishEmoji(item.dishType)}
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.2, color: '#1B3A2D' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: '#6B8F71', marginTop: 2 }}>{item.description}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{item.price} ₸</span>
                    <button
                      onClick={() => addToCart(item)}
                      style={{
                        width: 30, height: 30, borderRadius: 10,
                        background: 'linear-gradient(135deg,#3A9E5F,#8BC34A)',
                        border: 0, color: '#fff', display: 'grid', placeItems: 'center',
                        fontSize: 18, cursor: 'pointer',
                      }}
                    >+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Новинки (list) ── */}
      {newest.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 17 }}>Новинки</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {newest.map((item: any) => (
              <div key={item.id} style={{
                display: 'flex', gap: 12, background: '#fff', borderRadius: 18,
                padding: 12, boxShadow: '0 4px 14px -12px rgba(27,58,45,.2)', alignItems: 'center',
              }}>
                <div style={{
                  width: 70, height: 70, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
                  background: dishBg(item.dishType),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
                }}>
                  {dishEmoji(item.dishType)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#1B3A2D' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: '#6B8F71', marginTop: 2 }}>{item.description}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>{item.price} ₸</span>
                  <button
                    onClick={() => addToCart(item)}
                    style={{
                      width: 30, height: 30, borderRadius: 10,
                      background: 'linear-gradient(135deg,#3A9E5F,#8BC34A)',
                      border: 0, color: '#fff', display: 'grid', placeItems: 'center',
                      fontSize: 18, cursor: 'pointer',
                    }}
                  >+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
