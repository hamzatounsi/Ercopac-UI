export interface OwnerProjectRow {
  projectId: number;
  projectCode: string;
  projectName: string;
  organisationName: string;
  plannedStartDate: string;
  plannedEndDate: string;
  progressPercent: number;
  status: string;
  health: 'GREEN' | 'AMBER' | 'RED';
}