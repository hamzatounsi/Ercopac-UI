export interface ChangeRequestAttachment {
  id: number;
  fileName: string;
  contentType: string | null;
  fileSize: number | null;
}

export interface ChangeRequestHistoryEntry {
  id: number;
  action: string;
  performedBy: string | null;
  createdAt: string;
}

export interface ChangeRequest {
  id: number;
  code: string;
  title: string;
  status: 'open' | 'submitted' | 'accepted' | 'refused' | 'cancelled';
  requestDate: string | null;
  valueAmount: number;
  costAmount: number;
  marginAmount: number;
  marginPercent: number;
  owner: string | null;
  note: string | null;
  attachments: ChangeRequestAttachment[];
  history: ChangeRequestHistoryEntry[];
}