import { IDepartment } from './IDepartment';

export type DisasterSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DisasterStatus = 'active' | 'resolved' | 'monitoring';

export interface IDisasterType {
  id: number;
  name: string;
  category: IDisasterCategory;
}

export interface IDisasterCategory {
  id: number;
  name: string;
}

export interface IDisaster {
  id: number;
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  severity: DisasterSeverity;
  status: DisasterStatus;
  type: IDisasterType;
  department: IDepartment;
  casualties: number;
  affectedPeople: number;
  createdAt: string;
  updatedAt: string;
}
