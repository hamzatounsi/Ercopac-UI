import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';
import { TicketSettingsService } from '../../services/ticket-settings.service';
import { TICKETING_LEAD_ROLES, TICKETING_STAFF_ROLES } from '../../ticketing-roles';

interface NavItem { label: string; icon: string; route: string; exact: boolean; show: boolean; }

@Component({
  selector: 'app-ticketing-layout',
  templateUrl: './ticketing-layout.component.html',
  styleUrls: ['./ticketing-layout.component.scss']
})
export class TicketingLayoutComponent implements OnInit {
  readonly isStaff = this.auth.hasAnyRole(TICKETING_STAFF_ROLES);
  readonly isLead = this.auth.hasAnyRole(TICKETING_LEAD_ROLES);

  // CLIENT users keep the client portal: their own tickets, chat and their language
  readonly navItems: NavItem[] = [
    { label: this.isStaff ? 'Tickets' : 'My tickets', icon: 'confirmation_number', route: '/tickets', exact: true, show: true },
    { label: 'Live chat', icon: 'forum', route: '/tickets/chat', exact: false, show: true },
    { label: 'Dashboard', icon: 'monitoring', route: '/tickets/dashboard', exact: false, show: this.isLead },
    { label: 'Settings', icon: 'settings', route: this.isStaff ? '/tickets/settings/h24-agents' : '/tickets/settings/language', exact: false, show: true }
  ].filter(item => item.show);

  constructor(public auth: AuthService, private settings: TicketSettingsService, private router: Router) {}

  ngOnInit(): void { this.settings.load(); }

  // The Settings link opens one section but stays highlighted on all of them
  get inSettings(): boolean { return this.router.url.startsWith('/tickets/settings'); }

  get userName(): string { return this.auth.getCurrentUsername() || 'User'; }
  get initials(): string { return this.userName.split(/\s+/).slice(0, 2).map(v => v[0]).join('').toUpperCase(); }
  get organisation(): string { return this.auth.getOrganisationName() || 'Organisation'; }
  get roleLabel(): string { return this.auth.getRoles().join(', ').replace(/_/g, ' ').toLowerCase(); }
}
