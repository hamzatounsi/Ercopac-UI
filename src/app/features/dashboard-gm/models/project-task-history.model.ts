export interface ProjectTaskHistory {
  id: number;
  projectId: number;
  taskId: number;
  taskName: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedByUserId: number;
  changedByName: string;
  changedAt: string;
}