import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { GmLayoutComponent } from './pages/gm-layout/gm-layout.component';
import { GmWorkspacesPageComponent } from './pages/gm_workspaces-page/gm-workspaces-page/gm-workspaces-page.component';
import { GmProjectumPageComponent } from './pages/gm-projectum-page/gm-projectum-page/gm-projectum-page.component';
import { GmProjectScheduleInitComponent } from './pages/gm-project-schedule-init/gm-project-schedule-init/gm-project-schedule-init.component';
import { GmProjectSchedulePageComponent } from './pages/gm-project-schedule-page/gm-project-schedule-page/gm-project-schedule-page.component';
import { GmProjectTasksComponent } from './pages/gm-project-tasks/gm-project-tasks/gm-project-tasks.component';
import { GmProjectDetailsComponent } from './pages/gm-project-details/gm-project-details/gm-project-details.component';
import { GmProjectFinancePageComponent } from './pages/gm-project-finance-page/gm-project-finance-page.component';
import { GmProjectForecastPageComponent } from './pages/gm-project-forecast-page/gm-project-forecast-page.component';
import { GmProjectRisksPageComponent } from './pages/gm-project-risks-page/gm-project-risks-page.component';
import { GmProjectChangeRequestsPageComponent } from './pages/gm-project-change-requests-page/gm-project-change-requests-page.component';
import { GmProjectActionsPageComponent } from './pages/gm-project-actions-page/gm-project-actions-page.component';
;

const routes: Routes = [
  {
    path: '',
    component: GmLayoutComponent,
    children: [
      { path: '', component: GmWorkspacesPageComponent },

      // Projectum entry page
      { path: 'projectum', component: GmProjectumPageComponent },

      // Project setup
      { path: 'projectum/schedule-init', component: GmProjectScheduleInitComponent },

      // Central project workspace
      { path: 'projects/:id', redirectTo: 'projects/:id/schedule', pathMatch: 'full' },
      { path: 'projects/:id/schedule', component: GmProjectSchedulePageComponent },
      { path: 'projects/:id/tasks', component: GmProjectTasksComponent },
      { path: 'projects/:id/finance', component: GmProjectFinancePageComponent },
      { path: 'projects/:id/forecast', component: GmProjectForecastPageComponent },
      { path: 'projects/:id/risks', component: GmProjectRisksPageComponent },
      { path: 'projects/:id/change-requests', component: GmProjectChangeRequestsPageComponent },
      { path: 'projects/:id/actions', component: GmProjectActionsPageComponent },

      // keep temporarily if still used somewhere
      { path: 'projects/:id/details', component: GmProjectDetailsComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GmDashboardRoutingModule {}