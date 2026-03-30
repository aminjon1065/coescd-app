import api from '@/lib/axios';
import { ListResponse } from '@/lib/list-response';
import { IDisaster, IDisasterType, IDisasterCategory } from '@/interfaces/IDisaster';

// ─── Disasters ────────────────────────────────────────────────────────────────

export interface GetDisastersParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'resolved' | 'monitoring';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  departmentId?: number;
  typeId?: number;
  q?: string;
}

export interface CreateDisasterPayload {
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'active' | 'resolved' | 'monitoring';
  typeId?: number;
  departmentId?: number;
  casualties?: number;
  affectedPeople?: number;
}

// ─── Prediction ───────────────────────────────────────────────────────────────

export interface PredictParams {
  fromDate: string; // ISO date
  toDate: string;   // ISO date
  horizonMonths: number;
  disasterTypeId?: number;
  departmentId?: number;
}

export interface MonthlyPoint {
  month: string; // YYYY-MM
  count: number;
}

export interface PredictionPoint {
  month: string;
  predicted: number;
  lower: number;
  upper: number;
}

export interface PredictionResult {
  historical: MonthlyPoint[];
  forecast: PredictionPoint[];
  model: {
    method: 'linear_regression';
    slope: number;
    intercept: number;
    r2: number;
    rmse: number;
  };
  meta: {
    fromDate: string;
    toDate: string;
    horizonMonths: number;
    disasterTypeId?: number;
    departmentId?: number;
    generatedAt: string;
  };
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface IncidentsTrendPoint {
  date: string;
  count: number;
}

export interface TasksByDepartmentRow {
  departmentId: number;
  name: string;
  total: number;
  new: number;
  inProgress: number;
  completed: number;
}

// ─── API client ───────────────────────────────────────────────────────────────

export const analyticsApi = {
  // Disasters
  getDisasters: (params: GetDisastersParams = {}) =>
    api.get<ListResponse<IDisaster>>('/analytics/disasters', { params }).then((r) => r.data),

  getDisaster: (id: number) =>
    api.get<IDisaster>(`/analytics/disasters/${id}`).then((r) => r.data),

  createDisaster: (payload: CreateDisasterPayload) =>
    api.post<IDisaster>('/analytics/disasters', payload).then((r) => r.data),

  updateDisaster: (id: number, payload: Partial<CreateDisasterPayload>) =>
    api.patch<IDisaster>(`/analytics/disasters/${id}`, payload).then((r) => r.data),

  deleteDisaster: (id: number) =>
    api.delete(`/analytics/disasters/${id}`),

  // Disaster types & categories
  getDisasterTypes: () =>
    api.get<IDisasterType[]>('/analytics/disaster-types').then((r) => r.data),

  getDisasterCategories: () =>
    api.get<IDisasterCategory[]>('/analytics/disaster-categories').then((r) => r.data),

  // Prediction
  predict: (params: PredictParams) =>
    api.get<PredictionResult>('/analytics/prediction', { params }).then((r) => r.data),

  // Reports
  getStats: () =>
    api.get('/reports/stats').then((r) => r.data),

  getMyDashboard: () =>
    api.get('/reports/my-dashboard').then((r) => r.data),

  getIncidentsTrend: (params: { fromDate?: string; toDate?: string } = {}) =>
    api.get<IncidentsTrendPoint[]>('/reports/incidents-trend', { params }).then((r) => r.data),

  getTasksByDepartment: () =>
    api.get<TasksByDepartmentRow[]>('/reports/tasks-by-department').then((r) => r.data),
};
