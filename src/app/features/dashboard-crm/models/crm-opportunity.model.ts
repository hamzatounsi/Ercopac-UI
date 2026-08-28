
import { CrmUser } from './crm-detail.model';

export interface CrmOpportunity {
  id: number | null;
  name: string;
  accountName: string | null;
  accountId: number | null;
  stageId: number | null;
  stageName: string | null;
  stageColor: string | null;
  value: number | null;
  currency: string;
  probability: number;
  closingDate: string | null;
  ownerId: number | null;
  ownerName: string | null;
  leadId: number | null;
  contactName: string | null;
  supplyCategoryId: number | null;
  supplyCategoryName: string | null;
  opportunityType: string | null;
  pipeline: string | null;
  quoteNumber: string | null;
  quoteRequestedDate: string | null;
  quoteSubmittedDate: string | null;
  shipmentDate: string | null;
  nextStep: string | null;
  description: string | null;
  materialValue: number | null;
  servicesValue: number | null;
  ercopacMaterialValue: number | null;
  thirdPartyMaterialValue: number | null;
  ercopacResaleValue: number | null;
  resaleValue: number | null;
  won: boolean;
  lost: boolean;
  notes: string | null;
  createdAt: string | null;
  teamMembers: CrmUser[];
}
 
export function emptyOpportunity(): CrmOpportunity {
  return {
    id: null, name: '', accountName: '', accountId: null, stageId: null, stageName: null,
    stageColor: null, value: null, currency: 'EUR', probability: 0,
    closingDate: null, ownerId: null, ownerName: null, leadId: null, contactName: null,
    supplyCategoryId: null, supplyCategoryName: null, opportunityType: 'BP', pipeline: 'MTO',
    quoteNumber: '', quoteRequestedDate: null, quoteSubmittedDate: null, shipmentDate: null,
    nextStep: '', description: '', materialValue: null, servicesValue: null,
    ercopacMaterialValue: null, thirdPartyMaterialValue: null, ercopacResaleValue: null, resaleValue: null,
    won: false, lost: false, notes: '', createdAt: null, teamMembers: []
  };
}
