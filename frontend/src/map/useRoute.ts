import { useEffect, useRef, useState } from 'react';

export type RouteResult = {
  coords: [number, number][];   // [lat, lng][] для Leaflet
  distanceKm: number;
  durationMin: number;
};

// ─── Traffic model ─────────────────────────────────────────────────────────────
//
// Congestion scores for Almaty (weekdays):
//   08:00–11:00  → 7/10  morning rush
//   12:00–16:00  → 5/10  midday
//   17:00–20:30  → 8/10  evening rush
//   21:00–23:00  → 3/10  night
//   23:00–07:00  → 1/10  late night
//   gaps         → 3/10  (07–08, 11–12, 16–17, 20:30–21)
//
// Weekends: all scores ×0.6 (40% less congestion)
// Multiplier formula: 1 + score × 0.15  →  score 1 = ×1.15, score 8 = ×2.2

function getTrafficScore(date: Date): number {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const min = date.getHours() * 60 + date.getMinutes();

  let score: number;
  if      (min >= 8*60       && min < 11*60)      score = 7;  // 08–11
  else if (min >= 12*60      && min < 16*60)       score = 5;  // 12–16
  else if (min >= 17*60      && min < 20*60 + 30)  score = 8;  // 17–20:30
  else if (min >= 21*60      && min < 23*60)        score = 3;  // 21–23
  else if (min >= 23*60      || min <  7*60)        score = 1;  // 23–07
  else                                              score = 3;  // gaps

  return isWeekend ? score * 0.6 : score;
}

function scoreToMultiplier(score: number): number {
  return 1 + score * 0.15;
}

/** Returns the current traffic-based time multiplier (≥1.0). */
export function getTrafficMultiplier(date = new Date()): number {
  return scoreToMultiplier(getTrafficScore(date));
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Получает маршрут по дорогам через OSRM и применяет коэффициент пробок.
 * Обновляется не чаще чем раз в 15 секунд чтобы не спамить сервис.
 */
export function useRoute(
  from: [number, number] | null,
  to: [number, number] | null,
): RouteResult | null {
  const [result, setResult] = useState<RouteResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    if (!from || !to) { setResult(null); return; }

    const now = Date.now();
    const delay = Math.max(0, 15_000 - (now - lastFetchRef.current));

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        // OSRM ожидает координаты в формате lng,lat
        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${from[1]},${from[0]};${to[1]},${to[0]}` +
          `?overview=full&geometries=geojson`;

        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const route = data.routes?.[0];
        if (!route) return;

        // OSRM возвращает [lng, lat] — переворачиваем в [lat, lng] для Leaflet
        const coords: [number, number][] = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng],
        );

        // Применяем коэффициент пробок по текущему времени
        const multiplier = getTrafficMultiplier();
        const rawMin = route.duration / 60;

        setResult({
          coords,
          distanceKm: Math.round((route.distance / 1000) * 10) / 10,
          durationMin: Math.ceil(rawMin * multiplier),
        });
        lastFetchRef.current = Date.now();
      } catch {
        // сеть недоступна — оставляем прошлый результат
      }
    }, delay);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [from?.[0], from?.[1], to?.[0], to?.[1]]); // eslint-disable-line

  return result;
}

export function formatEta(durationMin: number): string {
  if (durationMin < 1) return '< 1 мин';
  if (durationMin < 60) return `~${durationMin} мин`;
  const h = Math.floor(durationMin / 60);
  const m = durationMin % 60;
  return m > 0 ? `~${h} ч ${m} мин` : `~${h} ч`;
}
