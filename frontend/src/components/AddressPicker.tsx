import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAddressStore, SavedAddress } from '../store/address';
import './address-picker.css';

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

const ALMATY_VIEWBOX = '76.65,43.10,77.25,43.55';

async function searchAlmaty(q: string): Promise<NominatimResult[]> {
  if (q.length < 2) return [];
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('countrycodes', 'kz');
  url.searchParams.set('viewbox', ALMATY_VIEWBOX);
  url.searchParams.set('bounded', '1');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '7');
  url.searchParams.set('addressdetails', '0');
  const res = await fetch(url.toString(), {
    headers: { 'Accept-Language': 'ru', 'User-Agent': 'paidaly-app/1.0' },
  });
  return res.json();
}

function shortName(full: string): string {
  // Drop last 2 parts (country, postcode) that Nominatim always appends
  const parts = full.split(', ');
  return parts.slice(0, Math.min(4, parts.length - 2)).join(', ') || parts[0];
}

export default function AddressPicker() {
  const [open, setOpen]       = useState(false);
  const [adding, setAdding]   = useState(false);
  const [label, setLabel]     = useState('');
  const [query, setQuery]     = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [searching, setSearching]     = useState(false);
  const [selected, setSelected]       = useState<NominatimResult | null>(null);
  const [showSugg, setShowSugg]       = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const active    = useAddressStore((s) => s.active);
  const setActive = useAddressStore((s) => s.setActive);
  const qc = useQueryClient();

  const { data: addresses = [] } = useQuery<SavedAddress[]>({
    queryKey: ['addresses'],
    queryFn: async () => (await api.get('/profile/addresses')).data,
  });

  useEffect(() => {
    if (!active && addresses.length > 0) setActive(addresses[0]);
  }, [addresses]);

  // Debounced search — only runs when no item is already selected
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (selected || query.length < 2) {
      setSuggestions([]);
      setShowSugg(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchAlmaty(query);
        setSuggestions(results);
        setShowSugg(results.length > 0);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, selected]);

  const addMutation = useMutation({
    mutationFn: (body: { label: string; addressText: string; lat: number; lng: number }) =>
      api.post('/profile/addresses', body),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['addresses'] });
      setActive(res.data);
      closeAndReset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/profile/addresses/${id}`),
    onSuccess: async (_res, id) => {
      if (active?.id === id) setActive(null);
      await qc.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const closeAndReset = () => {
    setOpen(false);
    setAdding(false);
    setLabel('');
    setQuery('');
    setSuggestions([]);
    setShowSugg(false);
    setSelected(null);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeAndReset();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pickSuggestion = (s: NominatimResult) => {
    setSelected(s);
    setQuery(shortName(s.display_name));
    setShowSugg(false);
    setSuggestions([]);
  };

  const handleSave = () => {
    if (!label.trim() || !selected) return;
    addMutation.mutate({
      label: label.trim(),
      addressText: shortName(selected.display_name),
      lat: parseFloat(selected.lat),
      lng: parseFloat(selected.lon),
    });
  };

  return (
    <div ref={containerRef} className="addr-wrap">

      {/* ── Pill ── */}
      <div onClick={() => setOpen((v) => !v)} className="addr-pill">
        <span className="addr-pill__icon">📍</span>
        <span className="addr-pill__text">
          {active ? active.addressText : 'Добавить адрес'}
        </span>
        <span className="addr-pill__arrow">▾</span>
      </div>

      {/* ── Dropdown ── */}
      {open && (
        <div className="addr-dropdown">

          {/* Saved list */}
          {addresses.length > 0 && (
            <div className="addr-dropdown__list">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`addr-dropdown__item ${active?.id === addr.id ? 'addr-dropdown__item--active' : ''}`}
                >
                  {/* Select */}
                  <div
                    onClick={() => { setActive(addr); setOpen(false); }}
                    className="addr-dropdown__item-select"
                  >
                    <div className={`addr-dropdown__item-icon ${active?.id === addr.id ? 'addr-dropdown__item-icon--active' : 'addr-dropdown__item-icon--inactive'}`}>
                      📍
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="addr-dropdown__item-label">{addr.label}</div>
                      <div className="addr-dropdown__item-addr">{addr.addressText}</div>
                    </div>
                  </div>

                  {/* Active check */}
                  {active?.id === addr.id && (
                    <span className="addr-dropdown__item-check">✓</span>
                  )}

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(addr.id); }}
                    disabled={deleteMutation.isPending}
                    title="Удалить"
                    className="addr-dropdown__delete-btn"
                    style={{ opacity: deleteMutation.isPending ? 0.5 : 1 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="addr-dropdown__divider" />
            </div>
          )}

          {/* Add form / add button */}
          {adding ? (
            <div className="addr-form">
              <div className="addr-form__title">Новый адрес</div>

              <input
                autoFocus
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Название (Дом, Работа…)"
                className="addr-form__input"
              />

              {/* Search with suggestions */}
              <div className="addr-search-wrap">
                <div className="addr-search-inner">
                  <input
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                    onFocus={() => { if (suggestions.length > 0) setShowSugg(true); }}
                    placeholder="Начните вводить улицу…"
                    className={`addr-form__input ${selected ? 'addr-form__input--selected' : ''}`}
                    style={{ paddingRight: 32 }}
                  />
                  {searching && (
                    <span className="addr-search-loader">⏳</span>
                  )}
                  {selected && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setSelected(null); setQuery(''); }}
                      className="addr-search-clear"
                    >✕</button>
                  )}
                </div>

                {/* Suggestions list */}
                {showSugg && suggestions.length > 0 && (
                  <div className="addr-suggestions">
                    {suggestions.map((s) => (
                      <div
                        key={s.place_id}
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); pickSuggestion(s); }}
                        className="addr-suggestion-item"
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#EEF6EC')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                      >
                        <span style={{ marginRight: 6 }}>📍</span>
                        {shortName(s.display_name)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected badge */}
              {selected && (
                <div className="addr-selected-badge">
                  ✓ {shortName(selected.display_name)}
                </div>
              )}

              <div className="addr-form__buttons">
                <button
                  onClick={() => { setAdding(false); setLabel(''); setQuery(''); setSelected(null); setSuggestions([]); setShowSugg(false); }}
                  className="addr-form__cancel-btn"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={addMutation.isPending || !label.trim() || !selected}
                  className="addr-form__save-btn"
                >
                  {addMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
                </button>
              </div>
            </div>
          ) : (
            <div onClick={() => setAdding(true)} className="addr-add-row">
              <div className="addr-add-row__icon">＋</div>
              <span className="addr-add-row__label">Добавить адрес</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
