export interface ResourceListItem {
  id?: number;
  fullName?: string;
  employeeCode?: string;
  departmentCode?: string;
  resourceType?: string;
  jobTitle?: string;
  email?: string;
  seniority?: string;
  internalUser?: boolean;
  hoursPerDay?: number;
  daysPerWeek?: number;
  workdays?: string;
  defaultRate?: number;
  rateType?: string;
  currency?: string;
  color?: string;
  active?: boolean;
}