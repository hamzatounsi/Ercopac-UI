export interface ProjectCalendar {
  id: number;
  projectId: number;
  name: string;
  workingDays: number[];
  hoursPerDay: number;
  startTime: string;
  isDefault: boolean;
}