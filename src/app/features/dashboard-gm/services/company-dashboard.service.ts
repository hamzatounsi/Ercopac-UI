import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/config/api.config';

export interface CompanyDashboard {
  organisationName: string; totalProjects: number; activeProjects: number; onScheduleProjects: number;
  atRiskProjects: number; delayedProjects: number; averageProgress: number; totalBudget: number;
  actualCost: number; forecastCost: number; openRisks: number; highRisks: number;
  openActions: number; overdueActions: number;
  projects: CompanyProject[]; topRisks: CompanyRisk[]; alerts: CompanyAlert[];
}
export interface CompanyProject { name: string; code: string; manager: string | null; phase: string; progress: number; health: string; budget: number | null; }
export interface CompanyRisk { description: string; project: string; impact: string; probability: number | null; state: string; }
export interface CompanyAlert { severity: 'critical' | 'warning'; title: string; detail: string; }
export interface RevenueForecast { year: number; totalActual: number; totalForecast: number; totalBudget: number; variance: number; months: RevenueMonth[]; projects: RevenueProject[]; }
export interface RevenueMonth { key: string; label: string; forecast: number; }
export interface RevenueProject { id: number; name: string; code: string; status: string; actual: number; budget: number; forecast: number; monthlyForecast: number[]; }

@Injectable({ providedIn: 'root' })
export class CompanyDashboardService {
  constructor(private readonly http: HttpClient) {}
  getDashboard(): Observable<CompanyDashboard> { return this.http.get<CompanyDashboard>(`${API_BASE_URL}/company-dashboard`); }
  getRevenueForecast(year: number): Observable<RevenueForecast> { return this.http.get<RevenueForecast>(`${API_BASE_URL}/company-dashboard/project-performance/revenue-forecast`, { params: { year } }); }
}
