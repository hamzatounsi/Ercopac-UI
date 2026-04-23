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
import { GmWorkspacesPageComponent } from './pages/gm_workspaces-page/gm-workspaces-page/gm-workspaces-page.component';
import { GmProjectumPageComponent } from './pages/gm-projectum-page/gm-projectum-page/gm-projectum-page.component';
import { ProjectumSideNavComponent } from './widgets/projectum-side-nav/projectum-side-nav.component';
import { GmProjectSchedulePageComponent } from './pages/gm-project-schedule-page/gm-project-schedule-page/gm-project-schedule-page.component';
import { GmProjectFinancePageComponent } from './pages/gm-project-finance-page/gm-project-finance-page.component';
import { GmProjectForecastPageComponent } from './pages/gm-project-forecast-page/gm-project-forecast-page.component';
import { GmProjectRisksPageComponent } from './pages/gm-project-risks-page/gm-project-risks-page.component';
import { GmProjectChangeRequestsPageComponent } from './pages/gm-project-change-requests-page/gm-project-change-requests-page.component';
import { GmProjectActionsPageComponent } from './pages/gm-project-actions-page/gm-project-actions-page.component';
import { ProjectumProjectHeaderComponent } from './widgets/projectum-project-header/projectum-project-header.component';
import { GmProjectSidePanelComponent } from './widgets/gm-project-side-panel/gm-project-side-panel.component';
import { GmResourceManagementPageComponent } from './pages/gm-resource-management-page/gm-resource-management-page.component';
import { HttpClientModule } from '@angular/common/http';



@NgModule({
  declarations: [
    GmDashboardPageComponent,
    HealthBadgeComponent,
    GmProjectDetailsComponent,
    GmProjectScheduleInitComponent,
    GmLayoutComponent,
    GmProjectTasksComponent,
    GmWorkspacesPageComponent,
    GmProjectumPageComponent,
    ProjectumSideNavComponent,
    GmProjectSchedulePageComponent,
    GmProjectFinancePageComponent,
    GmProjectForecastPageComponent,
    GmProjectRisksPageComponent,
    GmProjectChangeRequestsPageComponent,
    GmProjectActionsPageComponent,
    ProjectumProjectHeaderComponent,
    GmProjectSidePanelComponent,
    GmResourceManagementPageComponent,
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