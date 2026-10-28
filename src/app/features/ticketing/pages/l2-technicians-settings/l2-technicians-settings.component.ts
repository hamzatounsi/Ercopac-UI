import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth/auth.service';
import { Agent } from '../../models/ticket.models';
import { TicketSettingsService } from '../../services/ticket-settings.service';
import { TICKETING_LEAD_ROLES } from '../../ticketing-roles';

// Level 2 specialists: support staff flagged as L2 can be assigned to tickets next to the H24 agent.
@Component({
  selector: 'app-l2-technicians-settings',
  templateUrl: './l2-technicians-settings.component.html',
  styleUrls: ['./l2-technicians-settings.component.scss']
})
export class L2TechniciansSettingsComponent implements OnInit {
  agents: Agent[] = [];
  loading = true;
  error = '';
  notice = '';
  adding = false;
  candidateId: number | null = null;
  busyId?: number;
  readonly isLead = this.auth.hasAnyRole(TICKETING_LEAD_ROLES);

  constructor(private settings: TicketSettingsService, private auth: AuthService) {}

  get technicians(): Agent[] { return this.agents.filter(a => a.l2Technician); }
  get candidates(): Agent[] { return this.agents.filter(a => !a.l2Technician && a.active); }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.settings.agents().subscribe({
      next: a => { this.agents = a; this.loading = false; },
      error: e => { this.error = e.error?.message || 'L2 technicians could not be loaded.'; this.loading = false; }
    });
  }

  add(): void {
    const a = this.agents.find(x => x.id === this.candidateId);
    if (a) this.setL2(a, true, () => { this.adding = false; this.candidateId = null; });
  }

  remove(a: Agent): void {
    if (a.l2OpenTickets && !confirm(`${a.fullName} still has ${a.l2OpenTickets} open L2 ticket(s); they stay assigned. Remove the L2 flag anyway?`)) return;
    this.setL2(a, false);
  }

  private setL2(a: Agent, l2: boolean, done?: () => void): void {
    this.busyId = a.id;
    this.error = '';
    this.settings.updateAgent(a.id, { l2Technician: l2, specialization: a.specialization ?? null, preferredLanguage: a.preferredLanguage ?? null }).subscribe({
      next: updated => {
        this.agents = this.agents.map(x => x.id === updated.id ? updated : x);
        this.busyId = undefined;
        done?.();
        this.flash(l2 ? `${updated.fullName} is now an L2 technician` : `${updated.fullName} removed from L2`);
      },
      error: e => { this.busyId = undefined; this.error = e.error?.message || 'The change could not be saved.'; }
    });
  }

  private flash(text: string): void { this.notice = text; setTimeout(() => this.notice = '', 2500); }
}
