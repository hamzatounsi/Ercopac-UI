import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { PrioritySetting } from '../../models/ticket.models';
import { TicketSettingsService } from '../../services/ticket-settings.service';
import { TICKETING_LEAD_ROLES } from '../../ticketing-roles';

// Priority levels and their SLA targets (first response in minutes, resolution in hours).
// The targets drive the overdue flag on tickets and the SLA figures of the performance dashboard.
@Component({
  selector: 'app-priorities-settings',
  templateUrl: './priorities-settings.component.html',
  styleUrls: ['./priorities-settings.component.scss']
})
export class PrioritiesSettingsComponent implements OnInit, OnDestroy {
  rows: PrioritySetting[] = [];
  loading = true;
  saving = false;
  submitted = false;
  error = '';
  notice = '';
  readonly isLead = this.auth.hasAnyRole(TICKETING_LEAD_ROLES);
  private saved = '';
  private sub?: Subscription;

  constructor(private settings: TicketSettingsService, private auth: AuthService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.sub?.unsubscribe();
    this.sub = this.settings.refresh().subscribe({
      next: s => { this.apply(s.priorities); this.loading = false; },
      error: e => { this.loading = false; this.error = e.error?.message || 'Priorities could not be loaded.'; }
    });
  }

  get dirty(): boolean { return JSON.stringify(this.rows) !== this.saved; }

  rowError(p: PrioritySetting): string {
    if (!p.label?.trim()) return 'A label is required.';
    if (!(p.firstResponseMinutes >= 1) || !(p.resolutionHours >= 1)) return 'Targets must be at least 1.';
    if (p.firstResponseMinutes > p.resolutionHours * 60) return 'First response must come before resolution.';
    return '';
  }

  /** e.g. 90 → "1 h 30 min", 1440 → "1 day" */
  duration(minutes: number): string {
    if (!minutes) return '—';
    const d = Math.floor(minutes / 1440), h = Math.floor((minutes % 1440) / 60), m = minutes % 60;
    return [d && `${d} day${d > 1 ? 's' : ''}`, h && `${h} h`, m && `${m} min`].filter(Boolean).join(' ');
  }

  reset(): void { this.rows = JSON.parse(this.saved); this.submitted = false; }

  save(): void {
    this.submitted = true;
    if (this.rows.some(r => this.rowError(r))) return;
    this.saving = true;
    this.error = '';
    this.settings.savePriorities(this.rows.map(r => ({ ...r, label: r.label.trim() }))).subscribe({
      next: s => { this.apply(s.priorities); this.saving = false; this.submitted = false; this.flash('Priorities saved'); },
      error: e => { this.saving = false; this.error = e.error?.message || 'Priorities could not be saved.'; }
    });
  }

  private apply(priorities: PrioritySetting[]): void {
    this.rows = priorities.map(x => ({ ...x }));
    this.saved = JSON.stringify(this.rows);
  }

  private flash(text: string): void { this.notice = text; setTimeout(() => this.notice = '', 2500); }
}
