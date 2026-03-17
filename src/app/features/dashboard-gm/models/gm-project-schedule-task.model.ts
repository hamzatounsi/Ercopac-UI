export interface GmProjectScheduleTask {
  scheduleMode: string;
  id: number;
  projectId: number;
  name: string;
  description?: string;
  durationDays?: number;
  baselineStart?: string;
  baselineEnd?: string;
  plannedStart?: string;
  plannedEnd?: string;
  percentComplete?: number;
  priority?: number;
  taskType?: 'ACTIVITY' | 'SUMMARY' | 'MILESTONE' | string;
  wbsCode?: string;
  departmentCode?: string;
  active?: boolean;
  displayOrder?: number;
  customerMilestone?: boolean;
}