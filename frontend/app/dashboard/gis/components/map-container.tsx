'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IDisaster } from '@/interfaces/IDisaster';

const severityColors: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

function createIcon(severity: string) {
  const color = severityColors[severity] || '#6b7280';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      background-color: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

interface Props {
  disasters: IDisaster[];
  onSelectDisaster?: (disaster: IDisaster) => void;
}

export default function DisasterMap({ disasters, onSelectDisaster }: Props) {
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
      {disasters.map((disaster) => (
        <Marker
          key={disaster.id}
          position={[disaster.latitude, disaster.longitude]}
          icon={createIcon(disaster.severity)}
          eventHandlers={{
            click: () => onSelectDisaster?.(disaster),
          }}
        >
          <Popup>
            <div className="min-w-[200px]">
              <h3 className="font-bold text-sm mb-1">{disaster.title}</h3>
              <p className="text-xs text-gray-600 mb-2">{disaster.location}</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Тип:</span>
                  <span>{disaster.type?.name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Тяжесть:</span>
                  <span style={{ color: severityColors[disaster.severity] }}>
                    {disaster.severity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Статус:</span>
                  <span>{disaster.status}</span>
                </div>
                {disaster.casualties > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Жертвы:</span>
                    <span className="text-red-600 font-medium">{disaster.casualties}</span>
                  </div>
                )}
                {disaster.affectedPeople > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Пострадавшие:</span>
                    <span className="font-medium">{disaster.affectedPeople}</span>
                  </div>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
