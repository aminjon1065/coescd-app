import api from '@/lib/axios';
import { IGisFeature, IGisLayer } from '@/interfaces/IGisFeature';
import { ListResponse } from '@/lib/list-response';

export interface GetFeaturesParams {
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
  severity?: string;
  status?: string;
  departmentId?: number;
  layerId?: number;
  bbox?: string; // "minLat,minLng,maxLat,maxLng"
  q?: string;
}

export interface CreateFeaturePayload {
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  geometry?: object;
  severity?: string;
  status?: string;
  properties?: object;
  layerId?: number;
  departmentId?: number;
}

export interface UpdateFeaturePayload extends Partial<CreateFeaturePayload> {}

export const gisApi = {
  // ── Layers ────────────────────────────────────────────────────────────────

  getLayers: () =>
    api.get<IGisLayer[]>('/gis/layers').then((r) => r.data),

  createLayer: (payload: { name: string; type?: string; description?: string }) =>
    api.post<IGisLayer>('/gis/layers', payload).then((r) => r.data),

  updateLayer: (id: number, payload: Partial<{ name: string; type: string; description: string; isActive: boolean }>) =>
    api.patch<IGisLayer>(`/gis/layers/${id}`, payload).then((r) => r.data),

  deleteLayer: (id: number) =>
    api.delete(`/gis/layers/${id}`),

  // ── Features ──────────────────────────────────────────────────────────────

  getFeatures: (params: GetFeaturesParams = {}) =>
    api
      .get<ListResponse<IGisFeature>>('/gis/features', { params })
      .then((r) => r.data),

  getFeature: (id: number) =>
    api.get<IGisFeature>(`/gis/features/${id}`).then((r) => r.data),

  createFeature: (payload: CreateFeaturePayload) =>
    api.post<IGisFeature>('/gis/features', payload).then((r) => r.data),

  updateFeature: (id: number, payload: UpdateFeaturePayload) =>
    api.patch<IGisFeature>(`/gis/features/${id}`, payload).then((r) => r.data),

  deleteFeature: (id: number) =>
    api.delete(`/gis/features/${id}`),
};
