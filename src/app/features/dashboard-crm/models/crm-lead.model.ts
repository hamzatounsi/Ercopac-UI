export interface CrmLead {
  id: number | null;
  fullName: string;
  company: string | null;
  accountId: number | null;
  accountName: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  rating: string | null;
  source: CrmLeadSource;
  status: CrmLeadStatus;
  ownerId: number | null;
  ownerName: string | null;
  converted: boolean;
  convertedAt: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string | null;
}
 
export type CrmLeadSource =
  'REFERRAL' | 'TRADE_FAIR' | 'AGENT' | 'CUSTOMER' | 'PARTNER' | 'OTHER';
 
export type CrmLeadStatus =
  'NOT_CONTACTED' | 'CONTACTED' | 'CONTACT_IN_FUTURE' | 'CONVERTED';
 
export const LEAD_SOURCE_LABELS: Record<CrmLeadSource, string> = {
  REFERRAL:       'Referral',
  TRADE_FAIR:     'Trade fair',
  AGENT:          'Agent',
  CUSTOMER:       'Customer',
  PARTNER:        'Partner',
  OTHER:          'Other'
};
 
export const LEAD_STATUS_LABELS: Record<CrmLeadStatus, { label: string; color: string }> = {
  NOT_CONTACTED:     { label: 'Not contacted',     color: '#94a3b8' },
  CONTACTED:         { label: 'Contacted',          color: '#f59e0b' },
  CONTACT_IN_FUTURE: { label: 'Contact in future',  color: '#3b82f6' },
  CONVERTED:         { label: 'Converted',           color: '#22c55e' }
};
 
export function emptyLead(): CrmLead {
  return {
    id: null, fullName: '', company: '', accountId: null, accountName: null,
    jobTitle: '', email: '', phone: '', mobile: '', rating: '',
    source: 'OTHER', status: 'NOT_CONTACTED',
    ownerId: null, ownerName: null, converted: false, convertedAt: null,
    notes: '', active: true, createdAt: null
  };
}
