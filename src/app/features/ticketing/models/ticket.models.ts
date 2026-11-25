// Code of a status of Ticketing settings > Statuses (organisation defined, no built-in values)
export type TicketStatus = string;
export type TicketPriority = 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
// Category code: a system category (SYSTEM_CATEGORIES) or a custom category of Ticket settings
export type TicketCategory = string;
export const SYSTEM_CATEGORIES = ['SOFTWARE', 'ACCESS', 'PERFORMANCE', 'BILLING', 'DATA', 'INTEGRATION', 'FEATURE_REQUEST', 'OTHER'];
export type TicketOrigin = 'WEB'|'EMAIL'|'PHONE'|'INTERNAL'|'OTHER';
export interface Ref { id:number; name:string; }
// Customer / project saved on a ticket: id is the Projectum record, null for a manual (historical or external) entry
export interface SavedRef { id:number|null; name:string; }
export interface UserSummary { id:number; fullName:string; email:string; role:string; }
export interface Ticket { id:number; ticketNumber:string; subject:string; organisationId:number; organisationName:string; status:TicketStatus|null; priority:TicketPriority; category:TicketCategory; site?:string; client?:UserSummary; assignee?:UserSummary; createdAt:string; updatedAt:string; lastMessageAt?:string; unreadCount:number; customer?:SavedRef; project?:SavedRef; l2Technician?:UserSummary; overdue:boolean; projectNumber?:string; projectYear?:number; statusRef?:StatusRef|null; }
// Status of a ticket as shown on badges (status on Ticket is its code)
export interface StatusRef { id:number; code:string; name:string; color:string; isClosed:boolean; }
export interface ContactPerson { name?:string|null; email?:string|null; phone?:string|null; }
export interface TicketMessage { id:number; message:string; messageType:string; internalNote:boolean; sender:UserSummary; createdAt:string; }
export interface TicketActivity { id:number; activityType:string; description:string; previousValue?:string; newValue?:string; actor?:UserSummary; createdAt:string; field?:string; }
export interface Attachment { id:number; originalFileName:string; contentType:string; fileSize:number; uploadedBy?:UserSummary; uploadedAt:string; }
export interface TicketDetails { ticket:Ticket; description:string; origin:TicketOrigin; escalationLevel:number; resolvedAt?:string; closedAt?:string; version:number; messages:TicketMessage[]; activities:TicketActivity[]; attachments:Attachment[]; canManage:boolean; canClose:boolean; equipment?:Equipment; problem?:string; cause?:string; solution?:string; clientLanguage:string; contact?:ContactPerson; canDelete:boolean; }
// Client portal dashboard (own tickets only, filtered by the backend)
// open: tickets in the default status, inProgress: other open statuses, closed: statuses flagged closed
export interface ClientDashboard { total:number; open:number; inProgress:number; closed:number; overdue:number; averageResolutionHours:number; byStatus:Breakdown[]; byPriority:Breakdown[]; byCategory:Breakdown[]; byMonth:Breakdown[]; recent:Ticket[]; }
// open / closed: tickets whose status is not / is flagged closed; byStatus: count per status code
export interface TicketStats { open:number; closed:number; createdToday:number; overdue:number; averageResolutionHours:number; byStatus:Breakdown[]; }
export interface Page<T> { content:T[]; totalElements:number; totalPages:number; number:number; }

// Live chat (one-to-one conversations, not linked to a ticket)
export interface ChatContact { id:number; fullName:string; email:string; kind:'SUPPORT'|'CLIENT'; staff:boolean; }
export interface ChatConversation { contact:ChatContact; lastMessage:string; lastMessageAt:string; lastFromMe:boolean; unread:number; }
export interface ChatMessage { id:number; senderId:number; recipientId:number; message:string; createdAt:string; readAt?:string; }

