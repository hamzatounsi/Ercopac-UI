import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/config/api.config';
import {
  Agent, Contact, Customer, CustomerProject, Equipment, MySettings, PrioritySetting, Ref, Site, StatusColor,
  StatusSetting, TicketAnalytics, TicketPriority, TicketSettings, TicketStatus, UserSummary
} from '../models/ticket.models';

const DEFAULT_COLORS: Record<TicketStatus, StatusColor> = {
  OPEN: 'blue', IN_PROGRESS: 'amber', ESCALATED: 'red', RESOLVED: 'green', CLOSED: 'gray', REOPENED: 'purple', CANCELLED: 'gray'
};

// Ticketing settings, customers and the performance dashboard.
// Status and priority wording is loaded once and shared by every page through label()/color() helpers.
@Injectable({ providedIn: 'root' })
export class TicketSettingsService {
  private readonly base = `${API_BASE_URL}/tickets`;
  private readonly settingsSource = new BehaviorSubject<TicketSettings | null>(null);
  readonly settings$ = this.settingsSource.asObservable();
  private requested = false;

  constructor(private http: HttpClient) {}

  /** Loads the status and priority settings once (call again with force after a change). */
  load(force = false): void {
    if (this.requested && !force) return;
    this.requested = true;
    this.refresh().subscribe({ error: () => { this.requested = false; } });
  }

  /** Fetches the current settings and shares them with every page. */
  refresh(): Observable<TicketSettings> {
    return this.http.get<TicketSettings>(`${this.base}/settings`).pipe(tap(s => this.settingsSource.next(s)));
  }

  statusLabel(status: TicketStatus | string): string {
    return this.settingsSource.value?.statuses.find(s => s.status === status)?.label ?? humanize(status);
  }

  statusColor(status: TicketStatus | string): StatusColor {
    return this.settingsSource.value?.statuses.find(s => s.status === status)?.color ?? DEFAULT_COLORS[status as TicketStatus] ?? 'gray';
  }

  priorityLabel(priority: TicketPriority | string): string {
    return this.settingsSource.value?.priorities.find(p => p.priority === priority)?.label ?? humanize(priority);
  }

  saveStatuses(statuses: StatusSetting[]): Observable<TicketSettings> {
    return this.http.put<TicketSettings>(`${this.base}/settings/statuses`, statuses).pipe(tap(s => this.settingsSource.next(s)));
  }

  savePriorities(priorities: PrioritySetting[]): Observable<TicketSettings> {
    return this.http.put<TicketSettings>(`${this.base}/settings/priorities`, priorities).pipe(tap(s => this.settingsSource.next(s)));
  }

  agents(): Observable<Agent[]> { return this.http.get<Agent[]>(`${this.base}/settings/agents`); }
  updateAgent(id: number, profile: { l2Technician: boolean; specialization: string | null; preferredLanguage: string | null }): Observable<Agent> {
    return this.http.put<Agent>(`${this.base}/settings/agents/${id}`, profile);
  }

  me(): Observable<MySettings> { return this.http.get<MySettings>(`${this.base}/settings/me`); }
  setMyLanguage(language: string): Observable<MySettings> { return this.http.put<MySettings>(`${this.base}/settings/me/language`, { language }); }

  analytics(filter: { from?: string | null; to?: string | null; customerId?: number | null; equipmentTypeId?: number | null; serial?: string | null }): Observable<TicketAnalytics> {
    let p = new HttpParams();
    for (const [key, value] of Object.entries(filter)) if (value != null && value !== '') p = p.set(key, value);
    return this.http.get<TicketAnalytics>(`${this.base}/analytics`, { params: p });
  }

  // Customers
  customers(): Observable<Customer[]> { return this.http.get<Customer[]>(`${this.base}/customers`); }
  createCustomer(c: Partial<Customer>): Observable<Customer> { return this.http.post<Customer>(`${this.base}/customers`, c); }
  updateCustomer(id: number, c: Partial<Customer>): Observable<Customer> { return this.http.put<Customer>(`${this.base}/customers/${id}`, c); }

  sites(customerId: number): Observable<Site[]> { return this.http.get<Site[]>(`${this.base}/customers/${customerId}/sites`); }
  saveSite(customerId: number, site: Partial<Site>): Observable<Site> {
    return site.id ? this.http.put<Site>(`${this.base}/customers/${customerId}/sites/${site.id}`, site) : this.http.post<Site>(`${this.base}/customers/${customerId}/sites`, site);
  }
  deleteSite(customerId: number, id: number): Observable<void> { return this.http.delete<void>(`${this.base}/customers/${customerId}/sites/${id}`); }

  contacts(customerId: number): Observable<Contact[]> { return this.http.get<Contact[]>(`${this.base}/customers/${customerId}/contacts`); }
  saveContact(customerId: number, contact: Partial<Contact> & { portalUserId?: number | null }): Observable<Contact> {
    return contact.id ? this.http.put<Contact>(`${this.base}/customers/${customerId}/contacts/${contact.id}`, contact) : this.http.post<Contact>(`${this.base}/customers/${customerId}/contacts`, contact);
  }
  deleteContact(customerId: number, id: number): Observable<void> { return this.http.delete<void>(`${this.base}/customers/${customerId}/contacts/${id}`); }

  equipment(customerId: number): Observable<Equipment[]> { return this.http.get<Equipment[]>(`${this.base}/customers/${customerId}/equipment`); }
  saveEquipment(customerId: number, item: Partial<Equipment>): Observable<Equipment> {
    return item.id ? this.http.put<Equipment>(`${this.base}/customers/${customerId}/equipment/${item.id}`, item) : this.http.post<Equipment>(`${this.base}/customers/${customerId}/equipment`, item);
  }
  deleteEquipment(customerId: number, id: number): Observable<void> { return this.http.delete<void>(`${this.base}/customers/${customerId}/equipment/${id}`); }

  projects(customerId: number): Observable<CustomerProject[]> { return this.http.get<CustomerProject[]>(`${this.base}/customers/${customerId}/projects`); }
  equipmentTypes(): Observable<Ref[]> { return this.http.get<Ref[]>(`${this.base}/equipment-types`); }
  portalUsers(): Observable<UserSummary[]> { return this.http.get<UserSummary[]>(`${this.base}/portal-users`); }
}

export function humanize(v: string): string {
  return (v || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}
