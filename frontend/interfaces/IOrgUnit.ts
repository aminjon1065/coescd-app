export interface IOrgUnit {
  id: number;
  name: string;
  type: string;
  path?: string | null;
  parent?: IOrgUnit | null;
}
