'use client';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IGisFeature } from '@/interfaces/IGisFeature';
import { format } from 'date-fns';

export const SEVERITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

export const SEVERITY_LABEL: Record<string, string> = {
  low: 'Низкая',
  medium: 'Средняя',
  high: 'Высокая',
  critical: 'Критическая',
};

export const STATUS_LABEL: Record<string, string> = {
  active: 'Активная',
  resolved: 'Устранена',
  monitoring: 'Мониторинг',
  archived: 'Архив',
};

function createMarkerIcon(severity: string, isSelected: boolean) {
  const color = SEVERITY_COLORS[severity] ?? '#6b7280';
  const size = isSelected ? 32 : 24;
  const border = isSelected ? '3px solid #1d4ed8' : '3px solid white';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background-color:${color};
      border:${border};
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

interface MapClickHandlerProps {
  canWrite: boolean;
  onMapClick: (lat: number, lng: number) => void;
}

function MapClickHandler({ canWrite, onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      if (canWrite) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

interface Props {
  features: IGisFeature[];
  selectedId?: number | null;
  canWrite: boolean;
  onSelectFeature: (feature: IGisFeature) => void;
  onMapClick: (lat: number, lng: number) => void;
}

export default function GisMapContainer({
  features,
  selectedId,
  canWrite,
  onSelectFeature,
  onMapClick,
}: Props) {
  return (
    <MapContainer
      center={[38.56, 68.77]}
      zoom={7}
      style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler canWrite={canWrite} onMapClick={onMapClick} />

      {features.map((feature) => (
        <Marker
          key={feature.id}
          position={[feature.latitude, feature.longitude]}
          icon={createMarkerIcon(feature.severity, feature.id === selectedId)}
          eventHandlers={{ click: () => onSelectFeature(feature) }}
        >
          <Popup>
            <div className="min-w-[180px] space-y-1">
              <p className="font-bold text-sm">{feature.title}</p>
              {feature.description && (
                <p className="text-xs text-gray-500 line-clamp-2">
                  {feature.description}
                </p>
              )}
              <div className="flex gap-1 flex-wrap pt-1">
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium text-white"
                  style={{ backgroundColor: SEVERITY_COLORS[feature.severity] }}
                >
                  {SEVERITY_LABEL[feature.severity]}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                  {STATUS_LABEL[feature.status]}
                </span>
              </div>
              {feature.department && (
                <p className="text-xs text-gray-400">{feature.department.name}</p>
              )}
              <p className="text-xs text-gray-400">
                {format(new Date(feature.createdAt), 'dd.MM.yyyy HH:mm')}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      {canWrite && (
        <div className="leaflet-bottom leaflet-left" style={{ pointerEvents: 'none' }}>
          <div
            className="leaflet-control"
            style={{
              background: 'rgba(255,255,255,0.85)',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 11,
              color: '#374151',
            }}
          >
            Нажмите на карту, чтобы добавить объект
          </div>
        </div>
      )}
    </MapContainer>
  );
}
