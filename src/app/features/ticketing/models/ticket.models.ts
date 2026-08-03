export type TicketStatus = 'OPEN'|'IN_PROGRESS'|'ESCALATED'|'RESOLVED'|'CLOSED'|'REOPENED'|'CANCELLED';
export type TicketPriority = 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
export type TicketCategory = 'SOFTWARE'|'ACCESS'|'PERFORMANCE'|'BILLING'|'DATA'|'INTEGRATION'|'FEATURE_REQUEST'|'OTHER';
export interface UserSummary { id:number; fullName:string; email:string; role:string; }
export interface Ticket { id:number; ticketNumber:string; subject:string; organisationId:number; organisationName:string; status:TicketStatus; priority:TicketPriority; category:TicketCategory; site?:string; client?:UserSummary; assignee?:UserSummary; createdAt:string; updatedAt:string; lastMessageAt?:string; unreadCount:number; }
export interface TicketMessage { id:number; message:string; messageType:string; internalNote:boolean; sender:UserSummary; createdAt:string; }
export interface TicketActivity { id:number; activityType:string; description:string; previousValue?:string; newValue?:string; actor?:UserSummary; createdAt:string; }
export interface Attachment { id:number; originalFileName:string; contentType:string; fileSize:number; uploadedBy:UserSummary; uploadedAt:string; }
export interface TicketDetails { ticket:Ticket; description:string; origin:string; escalationLevel:number; resolvedAt?:string; closedAt?:string; version:number; messages:TicketMessage[]; activities:TicketActivity[]; attachments:Attachment[]; canManage:boolean; canClose:boolean; }
export interface TicketStats { open:number; inProgress:number; escalated:number; resolved:number; closed:number; createdToday:number; overdue:number; averageResolutionHours:number; }
export interface Page<T> { content:T[]; totalElements:number; totalPages:number; number:number; }
