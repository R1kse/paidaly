import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAddressStore, SavedAddress } from '../store/address';

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

// Almaty bounding box: west, south, east, north
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

  const inp: React.CSSProperties = {
    padding: '9px 12px', borderRadius: 10, border: '1.5px solid #E3ECE1',
    fontSize: 13, fontFamily: 'Nunito, sans-serif', outline: 'none',
    color: '#1B3A2D', width: '100%', boxSizing: 'border-box', background: '#fff',
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>

      {/* ── Pill ── */}
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 999,
          border: '1.5px solid #E3ECE1', background: '#F7FAF5',
          fontSize: 13, fontWeight: 700,
          color: active ? '#1B3A2D' : '#3A9E5F',
          cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
          maxWidth: 220,
        }}
      >
        <span style={{ color: '#3A9E5F', fontSize: 14, flexShrink: 0 }}>📍</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {active ? active.addressText : 'Добавить адрес'}
        </span>
        <span style={{ fontSize: 10, color: '#6B8F71', flexShrink: 0 }}>▾</span>
      </div>

      {/* ── Dropdown ── */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0,
          width: 320, background: '#fff', borderRadius: 18,
          boxShadow: '0 12px 32px -8px rgba(27,58,45,0.18)',
          border: '1.5px solid #E3ECE1', zIndex: 300,
        }}>

          {/* Saved list */}
          {addresses.length > 0 && (
            <div style={{ padding: '8px 0' }}>
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px',
                    background: active?.id === addr.id ? '#EEF6EC' : 'transparent',
                  }}
                >
                  {/* Select */}
                  <div
                    onClick={() => { setActive(addr); setOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: 'pointer' }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: active?.id === addr.id ? '#3A9E5F' : '#EEF6EC',
                      display: 'grid', placeItems: 'center', fontSize: 14,
                    }}>📍</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: '#1B3A2D' }}>
                        {addr.label}
                      </div>
                      <div style={{
                        fontSize: 11, color: '#6B8F71',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {addr.addressText}
                      </div>
                    </div>
                  </div>

                  {/* Active check */}
                  {active?.id === addr.id && (
                    <span style={{ color: '#3A9E5F', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>✓</span>
                  )}

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(addr.id); }}
                    disabled={deleteMutation.isPending}
                    title="Удалить"
                    style={{
                      width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                      background: '#FBE4E4', border: 'none',
                      display: 'grid', placeItems: 'center',
                      cursor: 'pointer', fontSize: 13, color: '#C0392B',
                      opacity: deleteMutation.isPending ? 0.5 : 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div style={{ height: 1, background: '#EEF6EC', margin: '4px 0' }} />
            </div>
          )}

          {/* Add form / add button */}
          {adding ? (
            <div style={{ padding: '14px 16px', display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#1B3A2D' }}>Новый адрес</div>

              <input
                autoFocus
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Название (Дом, Работа…)"
                style={inp}
              />

              {/* Search with suggestions */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                    onFocus={() => { if (suggestions.length > 0) setShowSugg(true); }}
                    placeholder="Начните вводить улицу…"
                    style={{ ...inp, borderColor: selected ? '#3A9E5F' : '#E3ECE1', paddingRight: 32 }}
                  />
                  {searching && (
                    <span style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 11, color: '#6B8F71', pointerEvents: 'none',
                    }}>⏳</span>
                  )}
                  {selected && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setSelected(null); setQuery(''); }}
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#6B8F71', fontSize: 14, padding: 2,
                      }}
                    >✕</button>
                  )}
                </div>

                {/* Suggestions list */}
                {showSugg && suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: '#fff', borderRadius: 12,
                    border: '1.5px solid #E3ECE1',
                    boxShadow: '0 8px 20px -8px rgba(27,58,45,0.15)',
                    zIndex: 500, maxHeight: 220, overflowY: 'auto',
                  }}>
                    {suggestions.map((s) => (
                      <div
                        key={s.place_id}
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); pickSuggestion(s); }}
                        style={{
                          padding: '9px 12px', cursor: 'pointer', fontSize: 12,
                          color: '#1B3A2D', lineHeight: 1.4,
                          borderBottom: '1px solid #F0F6EE',
                        }}
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
                <div style={{
                  fontSize: 11, color: '#3A9E5F', fontWeight: 700,
                  padding: '6px 10px', background: '#EEF6EC', borderRadius: 8,
                }}>
                  ✓ {shortName(selected.display_name)}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setAdding(false); setLabel(''); setQuery(''); setSelected(null); setSuggestions([]); setShowSugg(false); }}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 10,
                    background: '#EEF6EC', border: 'none',
                    fontWeight: 800, fontSize: 12, color: '#6B8F71',
                    fontFamily: 'Nunito, sans-serif', cursor: 'pointer',
                  }}
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={addMutation.isPending || !label.trim() || !selected}
                  style={{
                    flex: 2, padding: '8px 0', borderRadius: 10,
                    background: 'linear-gradient(135deg, #3A9E5F, #8BC34A)', border: 'none',
                    fontWeight: 800, fontSize: 12, color: '#fff',
                    fontFamily: 'Nunito, sans-serif', cursor: 'pointer',
                    opacity: (!label.trim() || !selected || addMutation.isPending) ? 0.45 : 1,
                  }}
                >
                  {addMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setAdding(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', cursor: 'pointer',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 8, background: '#EEF6EC',
                display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0,
              }}>＋</div>
              <span style={{ fontWeight: 800, fontSize: 13, color: '#3A9E5F' }}>
                Добавить адрес
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
