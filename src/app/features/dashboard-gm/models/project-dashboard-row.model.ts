import { HealthStatus } from './health-status.model';

export interface ProjectDashboardRow {
  id: number;
  code?: string;
  name?: string;
  shortName?: string;

  customer?: string;
  customerId?: number;
  category?: string;

  country?: string;
  portfolio?: string;
  departmentCode?: string | null; 
  projectType?: string;
  projectPhase?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | string;

  projectManagerName?: string;
  programManagerName?: string;
  salesManagerName?: string;

  plannedStart?: string;
  plannedEnd?: string;

  projectBudget?: number;
  estimatedCost?: number;

  progressPercent?: number;
  totalTasks?: number;
  completedTasks?: number;

  archived?: boolean;
  timeHealth?: HealthStatus;
  applicationType?: 'PROJECTUM' | 'MY_CS' | string;
}
