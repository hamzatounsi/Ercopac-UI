export interface DepartmentMember {
  id: number;
  fullName: string;
  employeeCode: string | null;
  email: string | null;
  departmentCode: string;
  resourceType: string | null;
  role: string | null;
  seniority: string | null;
  internal: boolean;
  hoursPerDay: number | null;
  daysPerWeek: number | null;
  workdays: number[];
  color: string | null;
}