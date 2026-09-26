import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

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
export class TicketAnalyticsService {
  private analyticsUrl = `${environment.apiUrl}/ticketing/analytics`;
  private ticketsUrl = `${environment.apiUrl}/tickets`;

  constructor(private http: HttpClient) {}

  // Utilise ton endpoint EXISTANT pour les stats de base
  getBasicStats(): Observable<any> {
    return this.http.get<any>(`${this.ticketsUrl}/statistics`);
  }

  // Utilise le NOUVEAU endpoint pour les métriques avancées
  getTeamKpis(): Observable<TeamKpis> {
    return this.http.get<TeamKpis>(`${this.analyticsUrl}/team-kpis`);
  }

  getAgentWorkload(): Observable<AgentWorkload[]> {
    return this.http.get<AgentWorkload[]>(`${this.analyticsUrl}/agent-workload`);
  }
}