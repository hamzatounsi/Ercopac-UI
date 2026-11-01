import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth/auth.service';
import { Agent, EmployeeOption } from '../../models/ticket.models';
import { TicketSettingsService } from '../../services/ticket-settings.service';
import { TICKETING_LEAD_ROLES } from '../../ticketing-roles';
import { I18nService } from 'src/app/core/i18n/i18n.service';

// Level 2 specialists: Projectum employees (or support staff) flagged as L2 can be assigned to tickets next to the H24 agent.
// A new L2 is picked with the cascading Resource type -> employee choice.
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
  candidate: EmployeeOption | null = null;
  busyId?: number;
  readonly isLead = this.auth.hasAnyRole(TICKETING_LEAD_ROLES);

  constructor(private i18n: I18nService,
    private settings: TicketSettingsService, private auth: AuthService) {}

  get technicians(): Agent[] { return this.agents.filter(a => a.l2Technician); }
  get technicianIds(): number[] { return this.technicians.map(t => t.id); }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.settings.agents().subscribe({
      next: a => { this.agents = a; this.loading = false; },
      error: e => { this.error = this.i18n.error(e, 'ticketing.l2.l2TechniciansCouldNot'); this.loading = false; }
    });
  }

  add(): void {
    const c = this.candidate;
    if (!c) return;
    // Keep the profile values of someone already known to Ticketing (support staff)
    const known = this.agents.find(x => x.id === c.id);
    this.setL2(known ?? { id: c.id, fullName: c.fullName, specialization: c.specialization }, true, () => { this.adding = false; this.candidate = null; });
  }

  remove(a: Agent): void {
    if (a.l2OpenTickets && !confirm(`${a.fullName} still has ${a.l2OpenTickets} open L2 ticket(s); they stay assigned. Remove the L2 flag anyway?`)) return;
    this.setL2(a, false);
  }

  private setL2(a: Pick<Agent, 'id' | 'fullName' | 'specialization' | 'preferredLanguage'>, l2: boolean, done?: () => void): void {
    this.busyId = a.id;
    this.error = '';
    this.settings.updateAgent(a.id, { l2Technician: l2, specialization: a.specialization ?? null, preferredLanguage: a.preferredLanguage ?? null }).subscribe({
      next: updated => {
        this.agents = this.agents.some(x => x.id === updated.id) ? this.agents.map(x => x.id === updated.id ? updated : x) : [...this.agents, updated];
        this.busyId = undefined;
        done?.();
        this.flash(l2 ? `${updated.fullName} is now an L2 technician` : `${updated.fullName} removed from L2`);
      },
      error: e => { this.busyId = undefined; this.error = this.i18n.error(e, 'ticketing.l2.changeCouldNotSaved'); }
    });
  }

  private flash(text: string): void { this.notice = text; setTimeout(() => this.notice = '', 2500); }
}
