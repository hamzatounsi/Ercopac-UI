import { Component } from '@angular/core';
import { AuthService } from 'src/app/core/auth/auth.service';
import { TICKETING_LEAD_ROLES, TICKETING_STAFF_ROLES } from '../../ticketing-roles';

interface SettingsGroup { label: string; items: { label: string; icon: string; path: string }[]; }

// Settings shell: Users / Tickets / System sections. Clients only see their language.
@Component({
  selector: 'app-platform-settings',
  templateUrl: './platform-settings.component.html',
  styleUrls: ['./platform-settings.component.scss']
})
export class PlatformSettingsComponent {
  readonly isStaff = this.auth.hasAnyRole(TICKETING_STAFF_ROLES);
  readonly isLead = this.auth.hasAnyRole(TICKETING_LEAD_ROLES);

  readonly groups: SettingsGroup[] = this.isStaff ? [
    { label: 'ticketing.platform.users', items: [
      { label: 'ticketing.platform.h24Agents', icon: 'support_agent', path: 'h24-agents' },
      { label: 'ticketing.platform.l2Technicians', icon: 'engineering', path: 'l2-technicians' },
      ...(this.isLead ? [{ label: 'ticketing.platform.accounts', icon: 'person_add', path: 'accounts' }] : [])
    ] },
    { label: 'ticketing.platform.tickets', items: [
      { label: 'ticketing.platform.statuses', icon: 'label', path: 'statuses' },
      { label: 'ticketing.platform.categories', icon: 'category', path: 'categories' },
      { label: 'ticketing.platform.priorities', icon: 'priority_high', path: 'priorities' }
    ] },
    { label: 'ticketing.platform.system', items: [
      { label: 'ticketing.platform.customers', icon: 'business', path: 'customers' },
      { label: 'ticketing.platform.language', icon: 'translate', path: 'language' }
    ] }
  ] : [
    { label: 'ticketing.platform.account', items: [{ label: 'ticketing.platform.language', icon: 'translate', path: 'language' }] }
  ];

  constructor(private auth: AuthService) {}
}
