import L from 'leaflet';

function divIcon(svg: string, size: number) {
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

// Ресторан — зелёный круг с домиком
export const restaurantIcon = divIcon(
  `<svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#00000030"/>
    </filter>
    <g filter="url(#s)">
      <path d="M18 2C10.268 2 4 8.268 4 16c0 10 14 26 14 26S32 26 32 16C32 8.268 25.732 2 18 2Z" fill="#16a34a"/>
      <path d="M18 2C10.268 2 4 8.268 4 16c0 10 14 26 14 26S32 26 32 16C32 8.268 25.732 2 18 2Z" fill="url(#g1)"/>
    </g>
    <defs>
      <linearGradient id="g1" x1="18" y1="2" x2="18" y2="42" gradientUnits="userSpaceOnUse">
        <stop stop-color="#22c55e"/>
        <stop offset="1" stop-color="#15803d"/>
      </linearGradient>
    </defs>
    <circle cx="18" cy="16" r="8" fill="white" opacity=".95"/>
    <text x="18" y="20" text-anchor="middle" font-size="10" fill="#15803d">🏠</text>
  </svg>`,
  36,
);

// Адрес клиента — тёмный пин
export const addressIcon = divIcon(
  `<svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <filter id="s2" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#00000030"/>
    </filter>
    <g filter="url(#s2)">
      <path d="M16 2C9.373 2 4 7.373 4 14c0 8.75 12 24 12 24S28 22.75 28 14C28 7.373 22.627 2 16 2Z" fill="#111110"/>
    </g>
    <circle cx="16" cy="14" r="6" fill="white" opacity=".95"/>
    <circle cx="16" cy="14" r="3" fill="#111110"/>
  </svg>`,
  32,
);

// Курьер — зелёный пульсирующий круг
export const courierIcon = divIcon(
  `<div style="
    width:20px;height:20px;
    background:#16a34a;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 0 0 4px rgba(22,163,74,.25), 0 2px 8px rgba(0,0,0,.2);
    animation:pulse 2s infinite;
  "></div>
  <style>
    @keyframes pulse {
      0%   { box-shadow: 0 0 0 0 rgba(22,163,74,.5), 0 2px 8px rgba(0,0,0,.2); }
      70%  { box-shadow: 0 0 0 10px rgba(22,163,74,0), 0 2px 8px rgba(0,0,0,.2); }
      100% { box-shadow: 0 0 0 0 rgba(22,163,74,0), 0 2px 8px rgba(0,0,0,.2); }
    }
  </style>`,
  20,
);
