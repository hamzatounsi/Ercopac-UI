// Path: src/app/features/dashboard-gm/models/gm-project-schedule-task.model.ts
// REPLACE your entire file with this

export interface GmProjectScheduleTask {
  id: number;
  projectId?: number;
  parentId?: number | null;          // ← NEW: real DB parent relationship
  name?: string;
  description?: string;
  durationDays?: number;
  plannedStart?: string;
  plannedEnd?: string;
  baselineStart?: string;
  baselineEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  percentComplete?: number;
  allocationPercent?: number;
  plannedHours?: number;
  actualHours?: number;
  priority?: number;
  scheduleMode?: string;
  status?: string;
  color?: string;
  taskType?: string;
  wbsCode?: string;
  departmentCode?: string;
  resourceType?: string;
  active?: boolean;
  displayOrder?: number;
  outlineLevel?: number;
  customerMilestone?: boolean;
  assignedUserId?: number | null;
  assignedUserName?: string;
  dependencies?: TaskDependencyDto[];
  predecessorLabel?: string;
}

export interface TaskDependencyDto {
  id?: number;
  predecessorTaskId: number;
  successorTaskId?: number;
  dependencyType?: string;
  lagDays?: number;
}