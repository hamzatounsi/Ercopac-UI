export interface ProjectDetails {
  id: number;
  code: string;
  name: string;
  shortName?: string;
  portfolio?: string;
  orgAssignment?: string;
  country?: string;
  projectType?: string;
  projectPhase?: string;
  priority?: string;
  plannedStart?: string;
  plannedEnd?: string;
  expectedStart?: string;
  expectedEnd?: string;
  projectCalendar?: string;
  probability?: number;
  projectBudget?: number;
  totalProjectBudget?: number;
  projectManagerId?: number;
  keywords?: string;
  subcontractors?: string;
  comment?: string;
}