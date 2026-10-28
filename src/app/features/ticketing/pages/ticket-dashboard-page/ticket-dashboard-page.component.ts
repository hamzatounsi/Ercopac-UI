import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { Ref, Ticket, TicketCategory, TicketPriority, TicketStats, TicketStatus } from '../../models/ticket.models';
import { TicketFilters, TicketService } from '../../services/ticket.service';
import { TicketSettingsService } from '../../services/ticket-settings.service';
import { TICKETING_LEAD_ROLES, TICKETING_STAFF_ROLES } from '../../ticketing-roles';

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
  readonly pipelineStatuses: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'];
  readonly statuses: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'REOPENED', 'RESOLVED', 'CLOSED', 'CANCELLED'];
  readonly priorities: TicketPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  readonly categories: TicketCategory[] = ['SOFTWARE', 'ACCESS', 'PERFORMANCE', 'BILLING', 'DATA', 'INTEGRATION', 'FEATURE_REQUEST', 'OTHER'];
  readonly periods: { key: Period; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'day', label: 'Day' }, { key: 'week', label: 'Week' }, { key: 'month', label: 'Month' }, { key: 'year', label: 'Year' }
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

  constructor(private auth: AuthService, private api: TicketService, public labels: TicketSettingsService, private router: Router) {}

  ngOnInit(): void {
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
      error: e => { this.error = e.error?.message || 'Tickets could not be loaded.'; this.loading = false; }
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
    this.load();
  }

  get hasFilters(): boolean {
    const f = this.filters;
    return !!(f.search || f.status || f.priority || f.category || f.customerId || this.period !== 'all');
  }

  statCount(s: TicketStatus): number {
    if (!this.stats) return 0;
    switch (s) {
      case 'OPEN': return this.stats.open;
      case 'IN_PROGRESS': return this.stats.inProgress;
      case 'ESCALATED': return this.stats.escalated;
      case 'RESOLVED': return this.stats.resolved;
      case 'CLOSED': return this.stats.closed;
      default: return 0;
    }
  }

  get myTotal(): number { return this.stats ? this.stats.open + this.stats.inProgress + this.stats.escalated + this.stats.resolved + this.stats.closed : 0; }

  open(t: Ticket): void { void this.router.navigate(['/tickets', t.id]); }
  newTicket(): void { void this.router.navigate(['/tickets/new']); }
  shortName(name?: string): string { if (!name) return ''; const p = name.split(/\s+/); return p.length > 1 ? `${p[0]} ${p[1][0]}.` : name; }
  label(v: string): string { return v.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()); }

  private query(): TicketFilters {
    const from = this.period === 'all' ? null : new Date(Date.now() - PERIOD_DAYS[this.period] * 86_400_000).toISOString();
    return {
      ...this.filters,
      sort: 'updatedAt,desc',
      from,
      assigneeId: this.isStaff && this.mineOnly ? this.auth.getCurrentUserId() : null
    };
  }
}
