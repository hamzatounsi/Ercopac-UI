export interface ProjectTemplate {
  id: number;
  projectId: number;
  name: string;
  scope: 'all' | 'selected';
  description?: string | null;
  createdAt: string;
  snapshotJson: string;
}