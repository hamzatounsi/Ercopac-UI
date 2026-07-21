import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';

interface AdminNavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-org-admin-layout',
  templateUrl: './org-admin-layout.component.html',
  styleUrls: ['./org-admin-layout.component.scss']
})
export class OrgAdminLayoutComponent implements OnInit, OnDestroy {
  readonly navItems: AdminNavItem[] = [
    { path: '/org-admin/overview', label: 'Overview', icon: 'space_dashboard' },
    { path: '/org-admin/profile', label: 'Organisation profile', icon: 'domain' },
    { path: '/org-admin/users', label: 'Users', icon: 'group' },
    { path: '/org-admin/roles', label: 'Roles & permissions', icon: 'admin_panel_settings' },
    { path: '/org-admin/departments', label: 'Departments', icon: 'account_tree' },
    { path: '/org-admin/resources', label: 'Resource configuration', icon: 'tune' },
    { path: '/org-admin/settings', label: 'Security settings', icon: 'shield_lock' }
  ];

  organisationName = '';
  currentUserName = '';
  pageTitle = 'Organisation administration';
  pageDescription = 'Manage your organisation configuration and access.';
  mobileNavigationOpen = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.organisationName = this.authService.getOrganisationName() || 'Your organisation';
    this.currentUserName = this.authService.getCurrentUsername() || 'Organisation Admin';
    this.updateRouteMetadata();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.mobileNavigationOpen = false;
      this.updateRouteMetadata();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleNavigation(): void {
    this.mobileNavigationOpen = !this.mobileNavigationOpen;
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  private updateRouteMetadata(): void {
    let route = this.activatedRoute;
    while (route.firstChild) route = route.firstChild;
    this.pageTitle = route.snapshot.data['title'] || 'Organisation administration';
    this.pageDescription = route.snapshot.data['description'] || 'Manage your organisation configuration and access.';
  }
}
