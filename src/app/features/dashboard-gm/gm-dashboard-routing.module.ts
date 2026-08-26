import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RoleGuard } from '../../core/auth/role.guard';

 import { MilestoneDashboardComponent } from './pages/milestone-dashboard/milestone-dashboard.component';
import { GmLayoutComponent } from './pages/gm-layout/gm-layout.component';
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
import { GmAdminSettingsPageComponent } from './pages/gm-admin-settings-page/gm-admin-settings-page.component';
import { MyDepartmentPageComponent } from '../dashboard-department/pages/my-department-page/my-department-page.component';
import { MyCsProjectsPageComponent } from './pages/my-cs-projects-page/my-cs-projects-page.component';
import { CompanyDashboardComponent } from './pages/company-dashboard/company-dashboard.component';
import { ProjectPerformanceComponent } from './pages/project-performance/project-performance.component';

const projectumAccessRoles = [
  'ROLE_PLATFORM_OWNER',
  'ROLE_PROJECT_MANAGER',
  'PROJECT_MANAGER_LEAD',
  'ROLE_PROJECT_MANAGER_LEAD',
  'ROLE_DEPARTMENT_MANAGER'
];

const workspaceShellRoles = [...projectumAccessRoles, 'ROLE_ORG_ADMIN'];
const companyDashboardRoles = ['MANAGER', 'ROLE_MANAGER'];

const adminAccessRoles = [
  'ROLE_ORG_ADMIN',
  'ORG_ADMIN'
];

const routes: Routes = [

  {
    path: '',
    component: GmLayoutComponent,
    canActivate: [RoleGuard],
    data: { roles: [...workspaceShellRoles, ...companyDashboardRoles] },
    children: [
      { path: '', redirectTo: 'projectum', pathMatch: 'full' },
      {
        path: 'company-dashboard', component: CompanyDashboardComponent,
        canActivate: [RoleGuard], data: { roles: companyDashboardRoles }
      },
    
   {
  path: 'projects/:id/milestones',
  component:MilestoneDashboardComponent, // Or create a separate MilestoneComponent
  canActivate: [RoleGuard],
  data: { roles: projectumAccessRoles }
},
      { path: 'command-center', component: CompanyDashboardComponent, canActivate: [RoleGuard], data: { roles: companyDashboardRoles } },
      { path: 'command-center/project-performance', component: ProjectPerformanceComponent, canActivate: [RoleGuard], data: { roles: companyDashboardRoles } },
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
      
      {
        path: 'admin',
        component: GmAdminSettingsPageComponent,
        canActivate: [RoleGuard],
        data: { roles: adminAccessRoles }
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
      },{
        path: 'my-department',
        component: MyDepartmentPageComponent,
        canActivate: [RoleGuard],
        data: { roles: projectumAccessRoles }
      },
      {
        path: 'my-cs',
        component: MyCsProjectsPageComponent,
        canActivate: [RoleGuard],
        data: { roles: projectumAccessRoles }
      },
      {
        path: 'my-cs/projects/:id/schedule',
        component: GmProjectSchedulePageComponent,
        canActivate: [RoleGuard],
        data: { roles: projectumAccessRoles }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GmDashboardRoutingModule {}
