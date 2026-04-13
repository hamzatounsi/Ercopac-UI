export interface TaskResourceAssignment {
  id?: number;
  projectId?: number;
  taskId?: number;
  assignedUserId?: number | null;
  assignedUserName?: string | null;
  resourceType?: string | null;
  assignmentName?: string | null;
  quantity?: number | null;
  unitsPercent?: number | null;
  cost?: number | null;
}