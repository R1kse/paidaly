import { Polyline } from 'react-leaflet';

interface Props {
  coords: [number, number][];
  color?: string;
}

export function RouteLine({ coords, color = '#16a34a' }: Props) {
  if (coords.length < 2) return null;
  return (
    <Polyline
      positions={coords}
      pathOptions={{
        color,
        weight: 4,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }}
    />
  );
}
