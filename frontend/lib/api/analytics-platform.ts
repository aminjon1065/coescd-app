import api from '@/lib/axios';
import type {
  IKpiDefinition, IKpiValue, IKpiSnapshot,
  IIncidentTrendPoint, IIncidentDensityPoint, IIncidentListResponse,
  GeoFeatureCollection, IPlaybackFrame,
  IDashboard, IDataset, IReport, IPipelineRun, IExplorerResult, IQueryBuilderConfig,
} from '@/interfaces/IAnalytics';

const BASE = '/analytics';

// ─── KPI ──────────────────────────────────────────────────────────────────────
export const listKpiDefinitions = (): Promise<IKpiDefinition[]> =>
  api.get(`${BASE}/kpi`).then(r => r.data);

export const getKpiDefinitions = listKpiDefinitions;

export const getAllKpiValues = (scopeType?: string, scopeValue?: string): Promise<IKpiValue[]> =>
  api.get(`${BASE}/kpi/all/values`, { params: { scope_type: scopeType, scope_value: scopeValue } }).then(r => r.data);

export const getKpiValue = (code: string, scopeType?: string, scopeValue?: string): Promise<IKpiValue> =>
  api.get(`${BASE}/kpi/${code}/value`, { params: { scope_type: scopeType, scope_value: scopeValue } }).then(r => r.data);

export const getKpiHistory = (code: string, opts?: { from?: string; to?: string; scopeType?: string; scopeValue?: string }): Promise<IKpiSnapshot[]> =>
  api.get(`${BASE}/kpi/${code}/history`, { params: { from: opts?.from, to: opts?.to, scope_type: opts?.scopeType, scope_value: opts?.scopeValue } }).then(r => r.data);

// ─── Incidents ────────────────────────────────────────────────────────────────
export const getIncidentTrend = (opts: { days?: number; groupBy?: 'day' | 'week' | 'month'; geoCode?: string } = {}): Promise<IIncidentTrendPoint[]> =>
  api.get(`${BASE}/geo/incidents/trend`, { params: { days: opts.days ?? 30, group_by: opts.groupBy ?? 'day', geo_code: opts.geoCode } }).then(r => r.data);

export const getIncidentDensity = (from?: string, to?: string, severityMin?: number): Promise<IIncidentDensityPoint[]> =>
  api.get(`${BASE}/geo/incidents/density`, { params: { from, to, severity_min: severityMin } }).then(r => r.data);

export const queryIncidents = (params: {
  from?: string; to?: string; geoCode?: string; typeId?: number;
  severityMin?: number; page?: number; limit?: number;
}): Promise<IIncidentListResponse> =>
  api.get(`${BASE}/geo/incidents`, { params: {
    from: params.from, to: params.to, geo_code: params.geoCode,
    type_id: params.typeId, severity_min: params.severityMin,
    page: params.page, limit: params.limit,
  }}).then(r => r.data);

// ─── Geo ──────────────────────────────────────────────────────────────────────
export const getBoundaries = (level?: string): Promise<GeoFeatureCollection> =>
  api.get(`${BASE}/geo/boundaries`, { params: { level } }).then(r => r.data);

export const getRiskZones = (type?: string, severityMin?: number): Promise<GeoFeatureCollection> =>
  api.get(`${BASE}/geo/risk-zones`, { params: { type, severity_min: severityMin } }).then(r => r.data);

export const getInfrastructure = (infraType?: string): Promise<GeoFeatureCollection> =>
  api.get(`${BASE}/geo/infrastructure`, { params: { type: infraType } }).then(r => r.data);

export const getActiveIncidents = (): Promise<GeoFeatureCollection> =>
  api.get(`${BASE}/geo/incidents/active`).then(r => r.data);

export const getPlaybackData = (from: string, to: string, resolution?: 'hour' | 'day'): Promise<IPlaybackFrame[]> =>
  api.get(`${BASE}/geo/incidents/playback`, { params: { from, to, resolution } }).then(r => r.data);

