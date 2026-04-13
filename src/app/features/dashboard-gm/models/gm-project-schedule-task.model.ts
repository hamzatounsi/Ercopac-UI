export interface TaskDependencyDto {
  id?: number;
  predecessorTaskId: number;
  successorTaskId: number;
  dependencyType: string;
  lagDays?: number;
}

export interface GmProjectScheduleTask {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  durationDays?: number;

  baselineStart?: string | null;
  baselineEnd?: string | null;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  actualStart?: string | null;
  actualEnd?: string | null;

  percentComplete?: number | null;
  allocationPercent?: number | null;
  plannedHours?: number | null;
  actualHours?: number | null;

  priority?: number | null;
  scheduleMode?: string | null;
  status?: string | null;
  color?: string | null;

  taskType?: string | null;
  wbsCode?: string | null;
  departmentCode?: string | null;
  resourceType?: string | null;

  active?: boolean | null;
  displayOrder?: number | null;
  customerMilestone?: boolean | null;

  predecessorLabel?: string | null;
  dependencies?: TaskDependencyDto[];

  assignedUserId?: number | null;
  assignedUserName?: string | null;
}