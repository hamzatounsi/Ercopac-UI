export interface ResourceListItem {
  id: number;
  fullName: string;
  employeeCode: string | null;
  departmentCode: string | null;
  resourceType: string | null;
  jobTitle: string | null;
  email: string;
  seniority: string | null;
  internalUser: boolean;
  hoursPerDay: number | null;
  daysPerWeek: number | null;
  workdays: string | null;
  defaultRate: number | null;
  rateType: string | null;
  currency: string | null;
  color: string | null;
  active: boolean;
}