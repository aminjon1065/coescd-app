'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapStore } from '@/lib/stores/map-store';
import type { GeoFeatureCollection, IIncidentDensityPoint, IMapLayer } from '@/interfaces/IAnalytics';

// Severity → color
const SEVERITY_COLOR = ['#22c55e', '#84cc16', '#f59e0b', '#ef4444', '#7f1d1d'];
const RISK_TYPE_COLOR: Record<string, string> = {
  flood: '#3b82f6', earthquake: '#a855f7', landslide: '#f97316', wildfire: '#ef4444', avalanche: '#06b6d4',
};

interface MapInnerProps {
  incidents?: GeoFeatureCollection;
  riskZones?: GeoFeatureCollection;
  infrastructure?: GeoFeatureCollection;
  heatmapData?: IIncidentDensityPoint[];
  layers: IMapLayer[];
}

export default function MapInner({ incidents, riskZones, infrastructure, layers }: MapInnerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const incidentLayerRef = useRef<L.LayerGroup | null>(null);
  const riskZoneLayerRef = useRef<L.LayerGroup | null>(null);
  const infraLayerRef = useRef<L.LayerGroup | null>(null);
  const { viewState, selectFeature } = useMapStore();

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: [viewState.latitude, viewState.longitude],
      zoom: viewState.zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(mapRef.current);

    incidentLayerRef.current = L.layerGroup().addTo(mapRef.current);
    riskZoneLayerRef.current = L.layerGroup().addTo(mapRef.current);
    infraLayerRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update incidents layer
  useEffect(() => {
    if (!incidentLayerRef.current) return;
    incidentLayerRef.current.clearLayers();

    const layer = layers.find(l => l.id === 'active-incidents');
    if (!layer?.visible || !incidents?.features) return;

    incidents.features.forEach(f => {
      if (!f.geometry || f.geometry.type !== 'Point') return;
      const [lon, lat] = f.geometry.coordinates;
      const severity = (f.properties.severity as number) ?? 1;
      const color = SEVERITY_COLOR[Math.min(severity - 1, 4)];

      const marker = L.circleMarker([lat, lon], {
        radius: 6 + severity,
        fillColor: color,
        color: 'white',
        weight: 1.5,
        fillOpacity: layer.opacity,
      });

      marker.bindPopup(`
        <div class="text-sm">
          <p class="font-semibold mb-1">${f.properties.typeName ?? 'ЧС'}</p>
          <p>Степень: <b>${severity}/5</b></p>
          <p>Пострадавших: <b>${f.properties.affectedCount ?? 0}</b></p>
          <p>Район: ${f.properties.geoCode ?? '—'}</p>
        </div>
      `);

      marker.on('click', () => selectFeature(f as any));
      incidentLayerRef.current!.addLayer(marker);
    });
  }, [incidents, layers]);

  // Update risk zones layer
  useEffect(() => {
    if (!riskZoneLayerRef.current) return;
    riskZoneLayerRef.current.clearLayers();

    const layer = layers.find(l => l.id === 'risk-zones');
    if (!layer?.visible || !riskZones?.features) return;

    L.geoJSON(riskZones as any, {
      style: (f) => {
        const riskType = (f?.properties?.riskType as string) ?? 'flood';
        return {
          fillColor: RISK_TYPE_COLOR[riskType] ?? '#94a3b8',
          fillOpacity: layer.opacity * 0.4,
          color: RISK_TYPE_COLOR[riskType] ?? '#94a3b8',
          weight: 1.5,
        };
      },
      onEachFeature: (f, l) => {
        l.bindPopup(`
          <div class="text-sm">
            <p class="font-semibold">${f.properties?.name}</p>
            <p>Тип: ${f.properties?.riskType} · Степень: ${f.properties?.severity}/5</p>
            ${f.properties?.populationAtRisk ? `<p>Под угрозой: ${f.properties.populationAtRisk.toLocaleString('ru')} чел.</p>` : ''}
          </div>
        `);
      },
    }).addTo(riskZoneLayerRef.current);
  }, [riskZones, layers]);

  // Update infrastructure layer
  useEffect(() => {
    if (!infraLayerRef.current) return;
    infraLayerRef.current.clearLayers();

    const layer = layers.find(l => l.id === 'infrastructure');
    if (!layer?.visible || !infrastructure?.features) return;

    infrastructure.features.forEach(f => {
      if (!f.geometry || f.geometry.type !== 'Point') return;
      const [lon, lat] = f.geometry.coordinates;

      const marker = L.circleMarker([lat, lon], {
        radius: 6,
        fillColor: f.properties.status === 'operational' ? '#3b82f6' : '#94a3b8',
        color: 'white',
        weight: 1.5,
        fillOpacity: 0.9,
      });

      marker.bindTooltip(String(f.properties.name), { permanent: false });
      marker.bindPopup(`
        <div class="text-sm">
          <p class="font-semibold">${f.properties.name}</p>
          <p>${f.properties.infraType} · ${f.properties.status}</p>
          ${f.properties.capacity ? `<p>Вместимость: ${f.properties.capacity}</p>` : ''}
        </div>
      `);

      infraLayerRef.current!.addLayer(marker);
    });
  }, [infrastructure, layers]);

  return <div ref={containerRef} className="w-full h-full" />;
}
