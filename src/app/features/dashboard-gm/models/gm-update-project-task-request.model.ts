export interface GmUpdateProjectTaskRequest {
  name?: string;
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
  plannedHours?: number;
  actualHours?: number;
  priority?: number;
  scheduleMode?: string;
  status?: string;
  color?: string;
  active?: boolean;
  displayOrder?: number;
  taskType?: string;
  wbsCode?: string;
  departmentCode?: string;
  resourceType?: string;
  customerMilestone?: boolean;
  assignedUserId?: number;
}