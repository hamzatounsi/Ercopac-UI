import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DashboardCrmRoutingModule } from './dashboard-crm-routing.module';
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
import { CrmDatePipe } from './shared/crm-date.pipe';

@NgModule({
  declarations: [CrmLayoutComponent, CrmDashboardPageComponent, CrmLeadsPageComponent, CrmLeadDetailPageComponent,
    CrmAccountsPageComponent, CrmAccountDetailPageComponent, CrmOpportunitiesPageComponent,
    CrmOpportunityDetailPageComponent, CrmManagerViewPageComponent, CrmReportsPageComponent, CrmAnalyticsPageComponent, CrmSettingsPageComponent, CrmDatePipe],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, DashboardCrmRoutingModule]
})
export class DashboardCrmModule {}
