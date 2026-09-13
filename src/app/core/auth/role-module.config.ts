import type { AppRole } from './auth.service';
import { APPLICATION_ICONS } from '../config/application-icons';

export type WorkspaceModuleKey =
  | 'PLATFORM_ADMIN'
  | 'ORGANISATION_ADMIN'
  | 'PROJECTUM'
  | 'COMMAND_CENTER'
  | 'DEPARTMENT'
  | 'EMPLOYEE'
  | 'CRM'
  | 'TICKETING';

export interface WorkspaceModule {
  key: WorkspaceModuleKey;
  name: string;
  route: string;
  icon: string;
}

const WORKSPACE_MODULES: Record<WorkspaceModuleKey, WorkspaceModule> = {
  PLATFORM_ADMIN: { key: 'PLATFORM_ADMIN', name: 'Platform', route: '/owner', icon: 'admin_panel_settings' },
  ORGANISATION_ADMIN: { key: 'ORGANISATION_ADMIN', name: 'Organisation Admin', route: '/org-admin', icon: 'shield_person' },
  PROJECTUM: { key: 'PROJECTUM', name: 'Projectum', route: '/gm/projectum', icon: APPLICATION_ICONS.projectum },
  COMMAND_CENTER: { key: 'COMMAND_CENTER', name: 'Command Center', route: '/gm/company-dashboard', icon: APPLICATION_ICONS.companyDashboard },
  DEPARTMENT: { key: 'DEPARTMENT', name: 'My Department', route: '/department', icon: APPLICATION_ICONS.myDepartment },
  EMPLOYEE: { key: 'EMPLOYEE', name: 'Employee', route: '/employee', icon: APPLICATION_ICONS.employee },
  CRM: { key: 'CRM', name: 'My CRM', route: '/crm/opportunities', icon: APPLICATION_ICONS.myCrm },
  TICKETING: { key: 'TICKETING', name: 'Ticketing', route: '/tickets', icon: APPLICATION_ICONS.ticketing }
};

export const ROLE_MODULE_MAP: Record<AppRole, WorkspaceModuleKey> = {
  PLATFORM_OWNER: 'PLATFORM_ADMIN',
  ORG_ADMIN: 'ORGANISATION_ADMIN',
  PROJECT_MANAGER: 'PROJECTUM',
  PROJECT_MANAGER_LEAD: 'PROJECTUM',
  MANAGER: 'COMMAND_CENTER',
  DEPARTMENT_MANAGER: 'DEPARTMENT',
  EMPLOYEE: 'EMPLOYEE',
  SALES_MANAGER_LEAD: 'CRM',
  SALES_MANAGER: 'CRM',
  SYSTEM_ENGINEER: 'CRM',
  CLIENT: 'TICKETING'
};

export function accessibleWorkspaceModules(roles: readonly AppRole[]): WorkspaceModule[] {
  const keys = roles.map(role => ROLE_MODULE_MAP[role]).filter(Boolean);
  return [...new Set(keys)].map(key => WORKSPACE_MODULES[key]);
}

export function directRouteForRole(role: AppRole): string {
  return WORKSPACE_MODULES[ROLE_MODULE_MAP[role]].route;
}
