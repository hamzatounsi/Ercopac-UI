export interface CreateResourceRequest {
  fullName: string;
  email: string;
  password: string;
  role: string;

  employeeCode?: string;
  departmentCode?: string;
  resourceType?: string;
  jobTitle?: string;
  seniority?: string;
  internalUser?: boolean;
  hoursPerDay?: number;
  daysPerWeek?: number;
  workdays?: string;
  defaultRate?: number;
  rateType?: string;
  currency?: string;
  color?: string;
  notes?: string;
  active?: boolean;
}