// Settings
export type StatusColor = 'blue'|'amber'|'red'|'green'|'gray'|'purple'|'coral';
export const STATUS_PALETTE: StatusColor[] = ['blue', 'amber', 'red', 'green', 'gray', 'purple', 'coral'];
// Ticket status of Ticketing settings > Statuses; color is a palette name or #RRGGBB
export interface TicketStatusDef { id:number; code:string; name:string; description?:string|null; color:string; displayOrder:number; isDefault:boolean; isClosed:boolean; active:boolean; ticketCount:number; }
export interface TicketStatusRequest { name:string; description?:string|null; color:string; displayOrder?:number|null; isDefault?:boolean|null; isClosed?:boolean|null; active?:boolean|null; }
export interface PrioritySetting { priority:TicketPriority; label:string; firstResponseMinutes:number; resolutionHours:number; }
export interface TicketSettings { statuses:TicketStatusDef[]; priorities:PrioritySetting[]; categories?:CategorySetting[]; }
export interface CategorySetting { id:number; code:string; label:string; system:boolean; active:boolean; ticketCount:number; }
export type AccountKind = 'H24'|'H24_LEAD'|'TECHNICIAN';
export interface AccountRequest { fullName:string; email:string; password:string; kind:AccountKind; departmentId?:number|null; resourceTypeId?:number|null; specialization?:string|null; }
// Import of historical customers and orders
export interface ImportRow { customerCode?:string|null; customerName?:string|null; country?:string|null; town?:string|null; email?:string|null; phone?:string|null; orderNumber?:string|null; orderName?:string|null; year?:number|null; }
export interface ImportResult { rows:number; customersCreated:number; customersExisting:number; ordersCreated:number; ordersDuplicate:number; skipped:number; errors:string[]; dryRun:boolean; }
// Attachments: images, PDFs, documents and videos (mp4, webm, mov up to 20 MB)
export const ATTACHMENT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.docx,.mp4,.webm,.mov';
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
export function isVideoFile(file: File): boolean { return file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name); }
/** Size error key for an attachment, or '' when the file can be uploaded. */
export function attachmentSizeError(file: File): string {
  if (isVideoFile(file)) return file.size > MAX_VIDEO_BYTES ? 'ticketing.details.videoTooLarge' : '';
  return file.size > MAX_ATTACHMENT_BYTES ? 'ticketing.details.fileTooLarge' : '';
}
export interface Agent { id:number; fullName:string; email:string; roles:string[]; lead:boolean; l2Technician:boolean; specialization?:string; preferredLanguage?:string; openTickets:number; l2OpenTickets:number; active:boolean; resourceTypeId?:number; resourceType?:string; h24:boolean; ticketingAccess:boolean; }
// Projectum resource types and the employees of one type (cascading L2 choice)
export interface ResourceTypeOption { id:number; code:string; label:string; }
export interface EmployeeOption { id:number; fullName:string; email:string; resourceTypeId?:number; resourceType?:string; l2Technician:boolean; specialization?:string; }
export interface MySettings { userId:number; fullName:string; preferredLanguage:string; lead:boolean; staff:boolean; customerId?:number; }

// Customers
export interface Customer { id:number; code:string; name:string; country?:string; town?:string; address?:string; email?:string; phone?:string; contactPerson?:string; active:boolean; sites:number; contacts:number; equipment:number; projects:number; openTickets:number; }
export interface Site { id:number; name:string; address?:string; equipment:number; }
export interface Contact { id:number; fullName:string; jobTitle?:string; email?:string; phone?:string; language?:string; portalUser?:UserSummary; }
export interface Equipment { id:number; typeId?:number; typeName?:string; name:string; serialNumber?:string; note?:string; siteId?:number; siteName?:string; projectId?:number; customerProjectId?:number; projectName?:string; }
// Projectum project of the customer (manual = false, id = Projectum id) or a project added by hand in the Projects tab
export interface CustomerProject { id:number; code?:string; name:string; phase?:string; year?:number; manual:boolean; }
export interface FormOptions { customers:Ref[]; customerId?:number; sites:Site[]; equipment:Equipment[]; projects:CustomerProject[]; }

// Performance dashboard
export interface Breakdown { key:string; count:number; }
export interface AnalyticsTotals { total:number; open:number; resolved:number; escalated:number; overdue:number; avgFirstResponseHours?:number; avgResolutionHours?:number; slaCompliance?:number; }
export interface CustomerStat { id?:number; name:string; total:number; open:number; slaCompliance?:number; }
export interface AgentStat { id:number; name:string; specialization?:string; l2Technician:boolean; assigned:number; open:number; resolved:number; escalated:number; avgFirstResponseHours?:number; slaCompliance?:number; }
export interface TicketAnalytics { from:string; to:string; bucket:'day'|'month'; totals:AnalyticsTotals; byStatus:Breakdown[]; byPriority:Breakdown[]; byCustomer:CustomerStat[]; timeline:Breakdown[]; agents:AgentStat[]; equipmentTickets:EquipmentTicket[]; }
export interface EquipmentTicket { id:number; ticketNumber:string; subject:string; customer?:string; site?:string; equipment:string; serialNumber?:string; status:TicketStatus|null; }

export const LANGUAGES: { code:string; label:string }[] = [
  { code:'en', label:'ticketing.languages.en' }, { code:'fr', label:'ticketing.languages.fr' }, { code:'es', label:'ticketing.languages.es' }, { code:'it', label:'ticketing.languages.it' },
  { code:'pt', label:'ticketing.languages.pt' }, { code:'de', label:'ticketing.languages.de' }, { code:'ar', label:'ticketing.languages.ar' }
];
export const ORIGIN_LABELS: Record<TicketOrigin, string> = { WEB:'ticketing.origins.web', EMAIL:'ticketing.origins.email', PHONE:'ticketing.origins.phone', INTERNAL:'ticketing.origins.internal', OTHER:'ticketing.origins.other' };