export const spatialQuery = (type: 'buffer' | 'nearest' | 'intersection', params: Record<string, unknown>) =>
  api.post(`${BASE}/geo/spatial-query`, { type, params }).then(r => r.data);

// ─── Dashboards ───────────────────────────────────────────────────────────────
export const listDashboards = (): Promise<IDashboard[]> =>
  api.get(`${BASE}/dashboards`).then(r => r.data);

export const getDashboards = listDashboards;

export const getDashboard = (id: string): Promise<IDashboard> =>
  api.get(`${BASE}/dashboards/${id}`).then(r => r.data);

export const createDashboard = (dto: { name?: string; title?: string; description?: string; layout?: any; tags?: string[] }): Promise<IDashboard> =>
  api.post(`${BASE}/dashboards`, { title: dto.name ?? dto.title, description: dto.description, layout: dto.layout, tags: dto.tags }).then(r => r.data);

export const updateDashboard = (id: string, dto: Partial<IDashboard>): Promise<IDashboard> =>
  api.patch(`${BASE}/dashboards/${id}`, dto).then(r => r.data);

export const deleteDashboard = (id: string): Promise<void> =>
  api.delete(`${BASE}/dashboards/${id}`).then(r => r.data);

// ─── Datasets ─────────────────────────────────────────────────────────────────
export const listDatasets = (): Promise<IDataset[]> =>
  api.get(`${BASE}/datasets`).then(r => r.data);

export const getDatasets = listDatasets;

export const getDataset = (id: string): Promise<IDataset> =>
  api.get(`${BASE}/datasets/${id}`).then(r => r.data);

export const getDatasetData = (id: string, opts?: { limit?: number; offset?: number }): Promise<IExplorerResult> =>
  api.get(`${BASE}/datasets/${id}/data`, { params: { limit: opts?.limit, offset: opts?.offset } }).then(r => r.data);

export const createDataset = (dto: Partial<IDataset>): Promise<IDataset> =>
  api.post(`${BASE}/datasets`, dto).then(r => r.data);

// ─── Explorer ─────────────────────────────────────────────────────────────────
export const getAllowedTables = (): Promise<string[]> =>
  api.get(`${BASE}/explorer/tables`).then(r => r.data);

export const executeQuery = (
  mode: 'sql' | 'builder',
  payload: { sql?: string; builder?: IQueryBuilderConfig; params?: unknown[] },
): Promise<IExplorerResult> =>
  api.post(`${BASE}/explorer/query`, { mode, ...payload }).then(r => r.data);

export const executeExplorerQuery = (payload: { sql?: string; builderConfig?: IQueryBuilderConfig }): Promise<IExplorerResult> =>
  api.post(`${BASE}/explorer/query`, {
    mode: payload.sql ? 'sql' : 'builder',
    sql: payload.sql,
    builder: payload.builderConfig,
  }).then(r => r.data);

// ─── Reports ──────────────────────────────────────────────────────────────────
export const listReports = (): Promise<IReport[]> =>
  api.get(`${BASE}/reports`).then(r => r.data);

export const getReports = listReports;

export const getReport = (id: string): Promise<IReport> =>
  api.get(`${BASE}/reports/${id}`).then(r => r.data);

export const requestReport = (dto: { templateId?: string; template?: string; title?: string; params?: Record<string, unknown> }): Promise<IReport> =>
  api.post(`${BASE}/reports`, {
    template: dto.templateId ?? dto.template,
    title: dto.title ?? dto.templateId ?? dto.template,
    params: dto.params,
  }).then(r => r.data);

export const getReportDownloadUrl = (id: string): Promise<{ url: string | null }> =>
  api.get(`${BASE}/reports/${id}/download`).then(r => r.data);

// ─── Pipeline ─────────────────────────────────────────────────────────────────
export const listPipelineRuns = (limit = 50): Promise<IPipelineRun[]> =>
  api.get(`${BASE}/pipeline/runs`, { params: { limit } }).then(r => r.data);

export const triggerPipeline = (queue: string, job: string, data?: Record<string, unknown>) =>
  api.post(`${BASE}/pipeline/trigger`, { queue, job, data }).then(r => r.data);
