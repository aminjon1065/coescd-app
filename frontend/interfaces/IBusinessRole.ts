export interface IBusinessRole {
  id: number;
  code: string;
  name: string;
  defaultScope: 'self' | 'department' | 'subtree' | 'global';
  isActive: boolean;
}
