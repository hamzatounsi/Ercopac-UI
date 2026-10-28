import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/config/api.config';
import {
  Attachment, FormOptions, Page, Ticket, TicketActivity, TicketCategory, TicketDetails, TicketMessage, TicketOrigin,
  TicketPriority, TicketStats, TicketStatus, UserSummary
} from '../models/ticket.models';

export interface TicketFilters {
  page?: number; size?: number; sort?: string; search?: string; status?: string; priority?: string; category?: string;
  customerId?: number | null; assigneeId?: number | null; from?: string | null; to?: string | null;
}

export interface NewTicket {
  subject: string; description: string; category: TicketCategory; priority: TicketPriority; origin: TicketOrigin;
  site: string | null; clientUserId: number | null; customerId: number | null; projectId: number | null; equipmentId: number | null; assigneeId: number | null;
}

export interface TicketContext { customerId: number | null; site: string | null; projectId: number | null; equipmentId: number | null; }

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly base = `${API_BASE_URL}/tickets`;

  constructor(private http: HttpClient) {}

  list(filters: TicketFilters): Observable<Page<Ticket>> {
    let p = new HttpParams()
      .set('page', filters.page || 0)
      .set('size', filters.size || 20)
      .set('sort', filters.sort || 'updatedAt,desc');
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && !['page', 'size', 'sort'].includes(k)) p = p.set(k, String(v));
    });
    return this.http.get<Page<Ticket>>(this.base, { params: p });
  }

  /** Support staff of the organisation that a ticket can be assigned to. */
  agents(): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(`${this.base}/agents`);
  }

  /** Messages of a ticket; unlike get() this does not mark the ticket as read. */
  messages(id: number): Observable<TicketMessage[]> {
    return this.http.get<TicketMessage[]>(`${this.base}/${id}/messages`);
  }

  activities(id: number): Observable<TicketActivity[]> {
    return this.http.get<TicketActivity[]>(`${this.base}/${id}/activities`);
  }

  stats(): Observable<TicketStats> {
    return this.http.get<TicketStats>(`${this.base}/statistics`);
  }

  get(id: number): Observable<TicketDetails> {
    return this.http.get<TicketDetails>(`${this.base}/${id}`);
  }

  create(data: NewTicket): Observable<TicketDetails> {
    return this.http.post<TicketDetails>(this.base, data);
  }

  /** Category and origin (null leaves a value unchanged). */
  update(id: number, data: { category?: TicketCategory; origin?: TicketOrigin }, version: number): Observable<TicketDetails> {
    return this.http.patch<TicketDetails>(`${this.base}/${id}`, { ...data, version });
  }

  /** Customer, site, project and equipment; every value is replaced. */
  context(id: number, context: TicketContext, version: number): Observable<TicketDetails> {
    return this.http.patch<TicketDetails>(`${this.base}/${id}/context`, { ...context, version });
  }

  problemStatement(id: number, value: { problem: string; cause: string; solution: string }, version: number): Observable<TicketDetails> {
    return this.http.patch<TicketDetails>(`${this.base}/${id}/problem-statement`, { ...value, version });
  }

  status(id: number, status: TicketStatus, version: number): Observable<TicketDetails> {
    return this.http.patch<TicketDetails>(`${this.base}/${id}/status`, { status, version });
  }

  priority(id: number, priority: TicketPriority, version: number): Observable<TicketDetails> {
    return this.http.patch<TicketDetails>(`${this.base}/${id}/priority`, { priority, version });
  }

  assign(id: number, assigneeId: number | null, version: number): Observable<TicketDetails> {
    return this.http.patch<TicketDetails>(`${this.base}/${id}/assignment`, { assigneeId, version });
  }

  assignL2(id: number, assigneeId: number | null, version: number): Observable<TicketDetails> {
    return this.http.patch<TicketDetails>(`${this.base}/${id}/l2-technician`, { assigneeId, version });
  }

  message(id: number, message: string, internalNote: boolean): Observable<TicketMessage> {
    return this.http.post<TicketMessage>(`${this.base}/${id}/messages`, { message, internalNote });
  }

  close(id: number, version: number): Observable<TicketDetails> {
    return this.http.post<TicketDetails>(`${this.base}/${id}/close`, null, { params: { version } });
  }

  reopen(id: number, version: number): Observable<TicketDetails> {
    return this.http.post<TicketDetails>(`${this.base}/${id}/reopen`, null, { params: { version } });
  }

  upload(id: number, file: File): Observable<Attachment> {
    const f = new FormData();
    f.append('file', file);
    return this.http.post<Attachment>(`${this.base}/${id}/attachments`, f);
  }

  attachmentUrl(ticketId: number, attachmentId: number): string {
    return `${this.base}/${ticketId}/attachments/${attachmentId}`;
  }

  /** Customers the user may file a ticket under and, for the chosen one, its sites, equipment and projects. */
  formOptions(customerId?: number | null): Observable<FormOptions> {
    const params = customerId ? new HttpParams().set('customerId', customerId) : undefined;
    return this.http.get<FormOptions>(`${this.base}/form-options`, { params });
  }

  /** Translation through the organisation's local AI model. */
  translate(text: string, to: string): Observable<string> {
    return this.http.post<{ text: string }>(`${this.base}/translate`, { text, to }).pipe(map(r => r.text));
  }
}
