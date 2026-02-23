export interface IFileShare {
  id: number;
  sharedWithUser?: {
    id: number;
    name: string;
    email: string;
  };
  sharedWithDepartment?: {
    id: number;
    name: string;
  };
  grantedBy: {
    id: number;
    name: string;
  };
  createdAt: string;
}
