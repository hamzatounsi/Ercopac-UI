import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, shareReplay, tap } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/config/api.config';
import {
  AccountRequest, Agent, CategorySetting, Contact, CustomStatus, ImportResult, ImportRow, SYSTEM_CATEGORIES, Customer, CustomerProject, EmployeeOption, Equipment, MySettings, PrioritySetting, Ref, ResourceTypeOption, Site, StatusColor,
  StatusSetting, TicketAnalytics, TicketPriority, TicketSettings, TicketStatus, UserSummary
} from '../models/ticket.models';

const NO_CUSTOM_STATUSES: CustomStatus[] = [];
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
  private resourceTypes$?: Observable<ResourceTypeOption[]>;

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

  /** Categories offered on tickets: active ones from settings (system categories until the settings are loaded).
   *  Cached per settings value: templates bind these in *ngFor, and a new array on every check breaks change detection. */
  get categories(): CategorySetting[] { this.refreshCategoryCache(); return this.categoryCache; }
  /** Codes of the categories above (same caching). */
  get categoryCodes(): string[] { this.refreshCategoryCache(); return this.categoryCodeCache; }
  private categoryCacheKey: unknown = undefined;
  private categoryCache: CategorySetting[] = [];
  private categoryCodeCache: string[] = [];
  private refreshCategoryCache(): void {
    const loaded = this.settingsSource.value?.categories ?? null;
    if (this.categoryCacheKey === loaded) return;
    this.categoryCacheKey = loaded;
    this.categoryCache = loaded?.length ? loaded.filter(c => c.active) : SYSTEM_CATEGORIES.map((code, i) => ({ id: -i - 1, code, label: humanize(code), system: true, active: true, ticketCount: 0 }));
    this.categoryCodeCache = this.categoryCache.map(c => c.code);
  }

  /** Organisation statuses mapped onto a lifecycle status. */
  get customStatuses(): CustomStatus[] { return this.settingsSource.value?.customStatuses ?? NO_CUSTOM_STATUSES; }

  categoryLabel(code: string | null | undefined): string {
    if (!code) return '';
    return this.settingsSource.value?.categories?.find(c => c.code === code)?.label ?? humanize(code);
  }

  /** Label and colour shown for a ticket: its custom status when it has one, else its lifecycle status. */
  ticketStatusLabel(t: { status: TicketStatus; customStatus?: { label: string } | null }): string { return t.customStatus?.label || this.statusLabel(t.status); }
  ticketStatusColor(t: { status: TicketStatus; customStatus?: { color: StatusColor } | null }): StatusColor { return t.customStatus?.color || this.statusColor(t.status); }

  createCategory(c: { code?: string | null; label: string; active?: boolean }): Observable<CategorySetting> { return this.http.post<CategorySetting>(`${this.base}/settings/categories`, c); }
  updateCategory(id: number, c: { label: string; active?: boolean }): Observable<CategorySetting> { return this.http.put<CategorySetting>(`${this.base}/settings/categories/${id}`, c); }
  deleteCategory(id: number, reassignTo?: string | null): Observable<void> {
    const params = reassignTo ? new HttpParams().set('reassignTo', reassignTo) : undefined;
    return this.http.delete<void>(`${this.base}/settings/categories/${id}`, { params });
  }
  saveCustomStatus(s: Partial<CustomStatus>): Observable<CustomStatus> {
    return s.id ? this.http.put<CustomStatus>(`${this.base}/settings/custom-statuses/${s.id}`, s) : this.http.post<CustomStatus>(`${this.base}/settings/custom-statuses`, s);
  }
  deleteCustomStatus(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/settings/custom-statuses/${id}`); }

  /** New H24 agent / lead or L2 technician account in the organisation (support leads). */
  createAccount(request: AccountRequest): Observable<Agent> { return this.http.post<Agent>(`${this.base}/settings/accounts`, request); }

  /** Import of historical customers and orders; dryRun previews without saving. */
  importCustomers(rows: ImportRow[], dryRun: boolean): Observable<ImportResult> { return this.http.post<ImportResult>(`${this.base}/customers/import`, { rows, dryRun }); }

  priorityLabel(priority: TicketPriority | string): string {
    return this.settingsSource.value?.priorities.find(p => p.priority === priority)?.label ?? humanize(priority);
  }

  saveStatuses(statuses: StatusSetting[]): Observable<TicketSettings> {
    return this.http.put<TicketSettings>(`${this.base}/settings/statuses`, statuses).pipe(tap(s => this.settingsSource.next(s)));
  }

  savePriorities(priorities: PrioritySetting[]): Observable<TicketSettings> {
    return this.http.put<TicketSettings>(`${this.base}/settings/priorities`, priorities).pipe(tap(s => this.settingsSource.next(s)));
  }

  /** Support team and L2 technicians; group 'H24' returns the H24 configuration list (H24 role or H24 resource type). */
  agents(group?: 'H24'): Observable<Agent[]> {
    const params = group ? new HttpParams().set('group', group) : undefined;
    return this.http.get<Agent[]>(`${this.base}/settings/agents`, { params });
  }

  /** Active Projectum resource types, loaded once per session (a failed request is retried next time). */
  resourceTypes(): Observable<ResourceTypeOption[]> {
    if (!this.resourceTypes$) {
      this.resourceTypes$ = this.http.get<ResourceTypeOption[]>(`${this.base}/resource-types`).pipe(
        tap({ error: () => this.resourceTypes$ = undefined }), shareReplay(1));
    }
    return this.resourceTypes$;
  }

  /** Employees of one resource type, filtered by the backend; l2Only keeps the L2 technicians. */
  employees(resourceTypeId: number, l2Only = false): Observable<EmployeeOption[]> {
    return this.http.get<EmployeeOption[]>(`${this.base}/employees`, { params: new HttpParams().set('resourceTypeId', resourceTypeId).set('l2Only', l2Only) });
  }
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
  saveEquipment(customerId: number, item: Partial<Equipment> & { projectId?: number | null; customerProjectId?: number | null }): Observable<Equipment> {
    return item.id ? this.http.put<Equipment>(`${this.base}/customers/${customerId}/equipment/${item.id}`, item) : this.http.post<Equipment>(`${this.base}/customers/${customerId}/equipment`, item);
  }
  deleteEquipment(customerId: number, id: number): Observable<void> { return this.http.delete<void>(`${this.base}/customers/${customerId}/equipment/${id}`); }

  projects(customerId: number): Observable<CustomerProject[]> { return this.http.get<CustomerProject[]>(`${this.base}/customers/${customerId}/projects`); }
  saveManualProject(customerId: number, project: { id?: number; name: string; projectNumber: string | null; year: number | null }): Observable<CustomerProject> {
    return project.id ? this.http.put<CustomerProject>(`${this.base}/customers/${customerId}/projects/${project.id}`, project) : this.http.post<CustomerProject>(`${this.base}/customers/${customerId}/projects`, project);
  }
  deleteManualProject(customerId: number, id: number): Observable<void> { return this.http.delete<void>(`${this.base}/customers/${customerId}/projects/${id}`); }
  equipmentTypes(): Observable<Ref[]> { return this.http.get<Ref[]>(`${this.base}/equipment-types`); }
  portalUsers(): Observable<UserSummary[]> { return this.http.get<UserSummary[]>(`${this.base}/portal-users`); }
}

export function humanize(v: string): string {
  return (v || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}
