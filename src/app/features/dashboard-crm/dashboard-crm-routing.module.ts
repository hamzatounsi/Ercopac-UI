  // Path: src/app/features/dashboard-crm/dashboard-crm-routing.module.ts
  // REPLACE your entire file with this

  import { NgModule } from '@angular/core';
  import { RouterModule, Routes } from '@angular/router';

  import { CrmLayoutComponent }            from './layouts/crm-layout/crm-layout.component';
  import { CrmDashboardPageComponent }     from './pages/crm-dashboard-page/crm-dashboard-page.component';
  import { CrmLeadsPageComponent }         from './pages/crm-leads-page/crm-leads-page.component';
  import { CrmOpportunitiesPageComponent } from './pages/crm-opportunities-page/crm-opportunities-page.component';
  import { CrmManagerViewPageComponent }   from './pages/crm-manager-view-page/crm-manager-view-page.component';
  import { CrmAnalyticsPageComponent }     from './pages/crm-analytics-page/crm-analytics-page.component';
  import { CrmSettingsPageComponent }      from './pages/crm-settings-page/crm-settings-page.component';

  const routes: Routes = [
    {
      path: '',
      component: CrmLayoutComponent,
      children: [
        { path: '',               redirectTo: 'dashboard', pathMatch: 'full' },
        { path: 'dashboard',      component: CrmDashboardPageComponent },
        { path: 'leads',          component: CrmLeadsPageComponent },
        { path: 'opportunities',  component: CrmOpportunitiesPageComponent },
        { path: 'manager-view',   component: CrmManagerViewPageComponent },
        { path: 'analytics',      component: CrmAnalyticsPageComponent },
        { path: 'settings',       component: CrmSettingsPageComponent },
      ]
    }
  ];

  @NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
  })
  export class DashboardCrmRoutingModule {}