import { GmProjectScheduleTask } from './gm-project-schedule-task.model';

export interface ProjectBaseline {
  id: number;
  projectId: number;
  name: string;
  createdAt: string;
  snapshotJson: string;

  active?: boolean;

  expanded?: boolean;

  taskCount?: number;
  avgProgress?: number;
  completedCount?: number;

  tasks?: GmProjectScheduleTask[];
}