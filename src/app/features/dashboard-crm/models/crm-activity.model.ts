
export interface CrmActivity {
  id: number;
  activityType: CrmActivityType;
  description: string;
  userId: number | null;
  userName: string | null;
  leadId: number | null;
  opportunityId: number | null;
  metadata: string | null;
  createdAt: string;
}
 
export type CrmActivityType =
  | 'EMAIL_SENT'
  | 'STAGE_UPDATED'
  | 'OFFER_ATTACHED'
  | 'LEAD_CREATED'
  | 'OPPORTUNITY_CREATED'
  | 'NOTE_ADDED'
  | 'LEAD_CONVERTED'
  | 'DEAL_WON'
  | 'DEAL_LOST';
 
export const ACTIVITY_ICONS: Record<CrmActivityType, { icon: string; color: string }> = {
  EMAIL_SENT:           { icon: '📧', color: '#3b82f6' },
  STAGE_UPDATED:        { icon: '🔄', color: '#f59e0b' },
  OFFER_ATTACHED:       { icon: '📎', color: '#f97316' },
  LEAD_CREATED:         { icon: '👤', color: '#8b5cf6' },
  OPPORTUNITY_CREATED:  { icon: '💼', color: '#06b6d4' },
  NOTE_ADDED:           { icon: '📝', color: '#64748b' },
  LEAD_CONVERTED:       { icon: '⚡', color: '#22c55e' },
  DEAL_WON:             { icon: '🏆', color: '#22c55e' },
  DEAL_LOST:            { icon: '❌', color: '#ef4444' }
};
 