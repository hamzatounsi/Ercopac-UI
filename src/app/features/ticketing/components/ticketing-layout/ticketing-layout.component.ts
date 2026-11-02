import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from 'src/app/core/i18n/i18n.service';
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
    { label: this.isStaff ? 'ticketing.layout.tickets' : 'ticketing.layout.myTickets', icon: 'confirmation_number', route: '/tickets', exact: true, show: true },
    { label: 'ticketing.layout.liveChat', icon: 'forum', route: '/tickets/chat', exact: false, show: true },
    { label: 'ticketing.layout.dashboard', icon: 'monitoring', route: '/tickets/dashboard', exact: false, show: this.isLead },
    { label: 'ticketing.layout.settings', icon: 'settings', route: this.isStaff ? '/tickets/settings/h24-agents' : '/tickets/settings/language', exact: false, show: true }
  ].filter(item => item.show);

  constructor(private i18n: I18nService, public auth: AuthService, private settings: TicketSettingsService, private router: Router) {}

  ngOnInit(): void { this.settings.load(); }

  // The Settings link opens one section but stays highlighted on all of them
  get inSettings(): boolean { return this.router.url.startsWith('/tickets/settings'); }

  get organisation(): string { return this.auth.getOrganisationName() || this.i18n.t('ticketing.layout.organisation'); }
  get roleLabel(): string { return this.auth.getRoles().map(r => this.i18n.t('roles.' + r)).join(', '); }
}
