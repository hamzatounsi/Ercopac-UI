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
    { label: 'Users', items: [
      { label: 'H24 Agents', icon: 'support_agent', path: 'h24-agents' },
      { label: 'L2 Technicians', icon: 'engineering', path: 'l2-technicians' }
    ] },
    { label: 'Tickets', items: [
      { label: 'Statuses', icon: 'label', path: 'statuses' },
      { label: 'Priorities', icon: 'priority_high', path: 'priorities' }
    ] },
    { label: 'System', items: [
      { label: 'Customers', icon: 'business', path: 'customers' },
      { label: 'Language', icon: 'translate', path: 'language' }
    ] }
  ] : [
    { label: 'Account', items: [{ label: 'Language', icon: 'translate', path: 'language' }] }
  ];

  constructor(private auth: AuthService) {}
}
