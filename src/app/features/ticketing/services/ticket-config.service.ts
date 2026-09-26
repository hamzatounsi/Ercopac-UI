import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// ==========================================
// INTERFACES
// ==========================================

export interface TicketStatusConfig {
  id: number;
  status: string;
  label: string;
  description: string;
  displayOrder: number;
  active: boolean;
  slaTrigger: string;
}

export interface TicketPriorityConfig {
  id: number;
  priority: string;
  label: string;
  firstResponseSlaHours: number;
  resolutionSlaHours: number;
  active: boolean;
}

export interface AppUser {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
  organisation?: { id: number; name: string };
  preferredLanguage?: string;
  specialization?: string;
  agentStatus?: string;
  isL2Technician?: boolean;
}

// 👇 AJOUTS NÉCESSAIRES POUR LA PHASE 4
export interface Project {
  id: number;
  name: string;
  code?: string;
  organisation?: { id: number; name: string };
}

export interface EquipmentType {
  id: number;
  name: string;
  code?: string;
  icon?: string;
  active: boolean;
}

// ==========================================
// SERVICE
// ==========================================

@Injectable({ providedIn: 'root' })
export class TicketConfigService {
  private apiUrl = `${environment.apiUrl}/platform-settings`;

  constructor(private http: HttpClient) {}

  // ---------- STATUSES & PRIORITIES ----------
  
  getStatuses(): Observable<TicketStatusConfig[]> {
    return this.http.get<TicketStatusConfig[]>(`${this.apiUrl}/statuses`);
  }

  updateStatus(id: number, data: any): Observable<TicketStatusConfig> {
    return this.http.put<TicketStatusConfig>(`${this.apiUrl}/statuses/${id}`, data);
  }

  getPriorities(): Observable<TicketPriorityConfig[]> {
    return this.http.get<TicketPriorityConfig[]>(`${this.apiUrl}/priorities`);
  }

  updatePriority(id: number, data: any): Observable<TicketPriorityConfig> {
    return this.http.put<TicketPriorityConfig>(`${this.apiUrl}/priorities/${id}`, data);
  }

  // ---------- USERS SETTINGS (Phase 3) ----------
  
  getCustomers(): Observable<AppUser[]> {
    return this.http.get<AppUser[]>(`${this.apiUrl}/users/customers`);
  }

  getH24Agents(): Observable<AppUser[]> {
    return this.http.get<AppUser[]>(`${this.apiUrl}/users/h24-agents`);
  }

  getL2Technicians(): Observable<AppUser[]> {
    return this.http.get<AppUser[]>(`${this.apiUrl}/users/l2-technicians`);
  }
  
  // ---------- ASSETS: PROJECTS (Phase 4) ----------
  
  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/assets/projects`);
  }

  createProject(project: Project): Observable<Project> {
    return this.http.post<Project>(`${this.apiUrl}/assets/projects`, project);
  }

  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/assets/projects/${id}`);
  }

  // ---------- ASSETS: EQUIPMENT (Phase 4) ----------
  
  getEquipment(): Observable<EquipmentType[]> {
    return this.http.get<EquipmentType[]>(`${this.apiUrl}/assets/equipment`);
  }

  createEquipment(equipment: EquipmentType): Observable<EquipmentType> {
    return this.http.post<EquipmentType>(`${this.apiUrl}/assets/equipment`, equipment);
  }

  updateEquipment(id: number, equipment: EquipmentType): Observable<EquipmentType> {
    return this.http.put<EquipmentType>(`${this.apiUrl}/assets/equipment/${id}`, equipment);
  }

  deleteEquipment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/assets/equipment/${id}`);
  }
}