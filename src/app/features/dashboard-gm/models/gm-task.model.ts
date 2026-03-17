export interface GmTask {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  durationDays?: number;
  plannedStart?: string;
  plannedEnd?: string;
  percentComplete?: number;
  priority?: number;
  scheduleMode?: string;
  active?: boolean;
  displayOrder?: number;
}

export interface CreateGmTaskRequest {
  name: string;
  description?: string;
  durationDays?: number | null;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  percentComplete?: number | null;
  priority?: number | null;
  scheduleMode?: string | null;
  active?: boolean | null;
  displayOrder?: number | null;
}

export interface UpdateGmTaskRequest {
  name: string;
  description?: string;
  durationDays?: number | null;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  percentComplete?: number | null;
  priority?: number | null;
  scheduleMode?: string | null;
  active?: boolean | null;
  displayOrder?: number | null;
}