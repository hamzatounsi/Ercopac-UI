import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppRole, AuthService } from 'src/app/core/auth/auth.service';
import { APPLICATION_ICONS } from 'src/app/core/config/application-icons';

interface LauncherApp {
  name: string;
  route: string;
  roles: AppRole[];
  icon: string;
}

@Component({
  selector: 'app-gm-workspaces-page',
  templateUrl: './gm-workspaces-page.component.html',
  styleUrls: ['./gm-workspaces-page.component.scss']
})
export class GmWorkspacesPageComponent implements OnInit {
  currentOrganisationName = 'Projectum workspace';
  organisationLabel = 'Workspace';
  currentUserName = '';

  readonly launcherApps: LauncherApp[] = [
    // Keep the established route for existing manager sessions/bookmarks; the application is presented as Command Center.
    { name: 'Command Center', route: '/gm/company-dashboard', roles: ['MANAGER'], icon: APPLICATION_ICONS.projectum },
    { name: 'Projectum', route: '/gm/projectum', roles: ['PROJECT_MANAGER', 'PROJECT_MANAGER_LEAD', 'DEPARTMENT_MANAGER'], icon: APPLICATION_ICONS.projectum },
    { name: 'My Department', route: '/department', roles: ['PROJECT_MANAGER', 'PROJECT_MANAGER_LEAD', 'DEPARTMENT_MANAGER'], icon: APPLICATION_ICONS.myDepartment },
    { name: 'My CRM', route: '/crm/opportunities', roles: ['PROJECT_MANAGER', 'PROJECT_MANAGER_LEAD', 'SALES_MANAGER_LEAD', 'SALES_MANAGER', 'SYSTEM_ENGINEER'], icon: APPLICATION_ICONS.myCrm },
    { name: 'Employee', route: '/employee', roles: ['EMPLOYEE'], icon: APPLICATION_ICONS.employee },
    { name: 'Ticketing', route: '/tickets', roles: ['SALES_MANAGER', 'CLIENT'], icon: APPLICATION_ICONS.ticketing }
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

    // ✅ FIX: affiche le nom réel de l'utilisateur connecté au lieu du
    // texte statique "Logged in".
    this.currentUserName = this.authService.getCurrentUsername() || 'Logged in';
  }

  get visibleLauncherApps(): LauncherApp[] {
    const roles = this.authService.getRoles();
    return this.launcherApps.filter(app => app.roles.some(role => roles.includes(role)));
  }

  openApp(app: LauncherApp): void {
    void this.router.navigateByUrl(app.route);
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/']);
  }
}