export interface DepartmentActivityRow {
  taskId: number;
  wbs: string | null;
  name: string;
  type: string;
  departmentCode: string | null;
  baselineStartDate: string | null;
  baselineEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  durationDays: number | null;
  progressPercent: number | null;
  summary: boolean;
}