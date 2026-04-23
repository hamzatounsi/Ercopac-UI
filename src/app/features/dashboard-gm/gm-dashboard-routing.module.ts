import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RoleGuard } from '../../core/auth/role.guard';

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
import { GmResourceManagementPageComponent } from './pages/gm-resource-management-page/gm-resource-management-page.component';

const projectumAccessRoles = [
  'ROLE_PLATFORM_OWNER',
  'ROLE_PLATFORM_ADMIN',
  'ROLE_ORG_ADMIN',
  'ROLE_GENERAL_MANAGER',
  'ROLE_PMO'
];

const routes: Routes = [
  {
    path: '',
    component: GmLayoutComponent,
    canActivate: [RoleGuard],
    data: { roles: projectumAccessRoles },
    children: [
      {
        path: '',
        component: GmWorkspacesPageComponent,
        canActivate: [RoleGuard],
        data: { roles: projectumAccessRoles }
      },
      {
        path: 'projectum',
        component: GmProjectumPageComponent,
        canActivate: [RoleGuard],
        data: { roles: projectumAccessRoles }
      },
      {
        path: 'projectum/schedule-init',
        component: GmProjectScheduleInitComponent,
        canActivate: [RoleGuard],
        data: { roles: projectumAccessRoles }
      },

      { path: 'projects/:id', redirectTo: 'projects/:id/schedule', pathMatch: 'full' },

      {
        path: 'projects/:id/schedule',
        component: GmProjectSchedulePageComponent,
        canActivate: [RoleGuard],
        data: { roles: projectumAccessRoles }
      },
      {
        path: 'projects/:id/tasks',
        component: GmProjectTasksComponent,
        canActivate: [RoleGuard],
        data: { roles: projectumAccessRoles }
      },
      {
        path: 'projects/:id/finance',
        component: GmProjectFinancePageComponent,
        canActivate: [RoleGuard],
        data: { roles: projectumAccessRoles }
      },
      {
        path: 'projects/:id/forecast',
        component: GmProjectForecastPageComponent,
        canActivate: [RoleGuard],
        data: { roles: projectumAccessRoles }
      },
      {
        path: 'projects/:id/risks',
        component: GmProjectRisksPageComponent,
        canActivate: [RoleGuard],
        data: { roles: projectumAccessRoles }
      },
      {
        path: 'projects/:id/change-requests',
        component: GmProjectChangeRequestsPageComponent,
        canActivate: [RoleGuard],
        data: { roles: projectumAccessRoles }
      },
      {
        path: 'projects/:id/actions',
        component: GmProjectActionsPageComponent,
        canActivate: [RoleGuard],
        data: { roles: projectumAccessRoles }
      },
      {
        path: 'projects/:id/details',
        component: GmProjectDetailsComponent,
        canActivate: [RoleGuard],
        data: { roles: projectumAccessRoles }
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GmDashboardRoutingModule {}