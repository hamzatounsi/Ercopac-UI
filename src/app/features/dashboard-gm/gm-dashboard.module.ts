import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { GmDashboardRoutingModule } from './gm-dashboard-routing.module';
import { GmDashboardPageComponent } from './pages/gm-dashboard-page/gm-dashboard-page.component';
import { HealthBadgeComponent } from './widgets/health-badge/health-badge/health-badge.component';
import { GmProjectDetailsComponent } from './pages/gm-project-details/gm-project-details/gm-project-details.component';
import { GmProjectScheduleInitComponent } from './pages/gm-project-schedule-init/gm-project-schedule-init/gm-project-schedule-init.component';
import { GmLayoutComponent } from './pages/gm-layout/gm-layout.component';
import { GmProjectTasksComponent } from './pages/gm-project-tasks/gm-project-tasks/gm-project-tasks.component';
import { GmProjectumPageComponent } from './pages/gm-projectum-page/gm-projectum-page/gm-projectum-page.component';
import { GmProjectSchedulePageComponent } from './pages/gm-project-schedule-page/gm-project-schedule-page/gm-project-schedule-page.component';
import { GmProjectFinancePageComponent } from './pages/gm-project-finance-page/gm-project-finance-page.component';
import { GmProjectForecastPageComponent } from './pages/gm-project-forecast-page/gm-project-forecast-page.component';
import { GmProjectRisksPageComponent } from './pages/gm-project-risks-page/gm-project-risks-page.component';
import { GmProjectChangeRequestsPageComponent } from './pages/gm-project-change-requests-page/gm-project-change-requests-page.component';
import { GmProjectActionsPageComponent } from './pages/gm-project-actions-page/gm-project-actions-page.component';
import { ProjectumProjectHeaderComponent } from './widgets/projectum-project-header/projectum-project-header.component';
import { ProjectumWorkspaceHeaderComponent } from './widgets/projectum-workspace-header/projectum-workspace-header.component';
import { GmResourceManagementPageComponent } from './pages/gm-resource-management-page/gm-resource-management-page.component';
import { HttpClientModule } from '@angular/common/http';
import { GmAdminSettingsPageComponent } from './pages/gm-admin-settings-page/gm-admin-settings-page.component';
import { CategoriesTabComponent } from './pages/gm-admin-settings-page/components/categories-tab/categories-tab.component';
import { LicencesTabComponent } from './pages/gm-admin-settings-page/components/licences-tab/licences-tab.component';
import { TypesTabComponent } from './pages/gm-admin-settings-page/components/types-tab/types-tab.component';
import { CustomersTabComponent } from './pages/gm-admin-settings-page/components/customers-tab/customers-tab.component';
import { MyCsProjectsPageComponent } from './pages/my-cs-projects-page/my-cs-projects-page.component';
import { SecurityTabComponent } from './pages/gm-admin-settings-page/components/security-tab/security-tab.component';



@NgModule({
  declarations: [
    GmDashboardPageComponent,
    HealthBadgeComponent,
    GmProjectDetailsComponent,
    GmProjectScheduleInitComponent,
    GmLayoutComponent,
    GmProjectTasksComponent,
    GmProjectumPageComponent,
    GmProjectSchedulePageComponent,
    GmProjectFinancePageComponent,
    GmProjectForecastPageComponent,
    GmProjectRisksPageComponent,
    GmProjectChangeRequestsPageComponent,
    GmProjectActionsPageComponent,
    ProjectumProjectHeaderComponent,
    ProjectumWorkspaceHeaderComponent,
    GmResourceManagementPageComponent,
    GmAdminSettingsPageComponent,
    CategoriesTabComponent,
    LicencesTabComponent,
    TypesTabComponent,
    CustomersTabComponent,
    MyCsProjectsPageComponent,
    SecurityTabComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GmDashboardRoutingModule,
    HttpClientModule
  ]
})
export class GmDashboardModule {}
