import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from 'src/app/core/auth/role.guard';

// Composants CRM existants
import { CrmLayoutComponent } from './layouts/crm-layout/crm-layout.component';
import { CrmDashboardPageComponent } from './pages/crm-dashboard-page/crm-dashboard-page.component';
import { CrmLeadsPageComponent } from './pages/crm-leads-page/crm-leads-page.component';
import { CrmLeadDetailPageComponent } from './pages/crm-lead-detail-page/crm-lead-detail-page.component';
import { CrmAccountsPageComponent } from './pages/crm-accounts-page/crm-accounts-page.component';
import { CrmAccountDetailPageComponent } from './pages/crm-account-detail-page/crm-account-detail-page.component';
import { CrmOpportunitiesPageComponent } from './pages/crm-opportunities-page/crm-opportunities-page.component';
import { CrmOpportunityDetailPageComponent } from './pages/crm-opportunity-detail-page/crm-opportunity-detail-page.component';
import { CrmManagerViewPageComponent } from './pages/crm-manager-view-page/crm-manager-view-page.component';
import { CrmReportsPageComponent } from './pages/crm-reports-page/crm-reports-page.component';
import { CrmAnalyticsPageComponent } from './pages/crm-analytics-page/crm-analytics-page.component';
import { CrmSettingsPageComponent } from './pages/crm-settings-page/crm-settings-page.component';

// ✅ NOUVEAUX IMPORTS : Dashboards Sales & Customer Success
import { SalesDashboardComponent } from './pages/sales-dashboard/sales-dashboard.component';
import { CustomerSuccessDashboardComponent } from './pages/customer-success-dashboard/customer-success-dashboard.component';

const routes: Routes = [
  { 
    path: '', 
    component: CrmLayoutComponent, 
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: CrmDashboardPageComponent },
      { path: 'leads', component: CrmLeadsPageComponent },
      { path: 'leads/:id', component: CrmLeadDetailPageComponent },
      { path: 'accounts', component: CrmAccountsPageComponent },
      { path: 'accounts/:id', component: CrmAccountDetailPageComponent },
      { path: 'opportunities', component: CrmOpportunitiesPageComponent },
      { path: 'opportunities/:id', component: CrmOpportunityDetailPageComponent },
      { path: 'manager-view', component: CrmManagerViewPageComponent, canActivate: [RoleGuard], data: { roles: ['SALES_MANAGER_LEAD'] } },
      { path: 'reports', component: CrmReportsPageComponent },
      { path: 'analytics', component: CrmAnalyticsPageComponent },
      { path: 'settings', component: CrmSettingsPageComponent },
      
      // ✅ NOUVELLES ROUTES AJOUTÉES ICI
      { path: 'sales', component: SalesDashboardComponent },
      { path: 'customer-success', component: CustomerSuccessDashboardComponent }
    ]
  }
];

@NgModule({ 
  imports: [RouterModule.forChild(routes)], 
  exports: [RouterModule] 
})
export class DashboardCrmRoutingModule {}