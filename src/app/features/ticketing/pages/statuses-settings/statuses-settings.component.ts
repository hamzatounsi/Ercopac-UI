import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { StatusColor, StatusSetting } from '../../models/ticket.models';
import { TicketSettingsService } from '../../services/ticket-settings.service';
import { TICKETING_LEAD_ROLES } from '../../ticketing-roles';

// Wording and colour of each ticket status. The lifecycle itself (which statuses exist and the
// allowed transitions) is fixed by the backend, so statuses cannot be added or removed.
@Component({
  selector: 'app-statuses-settings',
  templateUrl: './statuses-settings.component.html',
  styleUrls: ['./statuses-settings.component.scss']
})
export class StatusesSettingsComponent implements OnInit, OnDestroy {
  rows: StatusSetting[] = [];
  loading = true;
  saving = false;
  submitted = false;
  error = '';
  notice = '';
  readonly colors: StatusColor[] = ['blue', 'amber', 'red', 'green', 'gray', 'purple', 'coral'];
  readonly isLead = this.auth.hasAnyRole(TICKETING_LEAD_ROLES);
  private saved = '';
  private sub?: Subscription;

  constructor(private settings: TicketSettingsService, private auth: AuthService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.sub?.unsubscribe();
    this.sub = this.settings.refresh().subscribe({
      next: s => {
        this.rows = s.statuses.map(x => ({ ...x }));
        this.saved = JSON.stringify(this.rows);
        this.loading = false;
      },
      error: e => { this.loading = false; this.error = e.error?.message || 'Statuses could not be loaded.'; }
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  get dirty(): boolean { return JSON.stringify(this.rows) !== this.saved; }
  get invalid(): boolean { return this.rows.some(r => !r.label.trim()); }

  reset(): void { this.rows = JSON.parse(this.saved); this.submitted = false; }

  save(): void {
    this.submitted = true;
    if (this.invalid) return;
    this.saving = true;
    this.error = '';
    this.settings.saveStatuses(this.rows.map(r => ({ ...r, label: r.label.trim(), description: r.description?.trim() || undefined }))).subscribe({
      next: s => {
        this.rows = s.statuses.map(x => ({ ...x }));
        this.saved = JSON.stringify(this.rows);
        this.saving = false;
        this.submitted = false;
        this.flash('Statuses saved');
      },
      error: e => { this.saving = false; this.error = e.error?.message || 'Statuses could not be saved.'; }
    });
  }

  private flash(text: string): void { this.notice = text; setTimeout(() => this.notice = '', 2500); }
}
