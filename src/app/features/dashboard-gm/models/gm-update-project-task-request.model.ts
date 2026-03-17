export interface GmUpdateProjectTaskRequest {
  name: string;
  description?: string;
  durationDays?: number;
  baselineStart?: string;
  baselineEnd?: string;
  plannedStart?: string;
  plannedEnd?: string;
  percentComplete?: number;
  priority?: number;
  taskType?: string;
  wbsCode?: string;
  departmentCode?: string;
  active?: boolean;
  displayOrder?: number;
  customerMilestone?: boolean;
  scheduleMode?: string;
}