import { HealthStatus } from './health-status.model';

export interface ProjectDashboardRow {
  id: number;
  code: string;
  name: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  timeHealth: HealthStatus;
}