import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Ticket, TicketActivity, TicketMessage, TicketStatus } from '../../models/ticket.models';
import { TicketService } from '../../services/ticket.service';

interface TicketTimes { ticket: Ticket; firstResponseHours: number | null; resolutionHours: number | null; }
interface StatusBar { status: TicketStatus; count: number; percent: number; }
interface AgentRow { name: string; active: number; resolved: number; total: number; avgFirstResponse: number | null; }

const ACTIVE: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'REOPENED'];
const DONE: TicketStatus[] = ['RESOLVED', 'CLOSED'];
const STATUS_ORDER: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'REOPENED', 'ESCALATED', 'RESOLVED', 'CLOSED', 'CANCELLED'];
const HOUR = 3_600_000;

// All figures are computed in the browser from the ticket list, the messages and the activity history:
// first response = first public reply from someone other than the client,
// resolution = first change to RESOLVED (from the activity history).
@Component({
  selector: 'app-performance-dashboard',
  templateUrl: './performance-dashboard.component.html',
  styleUrls: ['./performance-dashboard.component.scss']
})
export class PerformanceDashboardComponent implements OnInit {
  loading = true;
  error = '';
  period: 'all' | '30' | '7' = 'all';

  private times: TicketTimes[] = [];

  open = 0;
  resolved = 0;
  escalated = 0;
  total = 0;
  avgFirstResponse: number | null = null;
  avgResolution: number | null = null;
  statusBars: StatusBar[] = [];
  agents: AgentRow[] = [];
  maxAgentTotal = 1;

  constructor(private api: TicketService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.list({ page: 0, size: 500, sort: 'createdAt,desc' }).pipe(
      switchMap(page => page.content.length
        ? forkJoin(page.content.map(t => forkJoin({
            messages: this.api.messages(t.id).pipe(catchError(() => of([] as TicketMessage[]))),
            activities: this.api.activities(t.id).pipe(catchError(() => of([] as TicketActivity[])))
          }).pipe(map(r => this.measure(t, r.messages, r.activities)))))
        : of([] as TicketTimes[]))
    ).subscribe({
      next: times => { this.times = times; this.compute(); this.loading = false; },
      error: e => { this.error = e.error?.message || 'Performance data could not be loaded.'; this.loading = false; }
    });
  }

  setPeriod(period: 'all' | '30' | '7'): void {
    this.period = period;
    this.compute();
  }

  formatHours(hours: number | null): string {
    if (hours == null) return '—';
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 48) return `${hours.toFixed(1)} h`;
    return `${(hours / 24).toFixed(1)} d`;
  }

  label(v: string): string { return v.replace(/_/g, ' '); }

  private measure(ticket: Ticket, messages: TicketMessage[], activities: TicketActivity[]): TicketTimes {
    const created = Date.parse(ticket.createdAt);
    const reply = messages.find(m => !m.internalNote && m.sender?.id !== ticket.client?.id);
    const resolvedAt = activities.find(a => a.newValue === 'RESOLVED');
    return {
      ticket,
      firstResponseHours: reply ? Math.max(0, Date.parse(reply.createdAt) - created) / HOUR : null,
      resolutionHours: resolvedAt ? Math.max(0, Date.parse(resolvedAt.createdAt) - created) / HOUR : null
    };
  }

  private compute(): void {
    const since = this.period === 'all' ? 0 : Date.now() - Number(this.period) * 24 * HOUR;
    const rows = this.times.filter(r => Date.parse(r.ticket.createdAt) >= since);
    const tickets = rows.map(r => r.ticket);

    this.total = tickets.length;
    this.open = tickets.filter(t => ACTIVE.includes(t.status)).length;
    this.resolved = tickets.filter(t => DONE.includes(t.status)).length;
    this.escalated = tickets.filter(t => t.status === 'ESCALATED').length;
    this.avgFirstResponse = this.average(rows.map(r => r.firstResponseHours));
    this.avgResolution = this.average(rows.map(r => r.resolutionHours));

    this.statusBars = STATUS_ORDER
      .map(status => ({ status, count: tickets.filter(t => t.status === status).length, percent: 0 }))
      .filter(bar => bar.count > 0 || bar.status !== 'CANCELLED')
      .map(bar => ({ ...bar, percent: this.total ? (bar.count / this.total) * 100 : 0 }));

    const byAgent = new Map<string, TicketTimes[]>();
    rows.forEach(r => {
      const name = r.ticket.assignee?.fullName || 'Unassigned';
      byAgent.set(name, [...(byAgent.get(name) || []), r]);
    });
    this.agents = [...byAgent.entries()]
      .map(([name, list]) => ({
        name,
        active: list.filter(r => r.ticket.status !== 'CANCELLED' && !DONE.includes(r.ticket.status)).length,
        resolved: list.filter(r => DONE.includes(r.ticket.status)).length,
        total: list.length,
        avgFirstResponse: this.average(list.map(r => r.firstResponseHours))
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    this.maxAgentTotal = Math.max(1, ...this.agents.map(a => a.total));
  }

  private average(values: (number | null)[]): number | null {
    const known = values.filter((v): v is number => v != null);
    return known.length ? known.reduce((sum, v) => sum + v, 0) / known.length : null;
  }
}
