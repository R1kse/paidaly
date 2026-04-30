import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useCartStore } from '../../store/cart';
import { useToastStore } from '../../store/toast';

type ModifierOption = { id: string; title: string; priceDelta: number };
type ModifierGroup = {
  id: string;
  title: string;
  type: 'SINGLE' | 'MULTI';
  required: boolean;
  minSelected: number;
  maxSelected: number;
  options: ModifierOption[];
};

type MenuItem = {
  id: string;
  slug?: string | null;
  categoryId: string;
  title: string;
  description?: string | null;
  ingredients?: string | null;
  allergens: string[];
  dietTags: string[];
  dishType: string;
  price: number;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  modifierGroups: ModifierGroup[];
};

type MenuCategory = {
  id: string;
  slug?: string | null;
  title: string;
  description?: string | null;
  sortOrder: number;
};

type MenuResponse = {
  categories: MenuCategory[];
  items: MenuItem[];
};

function makeLineId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `line_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const DISH_TYPES = [
  { type: 'BREAKFAST', label: 'Завтрак',  emoji: '🥣' },
  { type: 'SOUP',      label: 'Суп',       emoji: '🍲' },
  { type: 'MAIN',      label: 'Основное',  emoji: '🍽' },
  { type: 'SALAD',     label: 'Салат',     emoji: '🥗' },
  { type: 'SNACK',     label: 'Перекус',   emoji: '🥜' },
  { type: 'DESSERT',   label: 'Десерт',    emoji: '🍓' },
  { type: 'DRINK',     label: 'Напиток',   emoji: '🥤' },
];

const DIET_LABELS: Record<string, string> = {
  gentle_gi:               'Щадящее ЖКТ',
  gastritis_friendly:      'Гастрит-френдли',
  gerd_friendly:           'ГЭРБ / изжога',
  ibs_low_trigger:         'СРК: low-FODMAP',
  pancreas_light:          'Для поджелудочной',
  low_fat_bile_liver:      'Low-fat / печень',
  constipation_gentle_fiber: 'Запоры: клетчатка',
  recovery_diarrhea:       'После расстройства',
  lactose_free:            'Без лактозы',
  gluten_free:             'Без глютена',
};

const DISH_BG: Record<string, string> = {
  BREAKFAST: '#FFF8EC',
  SOUP:      '#FFF3E0',
  MAIN:      '#EAF7EE',
  SALAD:     '#E8F5E9',
  SNACK:     '#FFF9E6',
  DESSERT:   '#F9EEF5',
  DRINK:     '#EAF0FB',
};

export default function ClientMenuPage() {
  const { data, isLoading } = useQuery<MenuResponse>({
    queryKey: ['menu'],
    queryFn: async () => (await api.get('/menu')).data,
  });
  const addLine   = useCartStore((s) => s.addLine);
  const cartLines = useCartStore((s) => s.lines);
  const cartQty   = cartLines.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = cartLines.reduce((s, l) => s + l.basePrice * l.quantity, 0);
  const navigate  = useNavigate();
  const showToast = useToastStore((s) => s.show);

  // Modifier selections keyed by `itemId:groupId`
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  // Sidebar filters
  const [activeDishType, setActiveDishType]   = useState<string>('');
  const [activeDietTags, setActiveDietTags]   = useState<Set<string>>(new Set());
  const [calRange, setCalRange]               = useState<[number, number]>([0, 800]);

  // Search / sort
  const [search, setSearch] = useState('');
  const [sort, setSort]     = useState<'default' | 'price_asc' | 'price_desc' | 'cal_asc'>('default');

  const categories = data?.categories ?? [];
  const items      = data?.items ?? [];

  // Seed default modifier selections when menu loads
  useEffect(() => {
    if (items.length === 0) return;
    setSelected((prev) => {
      const next = { ...prev };
      for (const item of items) {
        for (const group of item.modifierGroups) {
          const key = `${item.id}:${group.id}`;
          if (next[key] !== undefined) continue;
          if (group.options.length === 0) continue;
          if (group.type === 'SINGLE') {
            next[key] = [group.options[0].id];
          } else {
            const n = group.minSelected > 0 ? group.minSelected : 0;
            next[key] = group.options.slice(0, n).map((o) => o.id);
          }
        }
      }
      return next;
    });
  }, [items]);

  // Derive calorie range from data
  useEffect(() => {
    if (items.length === 0) return;
    const cals = items.map((i) => i.calories ?? 0).filter(Boolean);
    if (cals.length === 0) return;
    const max = Math.ceil(Math.max(...cals) / 50) * 50;
    setCalRange([0, max]);
  }, [items]);

  const [calMax, setCalMax] = useState(800);
  useEffect(() => {
    if (items.length === 0) return;
    const cals = items.map((i) => i.calories ?? 0).filter(Boolean);
    if (cals.length === 0) return;
    setCalMax(Math.ceil(Math.max(...cals) / 50) * 50);
  }, [items]);

  const [calFilter, setCalFilter] = useState<number>(800);
  useEffect(() => { setCalFilter(calMax); }, [calMax]);

  // All diet tags present in dataset
  const allDietTags = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) for (const t of item.dietTags) set.add(t.replace('*', ''));
    return Array.from(set).filter((t) => DIET_LABELS[t]);
  }, [items]);

  // Dish type counts
  const dishTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.dishType] = (counts[item.dishType] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    let list = items;

    if (activeDishType) list = list.filter((i) => i.dishType === activeDishType);

    if (activeDietTags.size > 0) {
      list = list.filter((i) => {
        const tags = i.dietTags.map((t) => t.replace('*', ''));
        return [...activeDietTags].every((t) => tags.includes(t));
      });
    }

    list = list.filter((i) => (i.calories ?? 0) <= calFilter || i.calories == null);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.description ?? '').toLowerCase().includes(q) ||
          (i.ingredients ?? '').toLowerCase().includes(q),
      );
    }

    if (sort === 'price_asc')  list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') list = [...list].sort((a, b) => b.price - a.price);
    if (sort === 'cal_asc')    list = [...list].sort((a, b) => (a.calories ?? 999) - (b.calories ?? 999));

    return list;
  }, [items, activeDishType, activeDietTags, calFilter, search, sort]);

  if (isLoading) return <p style={{ padding: 24 }}>Загрузка меню...</p>;

  const handleSelect = (itemId: string, group: ModifierGroup, optionId: string, checked: boolean) => {
    setSelected((prev) => {
      const key = `${itemId}:${group.id}`;
      const current = prev[key] ?? [];
      const next =
        group.type === 'SINGLE'
          ? checked ? [optionId] : []
          : checked
          ? Array.from(new Set([...current, optionId]))
          : current.filter((id) => id !== optionId);
      return { ...prev, [key]: next };
    });
  };

  const buildSelection = (item: MenuItem) => {
    const optionIds: string[] = [];
    const labels: string[] = [];
    for (const group of item.modifierGroups) {
      const key = `${item.id}:${group.id}`;
      const ids = selected[key] ?? [];
      if (ids.length === 0) continue;
      const titles = ids
        .map((id) => group.options.find((o) => o.id === id)?.title)
        .filter(Boolean) as string[];
      optionIds.push(...ids);
      labels.push(`${group.title}: ${titles.join(', ')}`);
    }
    return { optionIds: optionIds.sort(), label: labels.join(' | ') };
  };

  const handleAdd = (item: MenuItem) => {
    const sel = buildSelection(item);
    addLine({
      lineId: makeLineId(),
      menuItemId: item.id,
      title: item.title,
      basePrice: item.price,
      quantity: 1,
      modifierOptionIds: sel.optionIds,
      modifiersLabel: sel.label,
    });
    showToast(`${item.title} добавлен в корзину`);
  };

  const handleOrderNow = (item: MenuItem) => {
    const sel = buildSelection(item);
    addLine({
      lineId: makeLineId(),
      menuItemId: item.id,
      title: item.title,
      basePrice: item.price,
      quantity: 1,
      modifierOptionIds: sel.optionIds,
      modifiersLabel: sel.label,
    });
    navigate('/client/checkout');
  };

  const toggleDietTag = (tag: string) => {
    setActiveDietTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

      {/* ── LEFT SIDEBAR (hidden on mobile via .menu-sidebar-desktop) ── */}
      <aside className="menu-sidebar-desktop" style={{
        width: 220, flexShrink: 0, position: 'sticky', top: 80,
        background: '#fff', borderRadius: 20, padding: '18px 16px',
        boxShadow: '0 4px 16px -8px rgba(27,58,45,.1)',
        border: '1.5px solid #E3ECE1',
        maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
      }}>

        {/* Dish types */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#6B8F71', marginBottom: 10, textTransform: 'uppercase' }}>
            Тип блюда
          </div>
          <div
            onClick={() => setActiveDishType('')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 10, cursor: 'pointer', marginBottom: 2,
              background: !activeDishType ? '#EEF6EC' : 'transparent',
              fontWeight: !activeDishType ? 800 : 600, fontSize: 13, color: '#1B3A2D',
            }}
          >
            <span style={{ fontSize: 15 }}>🍴</span>
            <span style={{ flex: 1 }}>Все</span>
            <span style={{ fontSize: 11, color: '#6B8F71', fontWeight: 700 }}>{items.length}</span>
          </div>
          {DISH_TYPES.map((dt) => {
            const count = dishTypeCounts[dt.type] ?? 0;
            if (count === 0) return null;
            const active = activeDishType === dt.type;
            return (
              <div
                key={dt.type}
                onClick={() => setActiveDishType(active ? '' : dt.type)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 10, cursor: 'pointer', marginBottom: 2,
                  background: active ? '#EEF6EC' : 'transparent',
                  fontWeight: active ? 800 : 600, fontSize: 13, color: '#1B3A2D',
                }}
              >
                <span style={{ fontSize: 15 }}>{dt.emoji}</span>
                <span style={{ flex: 1 }}>{dt.label}</span>
                <span style={{ fontSize: 11, color: '#6B8F71', fontWeight: 700 }}>{count}</span>
              </div>
            );
          })}
        </div>

        {/* Calorie filter */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#6B8F71', marginBottom: 10, textTransform: 'uppercase' }}>
            Калорийность
          </div>
          <div style={{ fontSize: 12, color: '#1B3A2D', fontWeight: 700, marginBottom: 6 }}>
            до {calFilter} ккал
          </div>
          <input
            type="range"
            min={0}
            max={calMax}
            step={50}
            value={calFilter}
            onChange={(e) => setCalFilter(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#3A9E5F' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6B8F71' }}>
            <span>0</span><span>{calMax}</span>
          </div>
        </div>

      </aside>

      {/* ── RIGHT: search bar + grid ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Top bar */}
        <div style={{ marginBottom: 14 }}>
          {/* Row 1: search + sort + count */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍  Поиск блюда..."
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 12,
                  border: '1.5px solid #E3ECE1', fontSize: 13,
                  fontFamily: 'Nunito, sans-serif', outline: 'none',
                  background: '#fff', color: '#1B3A2D', boxSizing: 'border-box',
                }}
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              style={{
                padding: '10px 14px', borderRadius: 12, border: '1.5px solid #E3ECE1',
                fontSize: 13, fontFamily: 'Nunito, sans-serif', background: '#fff',
                color: '#1B3A2D', fontWeight: 700, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="default">Популярные</option>
              <option value="price_asc">Сначала дешевле</option>
              <option value="price_desc">Сначала дороже</option>
              <option value="cal_asc">Меньше калорий</option>
            </select>
            <span style={{ fontSize: 13, color: '#6B8F71', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {filteredItems.length} блюд
            </span>
          </div>

          {/* Mobile: dish type chips (visible only on ≤768px via CSS) */}
          <div className="mobile-dish-type-row no-sb">
            <button
              onClick={() => setActiveDishType('')}
              className={`mobile-filter-pill${!activeDishType ? ' active' : ''}`}
            >🍴 Все</button>
            {DISH_TYPES.map((dt) => {
              const count = dishTypeCounts[dt.type] ?? 0;
              if (count === 0) return null;
              return (
                <button
                  key={dt.type}
                  onClick={() => setActiveDishType(activeDishType === dt.type ? '' : dt.type)}
                  className={`mobile-filter-pill${activeDishType === dt.type ? ' active' : ''}`}
                >
                  {dt.emoji} {dt.label}
                </button>
              );
            })}
          </div>

          {/* Row 2: diet tag pills */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }} className="no-sb">
            {allDietTags.map((tag) => {
              const active = activeDietTags.has(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleDietTag(tag)}
                  style={{
                    flexShrink: 0,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 999,
                    border: `1.5px solid ${active ? '#3A9E5F' : '#D8EDD8'}`,
                    background: active ? '#3A9E5F' : '#fff',
                    color: active ? '#fff' : '#1B3A2D',
                    fontWeight: 700, fontSize: 12,
                    fontFamily: 'Nunito, sans-serif',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: active ? '0 2px 8px -2px rgba(58,158,95,.4)' : 'none',
                  }}
                >
                  {active && <span style={{ fontSize: 10 }}>✓</span>}
                  {DIET_LABELS[tag]}
                </button>
              );
            })}
            {activeDietTags.size > 0 && (
              <button
                onClick={() => setActiveDietTags(new Set())}
                style={{
                  flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 999,
                  border: '1.5px solid #FBE4E4',
                  background: '#FBE4E4', color: '#C0392B',
                  fontWeight: 700, fontSize: 12,
                  fontFamily: 'Nunito, sans-serif', cursor: 'pointer',
                }}
              >
                ✕ Сбросить
              </button>
            )}
          </div>
        </div>

        {/* Card grid */}
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#6B8F71' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p style={{ fontWeight: 700 }}>Ничего не найдено</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}>
            {filteredItems.map((item) => (
              <DishCard
                key={item.id}
                item={item}
                selected={selected}
                onSelect={handleSelect}
                onAdd={handleAdd}
                onOrderNow={handleOrderNow}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile sticky cart button (visible only on ≤768px via CSS) */}
      {cartQty > 0 && (
        <div className="menu-mobile-cart">
          <button
            className="primary menu-mobile-cart-btn"
            onClick={() => navigate('/client/checkout')}
          >
            🛍 Корзина ({cartQty}) — {cartTotal} ₸
          </button>
        </div>
      )}
    </div>
  );
}

// ── Dish card ──────────────────────────────────────────────
function DishCard({
  item,
  selected,
  onSelect,
  onAdd,
  onOrderNow,
}: {
  item: MenuItem;
  selected: Record<string, string[]>;
  onSelect: (itemId: string, group: ModifierGroup, optId: string, checked: boolean) => void;
  onAdd: (item: MenuItem) => void;
  onOrderNow: (item: MenuItem) => void;
}) {
  const bg = DISH_BG[item.dishType] ?? '#EEF6EC';
  const emoji = DISH_TYPES.find((d) => d.type === item.dishType)?.emoji ?? '🍴';

  return (
    <div style={{
      background: '#fff', borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 6px 20px -12px rgba(27,58,45,.18)',
      border: '1.5px solid #EEF6EC',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Image area */}
      <div style={{
        height: 120, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <span style={{ fontSize: 52, lineHeight: 1 }}>{emoji}</span>
        {item.calories != null && (
          <span style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(27,58,45,.7)', color: '#fff',
            fontSize: 10, fontWeight: 800, padding: '3px 7px',
            borderRadius: 20,
          }}>
            {item.calories} ккал
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '12px 12px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: '#1B3A2D', lineHeight: 1.3 }}>
          {item.title}
        </div>

        {item.ingredients && (
          <div style={{
            fontSize: 11, color: '#6B8F71', lineHeight: 1.4,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {item.ingredients}
          </div>
        )}

        {/* BJU row */}
        {(item.protein != null || item.carbs != null || item.fat != null) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            {item.protein != null && (
              <span style={{ fontSize: 10, fontWeight: 800, color: '#2196F3' }}>
                Б {item.protein}г
              </span>
            )}
            {item.carbs != null && (
              <span style={{ fontSize: 10, fontWeight: 800, color: '#FF9800' }}>
                У {item.carbs}г
              </span>
            )}
            {item.fat != null && (
              <span style={{ fontSize: 10, fontWeight: 800, color: '#E91E63' }}>
                Ж {item.fat}г
              </span>
            )}
          </div>
        )}

        {/* Compact modifier pills */}
        {item.modifierGroups.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
            {item.modifierGroups.map((group) => (
              <div key={group.id}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#6B8F71', marginBottom: 3 }}>
                  {group.title}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {group.options.map((option) => {
                    const key = `${item.id}:${group.id}`;
                    const isChecked = (selected[key] ?? []).includes(option.id);
                    return (
                      <label
                        key={option.id}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          padding: '3px 8px', borderRadius: 20, cursor: 'pointer',
                          fontSize: 10, fontWeight: 700, userSelect: 'none',
                          background: isChecked ? '#3A9E5F' : '#EEF6EC',
                          color: isChecked ? '#fff' : '#1B3A2D',
                          border: `1.5px solid ${isChecked ? '#3A9E5F' : '#D8EDD8'}`,
                          transition: 'all 0.12s',
                        }}
                      >
                        <input
                          type={group.type === 'SINGLE' ? 'radio' : 'checkbox'}
                          name={`${item.id}:${group.id}`}
                          checked={isChecked}
                          onChange={(e) => onSelect(item.id, group, option.id, e.target.checked)}
                          style={{ display: 'none' }}
                        />
                        {option.title}
                        {option.priceDelta !== 0 && (
                          <span style={{ opacity: 0.8 }}>
                            {option.priceDelta > 0 ? '+' : ''}{option.priceDelta}₸
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Price + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#1B3A2D' }}>{item.price} ₸</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => onOrderNow(item)}
              style={{
                padding: '6px 10px', borderRadius: 10,
                background: '#EEF6EC', border: 'none',
                fontWeight: 800, fontSize: 11, color: '#3A9E5F',
                fontFamily: 'Nunito, sans-serif', cursor: 'pointer',
              }}
            >
              Сразу
            </button>
            <button
              onClick={() => onAdd(item)}
              style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'linear-gradient(135deg, #3A9E5F, #8BC34A)',
                border: 'none', color: '#fff',
                fontSize: 20, cursor: 'pointer',
                display: 'grid', placeItems: 'center',
                fontFamily: 'Nunito, sans-serif',
              }}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
