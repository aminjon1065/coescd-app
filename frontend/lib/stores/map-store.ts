import { create } from 'zustand';
import type { IMapLayer } from '@/interfaces/IAnalytics';

const DEFAULT_LAYERS: IMapLayer[] = [
  { id: 'admin-boundaries', name: 'Границы районов', type: 'boundary', source: 'tile', tileUrl: '/api/analytics/geo/tiles/boundaries/{z}/{x}/{y}.mvt', visible: true, opacity: 0.6 },
  { id: 'risk-zones', name: 'Зоны риска', type: 'risk_zone', source: 'api', endpoint: '/api/analytics/geo/risk-zones', visible: true, opacity: 0.5 },
  { id: 'active-incidents', name: 'Активные ЧС', type: 'incident', source: 'api', endpoint: '/api/analytics/geo/incidents/active', visible: true, opacity: 1 },
  { id: 'heatmap', name: 'Тепловая карта ЧС', type: 'heatmap', source: 'api', endpoint: '/api/analytics/geo/incidents/density', visible: false, opacity: 0.7 },
  { id: 'infrastructure', name: 'Инфраструктура', type: 'infrastructure', source: 'api', endpoint: '/api/analytics/geo/infrastructure', visible: true, opacity: 1 },
];

interface GeoFeature {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  geometry: any;
}

interface ViewState {
  latitude: number;
  longitude: number;
  zoom: number;
}

interface MapStore {
  layers: IMapLayer[];
  selectedFeature: GeoFeature | null;
  playbackTime: Date | null;
  playbackPlaying: boolean;
  viewState: ViewState;

  toggleLayer: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  selectFeature: (f: GeoFeature | null) => void;
  setPlaybackTime: (t: Date | null) => void;
  setPlaybackPlaying: (playing: boolean) => void;
  setViewState: (vs: Partial<ViewState>) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  layers: DEFAULT_LAYERS,
  selectedFeature: null,
  playbackTime: null,
  playbackPlaying: false,
  viewState: { latitude: 41.2, longitude: 74.6, zoom: 6 },

  toggleLayer: (id) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    })),

  setLayerOpacity: (id, opacity) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, opacity } : l)),
    })),

  selectFeature: (f) => set({ selectedFeature: f }),
  setPlaybackTime: (t) => set({ playbackTime: t }),
  setPlaybackPlaying: (playing) => set({ playbackPlaying: playing }),
  setViewState: (vs) => set((s) => ({ viewState: { ...s.viewState, ...vs } })),
}));
