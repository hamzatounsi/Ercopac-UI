// task-console-config.model.ts
export interface TaskConsoleConfig {
  id?: number;
  projectId: number;
  taskId: number;
  checkpoint25: boolean;
  checkpoint50: boolean;
  checkpoint75: boolean;
  channel: 'APP_ALERT' | 'EMAIL' | 'BOTH';
  notifyPm: boolean;
  notifyOwner: boolean;
  notifyDeptManager: boolean;
  notifyEveryone: boolean;
  updatedAt?: string;
}