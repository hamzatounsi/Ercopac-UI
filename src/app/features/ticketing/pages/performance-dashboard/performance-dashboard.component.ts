import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AgentStat, Breakdown, Ref, TicketAnalytics } from '../../models/ticket.models';
import { TicketService } from '../../services/ticket.service';
import { TicketSettingsService } from '../../services/ticket-settings.service';

type Period = 'day' | 'week' | 'month' | 'year' | 'custom';
type Tab = 'org' | 'team';
interface Bar { key: string; label: string; count: number; percent: number; }

// Performance dashboard (support leads). Every figure comes from GET /api/tickets/analytics,
// computed by the backend for the tickets created in the chosen period.
@Component({
  selector: 'app-performance-dashboard',
  templateUrl: './performance-dashboard.component.html',
  styleUrls: ['./performance-dashboard.component.scss']
})
export class PerformanceDashboardComponent implements OnInit {
  tab: Tab = 'org';
  period: Period = 'month';
  customFrom = '';
  customTo = '';
  customOpen = false;
  customerId: number | null = null;
  equipmentTypeId: number | null = null;
  serial = '';
  agentId: number | null = null;

  data?: TicketAnalytics;
  customers: Ref[] = [];
  equipmentTypes: Ref[] = [];
  loading = true;
  error = '';

  readonly periods: { key: Period; label: string }[] = [
    { key: 'day', label: 'Today' }, { key: 'week', label: 'This week' }, { key: 'month', label: 'This month' }, { key: 'year', label: 'This year' }
  ];
  private request?: Subscription;

  constructor(private api: TicketService, public labels: TicketSettingsService) {}

  ngOnInit(): void {
    this.api.formOptions(null).subscribe({ next: o => this.customers = o.customers, error: () => this.customers = [] });
    this.labels.equipmentTypes().subscribe({ next: t => this.equipmentTypes = t, error: () => this.equipmentTypes = [] });
    this.load();
  }

  load(): void {
    const range = this.range();
    if (!range) return;
    this.loading = true;
    this.error = '';
    this.request?.unsubscribe();
    this.request = this.labels.analytics({ ...range, customerId: this.customerId, equipmentTypeId: this.equipmentTypeId, serial: this.serial.trim() || null }).subscribe({
      next: d => { this.data = d; this.loading = false; },
      error: e => { this.loading = false; this.error = e.error?.message || 'Performance data could not be loaded.'; }
    });
  }

  setPeriod(p: Period): void { this.period = p; this.customOpen = false; this.load(); }

  applyCustom(): void {
    if (!this.customFrom || !this.customTo) { this.error = 'Choose both a start and an end date.'; return; }
    if (this.customFrom > this.customTo) { this.error = 'The start date must be before the end date.'; return; }
    this.period = 'custom';
    this.load();
  }

  clearFilters(): void { this.customerId = null; this.equipmentTypeId = null; this.serial = ''; this.load(); }
  get filtered(): boolean { return !!(this.customerId || this.equipmentTypeId || this.serial.trim()); }

  get periodLabel(): string {
    if (this.period === 'custom') return `${this.customFrom} → ${this.customTo}`;
    return this.periods.find(p => p.key === this.period)!.label.toLowerCase();
  }

  // ---------- chart data ----------
  get timeline(): Bar[] { return this.bars(this.data?.timeline ?? [], k => this.bucketLabel(k)); }
  get byStatus(): Bar[] { return this.bars(this.data?.byStatus ?? [], k => this.labels.statusLabel(k)).filter(b => b.count); }
  get byPriority(): Bar[] { return this.bars(this.data?.byPriority ?? [], k => this.labels.priorityLabel(k)).filter(b => b.count); }
  get timelineMax(): number { return Math.max(1, ...(this.data?.timeline ?? []).map(b => b.count)); }
  /** Show at most ~12 axis labels whatever the number of buckets. */
  get labelStep(): number { return Math.max(1, Math.ceil((this.data?.timeline.length ?? 0) / 12)); }

  get agents(): AgentStat[] { return this.data?.agents ?? []; }
  get selectedAgent(): AgentStat | undefined { return this.agents.find(a => a.id === this.agentId); }
  get maxAssigned(): number { return Math.max(1, ...this.agents.map(a => a.open)); }
  get teamResolved(): number { return this.agents.reduce((s, a) => s + a.resolved, 0); }
  get teamOpen(): number { return this.agents.reduce((s, a) => s + a.open, 0); }
  get teamSla(): number | null {
    const v = this.agents.map(a => a.slaCompliance).filter((x): x is number => x != null);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  }

  hours(h?: number | null): string {
    if (h == null) return '—';
    if (h < 1) return `${Math.round(h * 60)} min`;
    if (h < 48) return `${h.toFixed(1)} h`;
    return `${(h / 24).toFixed(1)} d`;
  }
  pct(v?: number | null): string { return v == null ? '—' : `${Math.round(v)}%`; }
  slaClass(v?: number | null): string { return v == null ? 'none' : v >= 95 ? 'good' : v >= 85 ? 'warn' : 'bad'; }
  loadClass(open: number): string { const p = open / this.maxAssigned; return p >= .7 ? 'bad' : p >= .4 ? 'warn' : 'good'; }

  private bars(list: Breakdown[], label: (k: string) => string): Bar[] {
    const total = list.reduce((s, b) => s + b.count, 0) || 1;
    return list.map(b => ({ key: b.key, label: label(b.key), count: b.count, percent: b.count / total * 100 }));
  }

  private bucketLabel(key: string): string {
    const d = new Date(key.length === 7 ? key + '-01T00:00:00Z' : key + 'T00:00:00Z');
    return this.data?.bucket === 'month'
      ? d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })
      : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
  }

  /** Start of the chosen calendar period (local time) up to now, or the custom days inclusive. */
  private range(): { from: string; to: string | null } | null {
    const now = new Date();
    let from: Date;
    switch (this.period) {
      case 'day': from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'week': { const dow = (now.getDay() + 6) % 7; from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow); break; }
      case 'month': from = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'year': from = new Date(now.getFullYear(), 0, 1); break;
      case 'custom': {
        if (!this.customFrom || !this.customTo) return null;
        const [fy, fm, fd] = this.customFrom.split('-').map(Number);
        const [ty, tm, td] = this.customTo.split('-').map(Number);
        return { from: new Date(fy, fm - 1, fd).toISOString(), to: new Date(ty, tm - 1, td + 1).toISOString() };
      }
    }
    return { from: from.toISOString(), to: null };
  }
}
