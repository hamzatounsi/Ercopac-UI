export interface DepartmentResourceAssignment {
  id?: number;
  resourceType: string;
  assignedUserId?: number | null;
  assignmentName?: string;
  ownerName?: string;
  quantity?: number;
  unitsPercent?: number;
  cost?: number;
}