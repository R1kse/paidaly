import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useCartStore } from '../../store/cart';
import { useToastStore } from '../../store/toast';
import './client-menu.css';

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
  imageUrl?: string | null;
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
    <div className="menu-layout">

      {/* ── LEFT SIDEBAR (hidden on mobile via .menu-sidebar-desktop) ── */}
      <aside className="menu-sidebar menu-sidebar-desktop">

        {/* Dish types */}
        <div style={{ marginBottom: 20 }}>
          <div className="menu-sidebar__section-label">Тип блюда</div>
          <div
            onClick={() => setActiveDishType('')}
            className={`menu-sidebar__dish-row ${!activeDishType ? 'menu-sidebar__dish-row--active' : 'menu-sidebar__dish-row--inactive'}`}
          >
            <span style={{ fontSize: 15 }}>🍴</span>
            <span style={{ flex: 1 }}>Все</span>
            <span className="menu-sidebar__dish-count">{items.length}</span>
          </div>
          {DISH_TYPES.map((dt) => {
            const count = dishTypeCounts[dt.type] ?? 0;
            if (count === 0) return null;
            const active = activeDishType === dt.type;
            return (
              <div
                key={dt.type}
                onClick={() => setActiveDishType(active ? '' : dt.type)}
                className={`menu-sidebar__dish-row ${active ? 'menu-sidebar__dish-row--active' : 'menu-sidebar__dish-row--inactive'}`}
              >
                <span style={{ fontSize: 15 }}>{dt.emoji}</span>
                <span style={{ flex: 1 }}>{dt.label}</span>
                <span className="menu-sidebar__dish-count">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Calorie filter */}
        <div style={{ marginBottom: 20 }}>
          <div className="menu-sidebar__section-label">Калорийность</div>
          <div className="menu-sidebar__cal-value">до {calFilter} ккал</div>
          <input
            type="range"
            min={0}
            max={calMax}
            step={50}
            value={calFilter}
            onChange={(e) => setCalFilter(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#3A9E5F' }}
          />
          <div className="menu-sidebar__cal-labels">
            <span>0</span><span>{calMax}</span>
          </div>
        </div>

      </aside>

      {/* ── RIGHT: search bar + grid ── */}
      <div className="menu-grid-area">

        {/* Top bar */}
        <div className="menu-topbar">
          {/* Row 1: search + sort + count */}
          <div className="menu-topbar__row1">
            <div className="menu-topbar__search-wrap">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍  Поиск блюда..."
                className="menu-topbar__search"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="menu-topbar__sort"
            >
              <option value="default">Популярные</option>
              <option value="price_asc">Сначала дешевле</option>
              <option value="price_desc">Сначала дороже</option>
              <option value="cal_asc">Меньше калорий</option>
            </select>
            <span className="menu-topbar__count">{filteredItems.length} блюд</span>
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
          <div className="menu-topbar__pills no-sb">
            {allDietTags.map((tag) => {
              const active = activeDietTags.has(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleDietTag(tag)}
                  className={`menu-diet-pill ${active ? 'menu-diet-pill--active' : 'menu-diet-pill--inactive'}`}
                >
                  {active && <span className="menu-diet-pill__check">✓</span>}
                  {DIET_LABELS[tag]}
                </button>
              );
            })}
            {activeDietTags.size > 0 && (
              <button
                onClick={() => setActiveDietTags(new Set())}
                className="menu-diet-pill--reset"
              >
                ✕ Сбросить
              </button>
            )}
          </div>
        </div>

        {/* Card grid */}
        {filteredItems.length === 0 ? (
          <div className="menu-empty">
            <div className="menu-empty__icon">🔍</div>
            <p className="menu-empty__text">Ничего не найдено</p>
          </div>
        ) : (
          <div className="menu-card-grid">
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
  const [showModal, setShowModal] = useState(false);
  const bg = DISH_BG[item.dishType] ?? '#EEF6EC';
  const emoji = DISH_TYPES.find((d) => d.type === item.dishType)?.emoji ?? '🍴';
  const visibleGroups = item.modifierGroups.filter((group) => {
    if (item.dishType === 'SNACK') return false;
    if (group.title === 'Убрать ингредиент' && ['DESSERT', 'DRINK'].includes(item.dishType)) return false;
    return true;
  });
  const hasModifiers = visibleGroups.length > 0;

  const handlePlus = () => {
    if (hasModifiers) setShowModal(true);
    else onAdd(item);
  };

  return (
    <>
      <div className="dish-card-new">
        {/* Image — full, not cropped */}
        <div className="dish-card-new__image-wrap" style={{ background: item.slug ? '#f7f4f0' : bg }}>
          {item.slug ? (
            <img
              src={`${import.meta.env.BASE_URL}dishes/${item.slug}.webp`}
              alt={item.title}
              className="dish-card-new__photo"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
                img.parentElement!.style.background = bg;
              }}
            />
          ) : (
            <span className="dish-card-new__emoji">{emoji}</span>
          )}
        </div>

        {/* Body */}
        <div className="dish-card-new__body">
          <div className="dish-card-new__title">{item.title}</div>

          <div className="dish-card-new__meta">
            {item.calories != null && (
              <span className="dish-card-new__cal">{item.calories} ккал</span>
            )}
            {item.protein != null && (
              <span className="dish-card-new__bju-protein">Б {item.protein}г</span>
            )}
            {item.carbs != null && (
              <span className="dish-card-new__bju-carbs">У {item.carbs}г</span>
            )}
            {item.fat != null && (
              <span className="dish-card-new__bju-fat">Ж {item.fat}г</span>
            )}
          </div>

          <div className="dish-card-new__footer">
            <span className="dish-card-new__price">{item.price} ₸</span>
            <button className="dish-card-new__add-btn" onClick={handlePlus}>+</button>
          </div>
        </div>
      </div>

      {/* Modifier modal */}
      {showModal && (
        <div className="mod-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="mod-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mod-modal__header">
              <span className="mod-modal__title">{item.title}</span>
              <button className="mod-modal__close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="mod-modal__body">
              {visibleGroups.map((group) => {
                const key = `${item.id}:${group.id}`;
                const checked = selected[key] ?? [];
                return (
                  <div key={group.id} className="mod-modal__group">
                    <div className="mod-modal__group-title">{group.title}</div>
                    <div className="mod-modal__options">
                      {group.options.map((option) => {
                        const isChecked = checked.includes(option.id);
                        return (
                          <label
                            key={option.id}
                            className={`mod-modal__pill ${isChecked ? 'mod-modal__pill--active' : ''}`}
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
                              <span className="mod-modal__pill-delta">
                                {option.priceDelta > 0 ? '+' : ''}{option.priceDelta}₸
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mod-modal__footer">
              <button className="mod-modal__now-btn" onClick={() => { onOrderNow(item); setShowModal(false); }}>
                Заказать сразу
              </button>
              <button className="mod-modal__add-btn" onClick={() => { onAdd(item); setShowModal(false); }}>
                В корзину — {item.price} ₸
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
