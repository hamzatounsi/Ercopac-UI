import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GmLayoutComponent } from './pages/gm-layout/gm-layout.component';
import { GmProjectDetailsComponent } from './pages/gm-project-details/gm-project-details/gm-project-details.component';
import { GmProjectScheduleInitComponent } from './pages/gm-project-schedule-init/gm-project-schedule-init/gm-project-schedule-init.component';
import { GmProjectTasksComponent } from './pages/gm-project-tasks/gm-project-tasks/gm-project-tasks.component';
import { GmWorkspacesPageComponent } from './pages/gm_workspaces-page/gm-workspaces-page/gm-workspaces-page.component';
import { GmProjectumPageComponent } from './pages/gm-projectum-page/gm-projectum-page/gm-projectum-page.component';
import { GmProjectSchedulePageComponent } from './pages/gm-project-schedule-page/gm-project-schedule-page/gm-project-schedule-page.component';

const routes: Routes = [
  {
    path: '',
    component: GmLayoutComponent,
    children: [
      { path: '', component: GmWorkspacesPageComponent },
      { path: 'projectum', component: GmProjectumPageComponent },
      { path: 'projects/schedule-init', component: GmProjectScheduleInitComponent },

      { path: 'projects/:id/schedule', component: GmProjectSchedulePageComponent },
      { path: 'projects/:id/tasks', component: GmProjectTasksComponent },
      { path: 'projects/:id', component: GmProjectDetailsComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GmDashboardRoutingModule {}