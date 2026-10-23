export interface CrmAccount {
  id: number | null;
  name: string;
  industry: string | null;
  industryId: number | null;
  country: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  employees: string | null;
  annualRevenue: number | null;
  currency: string;
  ownerId: number | null;
  ownerName: string | null;
  notes: string | null;
  leadCount: number;
  opportunityCount: number;
  pipelineValue: number;
  createdAt: string | null;
  updatedAt: string | null;
    postalCode?: string; // ✅ NOUVEAU
}

export function emptyAccount(): CrmAccount {
  return { 
    id: null, 
    name: '', 
    industry: null, 
    industryId: null, 
    country: null, 
    city: null, 
    address: null, 
    phone: null, 
    website: null,
    employees: null, 
    annualRevenue: null, 
    currency: 'EUR', 
    ownerId: null, 
    ownerName: null, 
    notes: '',
    leadCount: 0, 
    opportunityCount: 0, 
    pipelineValue: 0, 
    createdAt: null, 
    updatedAt: null, 
    postalCode: '' // ✅ NOUVEAU
  };
}