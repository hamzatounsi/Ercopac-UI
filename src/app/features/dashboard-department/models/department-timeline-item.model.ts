export interface DepartmentTimelineItem {
  projectId: number | null;
  projectCode: string | null;
  projectName: string | null;
  taskId: number | null;
  taskName: string;
  taskType: string;
  startDate: string;
  endDate: string;
  progressPercent: number | null;
  departmentCode: string | null;
  resourceType: string | null;
  doubleBooked: boolean;
  holiday: boolean;
  holidayNote: string | null;
}