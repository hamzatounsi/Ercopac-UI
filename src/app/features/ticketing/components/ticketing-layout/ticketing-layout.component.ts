import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';
import { TICKETING_STAFF_ROLES } from '../../ticketing-roles';

interface NavItem { label: string; icon: string; route: string; exact: boolean; staffOnly: boolean; }

@Component({
  selector: 'app-ticketing-layout',
  templateUrl: './ticketing-layout.component.html',
  styleUrls: ['./ticketing-layout.component.scss']
})
export class TicketingLayoutComponent {
  private readonly items: NavItem[] = [
    { label: 'Tickets', icon: 'confirmation_number', route: '/tickets', exact: true, staffOnly: false },
    { label: 'Live chat', icon: 'forum', route: '/tickets/chat', exact: false, staffOnly: true },
    { label: 'Performance', icon: 'monitoring', route: '/tickets/dashboard', exact: false, staffOnly: true }
  ];

  constructor(public auth: AuthService, private router: Router) {}

  // CLIENT users keep the client portal: they only see their own tickets
  get isStaff(): boolean { return this.auth.hasAnyRole(TICKETING_STAFF_ROLES); }
  get navItems(): NavItem[] { return this.items.filter(item => this.isStaff || !item.staffOnly); }
  get userName(): string { return this.auth.getCurrentUsername() || 'User'; }
  get initials(): string { return this.userName.split(/\s+/).slice(0, 2).map(v => v[0]).join('').toUpperCase(); }
  get organisation(): string { return this.auth.getOrganisationName() || 'Organisation'; }
  get roleLabel(): string { return this.auth.getRoles().join(', ').replace(/_/g, ' ').toLowerCase(); }
  get showLogoutInsteadOfWorkspace(): boolean { return this.auth.getAccessibleWorkspaceModules().length <= 1; }

  handleWorkspaceNavigation(): void {
    if (this.showLogoutInsteadOfWorkspace) {
      this.auth.logout();
      void this.router.navigate(['/']);
      return;
    }
    void this.router.navigate(['/workspace']);
  }
}
