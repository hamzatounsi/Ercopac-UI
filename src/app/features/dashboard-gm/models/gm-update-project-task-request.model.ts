export interface GmUpdateProjectTaskRequest {
  parentId?: number | null;
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
  outlineLevel?: number;
  customerMilestone?: boolean;
  scheduleMode?: string;
  status?: string;
  color?: string;
  assignedUserId?: number;
  milestoneTypeId?: number | null; // ✅ ADD THIS LINE
}