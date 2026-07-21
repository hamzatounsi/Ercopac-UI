export type OrganisationRole =
  | 'ORG_ADMIN'
  | 'GENERAL_MANAGER'
  | 'DEPARTMENT_MANAGER'
  | 'EMPLOYEE';

export interface OrganisationProfile {
  name: string;
  code: string;
  country: string | null;
  domain: string | null;
  status: string;
  plan: string;
  userLimit: number;
  orgAdminLicenceLimit: number;
  generalManagerLicenceLimit: number;
  departmentManagerLicenceLimit: number;
  employeeLicenceLimit: number;
  createdAt: string;
}

export interface UpdateOrganisationProfile {
  name: string;
  country: string | null;
  domain: string | null;
}

export interface SecuritySettings {
  sessionTimeout: '1_HOUR' | '4_HOURS' | '8_HOURS' | '12_HOURS';
  maxFailedLogins: number;
  passwordMinLength: number;
}

export interface RoleCount {
  role: OrganisationRole;
  label: string;
  total: number;
  active: number;
}

export interface OrganisationAdminOverview {
  organisation: OrganisationProfile;
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  departments: number;
  pendingPasswordResets: number;
  usersByRole: RoleCount[];
  configurationWarnings: string[];
}

export interface OrganisationUser {
  id: number;
  fullName: string;
  email: string;
  role: OrganisationRole;
  departmentId: number | null;
  departmentCode: string | null;
  departmentName: string | null;
  employeeCode: string | null;
  jobTitle: string | null;
  active: boolean;
}

export interface SaveOrganisationUser {
  fullName: string;
  email: string;
  password?: string;
  role: OrganisationRole;
  departmentId: number | null;
  employeeCode: string | null;
  jobTitle: string | null;
  active: boolean;
}

export interface OrganisationDepartment {
  id: number;
  code: string;
  name: string;
  managerId: number | null;
  managerName: string | null;
  userCount: number;
  createdAt: string;
}

export interface SaveOrganisationDepartment {
  code: string;
  name: string;
  managerId: number | null;
}

export interface RolePermissionView {
  module: string;
  label: string;
  canRead: boolean;
  canWrite: boolean;
}

export interface OrganisationRoleSummary {
  role: OrganisationRole;
  label: string;
  description: string;
  totalUsers: number;
  activeUsers: number;
  permissions: RolePermissionView[];
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PasswordResetRequest {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  status: string;
  requestedAt: string;
}

export interface ApiErrorBody {
  status?: number;
  error?: string;
  message?: string;
}

export interface ProjectCategoryConfig {
  id: number;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  active: boolean;
  projectsUsing: number;
}

export interface SaveProjectCategoryConfig {
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  active: boolean;
}

export interface ProjectTypeConfig extends ProjectCategoryConfig {
  billable: boolean;
}

export interface SaveProjectTypeConfig extends SaveProjectCategoryConfig {
  billable: boolean;
}

export interface CustomerConfig {
  id: number;
  customerCode: string;
  name: string;
  country: string | null;
  town: string | null;
  address: string | null;
  vatTaxId: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  erpId: string | null;
  active: boolean;
  projectsUsing: number;
}

export type SaveCustomerConfig = Omit<CustomerConfig, 'id' | 'projectsUsing'>;
