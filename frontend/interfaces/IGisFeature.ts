import { IDepartment } from './IDepartment';

export type GisLayerType = 'incident' | 'zone' | 'resource' | 'route' | 'checkpoint';
export type GisFeatureSeverity = 'low' | 'medium' | 'high' | 'critical';
export type GisFeatureStatus = 'active' | 'resolved' | 'monitoring' | 'archived';

export interface IGisLayer {
  id: number;
  name: string;
  type: GisLayerType;
  description: string | null;
  department: IDepartment | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IGisFeature {
  id: number;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  geometry: object | null;
  severity: GisFeatureSeverity;
  status: GisFeatureStatus;
  properties: object | null;
  layer: IGisLayer | null;
  department: IDepartment | null;
  createdBy: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}
