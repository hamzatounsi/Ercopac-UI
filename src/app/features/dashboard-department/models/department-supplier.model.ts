/** A supplier linked to the department's resource types (GET /department-dashboard/suppliers). */
export interface DepartmentSupplier {
  id: number;
  name: string;
  shortCode: string | null;
  country: string | null;
  contact: string | null;
  website: string | null;
  departments: string[];
  /** Every resource type of the supplier. */
  resourceTypes: string[];
  /** The supplier's resource types that belong to this department. */
  departmentResourceTypes: string[];
  notes: string | null;
  /** The current user may edit or delete it. */
  editable: boolean;
}

/** Body of POST /suppliers and PUT /suppliers/{id}. */
export interface SaveSupplierRequest {
  name: string;
  shortCode: string | null;
  country: string | null;
  contact: string | null;
  website: string | null;
  departments: string[];
  resourceTypes: string[];
  notes: string | null;
}
