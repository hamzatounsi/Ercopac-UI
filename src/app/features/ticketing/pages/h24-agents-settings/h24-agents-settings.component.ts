import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth/auth.service';
import { Agent, LANGUAGES } from '../../models/ticket.models';
import { TicketSettingsService } from '../../services/ticket-settings.service';
import { TICKETING_LEAD_ROLES } from '../../ticketing-roles';

// Support team (H24 agents and leads) with their workload; leads edit specialisation, language and the L2 flag.
// Accounts themselves are created in the admin user management.
@Component({
  selector: 'app-h24-agents-settings',
  templateUrl: './h24-agents-settings.component.html',
  styleUrls: ['./h24-agents-settings.component.scss']
})
export class H24AgentsSettingsComponent implements OnInit {
  agents: Agent[] = [];
  loading = true;
  error = '';
  notice = '';
  saving = false;
  editing?: Agent;
  form = { specialization: '', preferredLanguage: 'en', l2Technician: false };
  readonly languages = LANGUAGES;
  readonly isLead = this.auth.hasAnyRole(TICKETING_LEAD_ROLES);

  constructor(private settings: TicketSettingsService, private auth: AuthService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.settings.agents().subscribe({
      next: a => { this.agents = a; this.loading = false; },
      error: e => { this.error = e.error?.message || 'The support team could not be loaded.'; this.loading = false; }
    });
  }

  open(a: Agent): void {
    if (!this.isLead) return;
    this.editing = a;
    this.form = { specialization: a.specialization ?? '', preferredLanguage: a.preferredLanguage || 'en', l2Technician: a.l2Technician };
  }

  save(): void {
    if (!this.editing) return;
    this.saving = true;
    this.settings.updateAgent(this.editing.id, { ...this.form, specialization: this.form.specialization.trim() || null }).subscribe({
      next: a => {
        this.agents = this.agents.map(x => x.id === a.id ? a : x);
        this.editing = undefined;
        this.saving = false;
        this.flash('Agent updated');
      },
      error: e => { this.saving = false; this.error = e.error?.message || 'The agent could not be updated.'; }
    });
  }

  roleLabel(roles: string[]): string { return roles.map(r => r.replace(/_/g, ' ').toLowerCase()).join(', '); }
  languageName(code?: string): string { return LANGUAGES.find(l => l.code === code)?.label ?? 'English'; }

  private flash(text: string): void { this.notice = text; setTimeout(() => this.notice = '', 2500); }
}
