export interface DepartmentManager {
  id: number;
  fullName: string;
  email: string | null;
  departmentCode: string;
  resourceType: string | null;
  role: string | null;
}