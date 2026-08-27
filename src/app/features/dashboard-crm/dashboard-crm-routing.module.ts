import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from 'src/app/core/auth/role.guard';
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

const routes: Routes = [{ path: '', component: CrmLayoutComponent, children: [
  // The supervisor workspace opens on the CRM overview. Opportunities stay
  // one click away, but a fresh /crm navigation must always exercise and show
  // the live dashboard instead of silently bypassing it.
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
  { path: 'settings', component: CrmSettingsPageComponent }
]}];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class DashboardCrmRoutingModule {}
