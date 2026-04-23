export interface DepartmentTimelineItem {
  projectId: number | null;
  projectCode: string | null;
  projectName: string | null;
  taskId: number | null;
  taskName: string;
  taskType: string | null;
  startDate: string;
  endDate: string;
  progressPercent: number;
  departmentCode: string | null;
  resourceType: string | null;
  doubleBooked: boolean;
  holiday: boolean;
  holidayNote: string | null;
  internalResource: boolean | null;
}