import { HealthStatus } from './health-status.model';

export interface ProjectDashboardRow {
  id: number;
  code?: string;
  name?: string;
  shortName?: string;
  country?: string;
  portfolio?: string;
  projectPhase?: string;
  plannedStart?: string;
  plannedEnd?: string;
  timeHealth?: HealthStatus;
}