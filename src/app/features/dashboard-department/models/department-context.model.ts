export interface DepartmentResourceType {
  code: string;
  label: string | null;
  colour: string | null;
}

/** Header data and permissions of the department shown on My Department (GET /department-dashboard/context). */
export interface DepartmentContext {
  managerId: number;
  managerName: string;
  managerEmail: string | null;
  managerResourceType: string | null;
  departmentCode: string;
  departmentLabel: string;
  /** Resource types in the department scope; suppliers created here use one of them. */
  resourceTypes: DepartmentResourceType[];
  /** True when the current user is limited to this department (Department Manager). */
  restricted: boolean;
  canManageSuppliers: boolean;
  canManageHolidays: boolean;
  canManageResources: boolean;
}
