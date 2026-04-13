export interface ActionComment {
  id: number;
  author: string;
  text: string;
  createdAt: string;
}

export interface ActionAttachment {
  id: number;
  fileName: string;
  contentType: string | null;
  fileSize: number | null;
}

export interface ActionItem {
  id: number;
  title: string;
  description: string | null;
  actionType: 'action' | 'issue';
  departmentCode: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'doing' | 'review' | 'blocked' | 'done';
  customerVisible: boolean;
  insertedDate: string | null;
  dueDate: string | null;
  assignees: string[];
  comments: ActionComment[];
  attachments: ActionAttachment[];
}