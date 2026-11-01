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
    { path: '/org-admin/overview', label: 'orgAdmin.pages.overview.title', icon: 'space_dashboard' },
    { path: '/org-admin/profile', label: 'orgAdmin.pages.profile.title', icon: 'domain' },
    { path: '/org-admin/users', label: 'orgAdmin.pages.users.title', icon: 'group' },
    { path: '/org-admin/roles', label: 'orgAdmin.pages.roles.title', icon: 'admin_panel_settings' },
    { path: '/org-admin/departments', label: 'orgAdmin.pages.departments.title', icon: 'account_tree' },
    { path: '/org-admin/resources', label: 'orgAdmin.pages.resources.title', icon: 'tune' },
    { path: '/org-admin/settings', label: 'orgAdmin.pages.settings.title', icon: 'shield_lock' }
  ];

  organisationName = '';
  pageTitle = 'orgAdmin.pages.default.title';
  pageDescription = 'orgAdmin.pages.default.description';
  mobileNavigationOpen = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.organisationName = this.authService.getOrganisationName() || '';
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

  private updateRouteMetadata(): void {
    let route = this.activatedRoute;
    while (route.firstChild) route = route.firstChild;
    this.pageTitle = route.snapshot.data['title'] || 'orgAdmin.pages.default.title';
    this.pageDescription = route.snapshot.data['description'] || 'orgAdmin.pages.default.description';
  }
}
