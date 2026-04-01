// ─── KPI ──────────────────────────────────────────────────────────────────────

export interface IKpiDefinition {
  code: string;
  nameRu: string;
  description?: string;
  formula: string;
  unit: string;
  thresholds: { warning: number; critical: number; direction: 'up_bad' | 'down_bad' };
  scopeLevels: string[];
  refreshCron: string;
  isActive: boolean;
}

export type KpiThresholdStatus = 'normal' | 'warning' | 'critical';

export interface IKpiValue {
  code: string;
  nameRu: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  vsPrevPct: number | null;
  thresholdStatus: KpiThresholdStatus;
  capturedAt: string;
}

export interface IKpiSnapshot {
  id: string;
  capturedAt: string;
  kpiCode: string;
  scopeType: string;
  scopeValue: string | null;
  value: number;
  unit: string;
  trend: string;
  vsPrevPct: number | null;
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export interface IIncident {
  id: string;
  occurredAt: string;
  geoCode: string;
  severity: number;
  affectedCount: number;
  fatalities: number;
  injuries: number;
  economicLossUsd: number | null;
  responseTimeMin: number | null;
  resolutionTimeMin: number | null;
  typeName: string;
  category: string;
  location?: GeoPoint | null;
}

export interface IIncidentTrendPoint {
  bucket: string;
  count: number;
  avgSeverity: number;
  totalAffected: number;
  totalFatalities: number;
  avgResponseMin: number;
}

export interface IIncidentDensityPoint {
  lon: number;
  lat: number;
  count: number;
  avgSeverity: number;
  totalAffected: number;
}

export interface IIncidentListResponse {
  data: IIncident[];
  total: number;
  page: number;
  limit: number;
}

// ─── GEO ──────────────────────────────────────────────────────────────────────

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export type GeoFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: any;
    properties: Record<string, unknown>;
  }>;
};

export interface IRiskZone {
  id: string;
  name: string;
  riskType: string;
  severity: number;
  populationAtRisk: number | null;
  geometry: any;
  properties: Record<string, unknown>;
}

export interface IInfrastructure {
  id: string;
  name: string;
  infraType: string;
  status: string;
  capacity: number | null;
  location: GeoPoint;
  properties: Record<string, unknown>;
}

export interface IPlaybackFrame {
  bucket: string;
  geoCode: string;
  count: number;
  avgSeverity: number;
  points: GeoPoint[];
}

// ─── Map Layer ────────────────────────────────────────────────────────────────

export interface IMapLayer {
  id: string;
  name: string;
  type: 'incident' | 'risk_zone' | 'infrastructure' | 'boundary' | 'weather' | 'heatmap';
  source: 'api' | 'tile';
  endpoint?: string;
  tileUrl?: string;
  timeEnabled?: boolean;
  visible: boolean;
  opacity: number;
  color?: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type WidgetType = 'kpi' | 'chart' | 'map' | 'table' | 'text';

export interface IWidget {
  id: string;
  type: WidgetType;
  title: string;
  config: Record<string, unknown>;
  layout: { x: number; y: number; w: number; h: number };
  refreshInterval?: number;
}

export interface IDashboard {
  id: string;
  ownerId: number;
  title: string;
  layout: { widgets: IWidget[] };
  filters: Record<string, unknown>;
  isPublic: boolean;
  isDefault: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Dataset ──────────────────────────────────────────────────────────────────

export interface IDataset {
  id: string;
  name: string;
  description: string | null;
  sourceType: string;
  schemaDef: Record<string, { type: string; nullable: boolean; description?: string }> | null;
  ownerId: number;
  isPublic: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Report ───────────────────────────────────────────────────────────────────

export interface IReport {
  id: string;
  title: string;
  template: string;
  params: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  fileKey: string | null;
  ownerId: number;
  requestedAt: string;
  completedAt: string | null;
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export interface IPipelineRun {
  id: string;
  sourceId: string | null;
  queueName: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'partial';
  recordsIn: number | null;
  recordsOut: number | null;
  recordsErr: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  triggeredBy: string;
}

// ─── Explorer ─────────────────────────────────────────────────────────────────

export interface IExplorerResult {
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
}

export interface IQueryBuilderConfig {
  table: string;
  columns?: string[];
  filters?: Array<{ column: string; op: string; value: unknown }>;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
  limit?: number;
}
