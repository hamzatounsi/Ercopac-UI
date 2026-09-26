import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/config/api.config';
import { Attachment, Page, Ticket, TicketDetails, TicketMessage, TicketPriority, TicketStats, TicketStatus } from '../models/ticket.models';

// =========================================================
// 👇 NOUVEAU : Interfaces pour le Dashboard Performance (Phase 5)
// =========================================================
export interface TeamKpis {
  agentsOnline: number;
  totalAgents: number;
  avgSatisfaction: number;
}

export interface AgentWorkload {
  name: string;
  activeTickets: number;
  status: string;
  capacity: number;
}

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly base = `${API_BASE_URL}/tickets`;
  private readonly analyticsBase = `${API_BASE_URL}/ticketing/analytics`; // 👈 NOUVEAU

  constructor(private http: HttpClient) {}

  // =========================================================
  // MÉTHODES EXISTANTES (Formatées pour la lisibilité)
  // =========================================================
  
  list(filters: any): Observable<Page<Ticket>> {
    let p = new HttpParams()
      .set('page', filters.page || 0)
      .set('size', filters.size || 20)
      .set('sort', filters.sort || 'updatedAt,desc');
      
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && !['page', 'size', 'sort'].includes(k)) {
        p = p.set(k, String(v));
      }
    });
    
    return this.http.get<Page<Ticket>>(this.base, { params: p });
  }

  stats(): Observable<TicketStats> {
    return this.http.get<TicketStats>(`${this.base}/statistics`);
  }

  get(id: number): Observable<TicketDetails> {
    return this.http.get<TicketDetails>(`${this.base}/${id}`);
  }

  create(data: any): Observable<TicketDetails> {
    return this.http.post<TicketDetails>(this.base, data);
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

  // =========================================================
  // 👇 NOUVEAU : Méthodes pour le Dashboard Performance (Phase 5)
  // =========================================================
  
  getTeamKpis(): Observable<TeamKpis> {
    return this.http.get<TeamKpis>(`${this.analyticsBase}/team-kpis`);
  }

  getAgentWorkload(): Observable<AgentWorkload[]> {
    return this.http.get<AgentWorkload[]>(`${this.analyticsBase}/agent-workload`);
  }
}