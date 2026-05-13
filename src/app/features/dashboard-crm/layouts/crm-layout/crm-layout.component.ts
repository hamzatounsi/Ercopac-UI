// Path: src/app/features/dashboard-crm/layouts/crm-layout/crm-layout.component.ts

import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-crm-layout',
  templateUrl: './crm-layout.component.html',
  styleUrls: ['./crm-layout.component.scss']
})
export class CrmLayoutComponent {

  leadCount = 0;

  navItems = [
    { key: 'dashboard',     label: 'Dashboard',     icon: 'dashboard',          route: '/crm/dashboard' },
    { key: 'leads',         label: 'Leads',         icon: 'person',             route: '/crm/leads' },
    { key: 'opportunities', label: 'Opportunities', icon: 'trending_up',        route: '/crm/opportunities' },
    { key: 'manager',       label: 'Manager view',  icon: 'supervisor_account', route: '/crm/manager-view' },
    { key: 'analytics',     label: 'Analytics',     icon: 'bar_chart',          route: '/crm/analytics' },
    { key: 'settings',      label: 'Settings',      icon: 'settings',           route: '/crm/settings' },
  ];

  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/gm']);
  }
}