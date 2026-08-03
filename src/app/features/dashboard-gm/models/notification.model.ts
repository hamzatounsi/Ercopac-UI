export interface AppNotification {
  id: number;
  projectId: number | null;
  taskId: number | null;
  channel: string;
  status: string;
  severity: string;
  subject: string;
  message: string;
  createdAt: string;
  sentAt: string | null;
  readByUser: boolean;
  link: string | null;
}