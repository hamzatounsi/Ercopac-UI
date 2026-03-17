export interface ProjectScheduleInitRequest {
  code: string;
  name: string;
  shortName?: string;
  portfolio?: string;
  orgAssignment?: string;
  country?: string;
  projectType?: string;
  projectPhase?: string;
  priority?: string;
  plannedStart: string;
  plannedEnd: string;
  expectedStart?: string;
  expectedEnd?: string;
  projectCalendar?: string;
  probability?: number;
  projectBudget?: number | null;
  totalProjectBudget?: number | null;
  projectManagerId?: number | null;
  keywords?: string;
  subcontractors?: string;
  comment?: string;
}

export interface ProjectScheduleInitResponse {
  projectId: number;
  code: string;
  name: string;
  message: string;
}