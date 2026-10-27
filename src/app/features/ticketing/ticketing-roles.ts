// Support staff of the Ticketing app; must match TicketService.SUPPORT_ROLES and SecurityConfig.TICKET_ROLES in the backend
export const TICKETING_STAFF_ROLES = ['SALES_MANAGER_LEAD', 'H24', 'H24_LEAD'];

// CLIENT keeps the client portal (own tickets only)
export const TICKETING_ROLES = [...TICKETING_STAFF_ROLES, 'CLIENT'];
