import { DepartmentActivityRow } from './department-activity-row.model';

export interface DepartmentProjectBlock {
  projectId: number;
  projectCode: string | null;
  projectName: string;
  status: string | null;
  rows: DepartmentActivityRow[];
}