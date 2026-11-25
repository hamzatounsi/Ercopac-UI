import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { Ref, Ticket, TicketCategory, TicketPriority, TicketStats, TicketStatus } from '../../models/ticket.models';
import { TicketFilters, TicketService } from '../../services/ticket.service';
import { TicketSettingsService } from '../../services/ticket-settings.service';
import { TicketStatusService } from '../../services/ticket-status.service';
import { TICKETING_LEAD_ROLES, TICKETING_STAFF_ROLES } from '../../ticketing-roles';
import { I18nService } from 'src/app/core/i18n/i18n.service';

type Period = 'all' | 'day' | 'week' | 'month' | 'year';
const PERIOD_DAYS: Record<Exclude<Period, 'all'>, number> = { day: 1, week: 7, month: 30, year: 365 };

// Tickets queue. Support staff get the full queue with filters and the status pipeline;
// clients get "My tickets" as cards (the backend only returns their own tickets).
@Component({
  selector: 'app-ticket-dashboard-page',
  templateUrl: './ticket-dashboard-page.component.html',
  styleUrls: ['./ticket-dashboard-page.component.scss']
})
export class TicketDashboardPageComponent implements OnInit, OnDestroy {
  readonly isStaff = this.auth.hasAnyRole(TICKETING_STAFF_ROLES);
  readonly isLead = this.auth.hasAnyRole(TICKETING_LEAD_ROLES);
  /** Pipeline: the active statuses of Ticketing settings, in display order. */
  get pipelineStatuses(): TicketStatus[] { const a = this.statuses.active; if (this.pipeCache.key !== a) this.pipeCache = { key: a, codes: a.map(s => s.code) }; return this.pipeCache.codes; }
  private pipeCache: { key: unknown; codes: TicketStatus[] } = { key: undefined, codes: [] };
  readonly priorities: TicketPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  get categories(): TicketCategory[] { return this.labels.categoryCodes; }
  // Server-side sort; default = ticket id so editing a ticket never moves it in the list
  sortField = 'id';
  readonly sortColumns = [
    { f: 'id', l: 'ticketing.list.id' }, { f: 'subject', l: 'ticketing.list.title' }, { f: 'customer', l: 'ticketing.list.customer' },
    { f: 'projectNumber', l: 'ticketing.list.orderNumber' }, { f: 'site', l: 'ticketing.list.site' }, { f: 'status', l: 'common.status' }, { f: 'priority', l: 'ticketing.list.priority' }
  ];
  sortDir: 'asc' | 'desc' = 'desc';
  readonly periods: { key: Period; label: string }[] = [
    { key: 'all', label: 'ticketing.list.periodAll' }, { key: 'day', label: 'ticketing.list.periodDay' }, { key: 'week', label: 'ticketing.list.periodWeek' }, { key: 'month', label: 'ticketing.list.periodMonth' }, { key: 'year', label: 'ticketing.list.periodYear' }
  ];

  tickets: Ticket[] = [];
  stats?: TicketStats;
  customers: Ref[] = [];
  loading = true;
  error = '';
  total = 0;
  totalPages = 0;

  period: Period = 'all';
  mineOnly = !this.isLead && this.isStaff;
  filters = { page: 0, size: 20, search: '', status: '', priority: '', category: '', customerId: null as number | null };

  private readonly searchInput = new Subject<string>();
  private searchSub?: Subscription;

  constructor(private i18n: I18nService,
    private auth: AuthService, private api: TicketService, public labels: TicketSettingsService, private router: Router,
    private statuses: TicketStatusService) {}

  ngOnInit(): void {
    this.statuses.load();
    this.searchSub = this.searchInput.pipe(debounceTime(300)).subscribe(() => this.reload());
    this.load();
    this.loadStats();
    if (this.isStaff) this.api.formOptions().subscribe({ next: o => this.customers = o.customers, error: () => this.customers = [] });
  }

  ngOnDestroy(): void { this.searchSub?.unsubscribe(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.list(this.query()).subscribe({
      next: r => { this.tickets = r.content; this.total = r.totalElements; this.totalPages = r.totalPages; this.loading = false; },
      error: e => { this.error = this.i18n.error(e, 'ticketing.list.ticketsCouldNotLoaded'); this.loading = false; }
    });
  }

  loadStats(): void {
    this.api.stats().subscribe({ next: s => this.stats = s, error: () => this.stats = undefined });
  }

  reload(): void { this.filters.page = 0; this.load(); }
  onSearch(): void { this.searchInput.next(this.filters.search); }
  setPeriod(p: Period): void { this.period = p; this.reload(); }
  toggleStatus(s: TicketStatus): void { this.filters.status = this.filters.status === s ? '' : s; this.reload(); }
  setMineOnly(v: boolean): void { this.mineOnly = v; this.reload(); }
  go(page: number): void { if (page < 0 || page >= this.totalPages) return; this.filters.page = page; this.load(); }

  clear(): void {
    this.filters = { page: 0, size: 20, search: '', status: '', priority: '', category: '', customerId: null };
    this.period = 'all';
    this.sortField = 'id';
    this.sortDir = 'desc';
    this.load();
  }

  get hasFilters(): boolean {
    const f = this.filters;
    return !!(f.search || f.status || f.priority || f.category || f.customerId || this.period !== 'all');
  }

  statCount(s: TicketStatus): number { return this.stats?.byStatus.find(b => b.key === s)?.count ?? 0; }

  get myTotal(): number { return this.stats ? this.stats.open + this.stats.closed : 0; }

  sortBy(field: string): void {
    if (this.sortField === field) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortField = field; this.sortDir = field === 'id' || field === 'createdAt' || field === 'updatedAt' ? 'desc' : 'asc'; }
    this.reload();
  }
  sortIcon(field: string): string { return this.sortField !== field ? 'unfold_more' : this.sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'; }
  ariaSort(field: string): string { return this.sortField !== field ? 'none' : this.sortDir === 'asc' ? 'ascending' : 'descending'; }

  open(t: Ticket): void { void this.router.navigate(['/tickets', t.id]); }
  newTicket(): void { void this.router.navigate(['/tickets/new']); }
  shortName(name?: string): string { if (!name) return ''; const p = name.split(/\s+/); return p.length > 1 ? `${p[0]} ${p[1][0]}.` : name; }
  label(category: string): string { return this.labels.categoryLabel(category); }

  private query(): TicketFilters {
    const from = this.period === 'all' ? null : new Date(Date.now() - PERIOD_DAYS[this.period] * 86_400_000).toISOString();
    return {
      ...this.filters,
      sort: `${this.sortField},${this.sortDir}`,
      from,
      assigneeId: this.isStaff && this.mineOnly ? this.auth.getCurrentUserId() : null
    };
  }
}
