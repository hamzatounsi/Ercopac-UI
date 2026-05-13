// Path: src/app/features/dashboard-gm/models/gm-update-project-task-request.model.ts
// REPLACE your entire file with this

export interface GmUpdateProjectTaskRequest {
  parentId?: number | null;        // ← NEW
  name: string;
  description?: string;
  durationDays?: number;
  baselineStart?: string;
  baselineEnd?: string;
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  percentComplete?: number;
  allocationPercent?: number;
  priority?: number;
  taskType?: string;
  wbsCode?: string;
  departmentCode?: string;
  resourceType?: string;
  active?: boolean;
  displayOrder?: number;
  outlineLevel?: number;           // ← NEW
  customerMilestone?: boolean;
  scheduleMode?: string;
  status?: string;
  color?: string;
  assignedUserId?: number;
}