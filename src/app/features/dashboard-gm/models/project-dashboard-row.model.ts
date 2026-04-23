import { HealthStatus } from './health-status.model';

export interface ProjectDashboardRow {
  id: number;
  code?: string;
  name?: string;
  shortName?: string;

  customer?: string;
  category?: string;

  country?: string;
  portfolio?: string;

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
}