import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';

interface LauncherApp {
  key: 'projectum' | 'department' | 'crm' | 'admin' | 'mycs' | 'expenses' | 'ticketing';
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

@Component({
  selector: 'app-gm-workspaces-page',
  templateUrl: './gm-workspaces-page.component.html',
  styleUrls: ['./gm-workspaces-page.component.scss']
})
export class GmWorkspacesPageComponent implements OnInit {
  currentOrganisationName = 'Platform workspace';
  organisationLabel = 'Platform';

  readonly launcherApps: LauncherApp[] = [
    { key: 'projectum', name: 'Projectum', description: 'Projects, schedules, finance, forecasts, risks and actions.', icon: 'account_tree', enabled: true },
    { key: 'department', name: 'My Department', description: 'Department workload, resources, holidays and planning.', icon: 'groups', enabled: true },
    { key: 'crm', name: 'My CRM', description: 'Leads, opportunities, pipeline and commercial activity.', icon: 'handshake', enabled: true },
    { key: 'admin', name: 'Admin', description: 'Resources, licences, customers, categories and security.', icon: 'admin_panel_settings', enabled: true },
    { key: 'mycs', name: 'MY CS', description: 'Customer success project workspace and planning.', icon: 'support_agent', enabled: true },
    { key: 'expenses', name: 'My Expenses', description: 'Expense claims and approvals will be available later.', icon: 'receipt_long', enabled: false },
    { key: 'ticketing', name: 'My Ticketing', description: 'Support requests and internal ticket tracking.', icon: 'confirmation_number', enabled: false }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const orgName = this.authService.getOrganisationName();

    if (orgName && orgName.trim()) {
      this.currentOrganisationName = orgName;
      this.organisationLabel = 'Organisation';
    }
  }

  get visibleLauncherApps(): LauncherApp[] {
    return this.launcherApps.filter(app => app.key !== 'admin' || this.canSeeAdmin());
  }

  openApp(app: LauncherApp): void {
    if (!app.enabled) return;

    switch (app.key) {
      case 'projectum': this.openProjectum(); break;
      case 'department': this.openMyDepartment(); break;
      case 'crm': this.openCrm(); break;
      case 'admin': this.openAdmin(); break;
      case 'mycs': this.openMyCs(); break;
    }
  }

  openProjectum(): void {
    this.router.navigate(['/gm/projectum']);
  }

  openMyDepartment(): void {
    this.router.navigate(['/gm/my-department']);
  }

  openCrm(): void {
    this.router.navigate(['/crm/dashboard']);
  }

  openMyCs(): void {
    this.router.navigate(['/gm/my-cs']);
  }

  openAdmin(): void {
    this.router.navigate(['/gm/admin']);
  }

  canSeeAdmin(): boolean {
    const roles = this.authService.getRoles();

    return roles.includes('PLATFORM_OWNER');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
