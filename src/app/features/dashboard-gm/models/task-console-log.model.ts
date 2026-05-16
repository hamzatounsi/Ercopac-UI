// task-console-log.model.ts
export interface TaskConsoleLog {
  id: number;
  projectId: number;
  taskId: number;
  message: string;
  severity: string;
  channel: string;
  notifyTarget: string;
  createdAt: string;
}