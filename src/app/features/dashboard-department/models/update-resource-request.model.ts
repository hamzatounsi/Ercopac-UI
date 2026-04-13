export interface UpdateResourceRequest {
  fullName?: string | null;
  employeeCode?: string | null;
  departmentCode?: string | null;
  resourceType?: string | null;
  jobTitle?: string | null;
  seniority?: string | null;
  internalUser?: boolean | null;
  hoursPerDay?: number | null;
  daysPerWeek?: number | null;
  workdays?: string | null;
  defaultRate?: number | null;
  rateType?: string | null;
  currency?: string | null;
  color?: string | null;
  notes?: string | null;
  active?: boolean | null;
}