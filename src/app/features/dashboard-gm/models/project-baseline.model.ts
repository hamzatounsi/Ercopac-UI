export interface ProjectBaselineTaskSnapshot {
  taskId: number;
  taskType: string;
  start: string | null;
  end: string | null;
  durationDays: number | null;
}

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

  tasks?: ProjectBaselineTaskSnapshot[];
}
