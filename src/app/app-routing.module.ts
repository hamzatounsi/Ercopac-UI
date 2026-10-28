import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './features/login/login.component';
import { GmWorkspacesPageComponent } from './features/dashboard-gm/pages/gm_workspaces-page/gm-workspaces-page/gm-workspaces-page.component';
import { DashboardDmComponent } from './features/dashboard-dm/dashboard-dm.component';
import { DashboardEmployeeComponent } from './features/dashboard-employee/dashboard-employee.component';
import { ForbiddenComponent } from './features/forbidden/forbidden.component';
import { MyDepartmentPageComponent } from './features/dashboard-department/pages/my-department-page/my-department-page.component';
import { ResourceSettingsPageComponent } from './features/dashboard-department/pages/resource-settings-page/resource-settings-page.component';
import { SalesDashboardComponent } from './features/dashboard-crm/pages/sales-dashboard/sales-dashboard.component';
import { AuthGuard } from './core/auth/auth.guard';
import { RoleGuard } from './core/auth/role.guard';

const routes: Routes = [
  { path: '', component: LoginComponent, pathMatch: 'full' },
  { path: 'login', redirectTo: '', pathMatch: 'full' },
  {
    path: 'workspace',
    component: GmWorkspacesPageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ORG_ADMIN', 'PROJECT_MANAGER', 'PROJECT_MANAGER_LEAD', 'MANAGER', 'DEPARTMENT_MANAGER', 'EMPLOYEE', 'SALES_MANAGER_LEAD', 'SALES_MANAGER', 'SYSTEM_ENGINEER', 'CLIENT', 'H24', 'H24_LEAD'] }
  },
  {
    path: 'tickets',
    loadChildren: () => import('./features/ticketing/ticketing.module').then(m => m.TicketingModule)
  },
  {
    path: 'reset-password',
    component: LoginComponent
  },
  {
    path: 'org-admin',
    loadChildren: () => import('./features/dashboard-org-admin/org-admin.module').then(m => m.OrgAdminModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ORG_ADMIN'] }
  },
  {
    path: 'gm',
    loadChildren: () => import('./features/dashboard-gm/gm-dashboard.module').then(m => m.GmDashboardModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['PROJECT_MANAGER', 'PROJECT_MANAGER_LEAD', 'MANAGER', 'DEPARTMENT_MANAGER'] }
  },
  {
    path: 'crm',
    loadChildren: () => import('./features/dashboard-crm/dashboard-crm.module').then(m => m.DashboardCrmModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['MANAGER','PROJECT_MANAGER', 'PROJECT_MANAGER_LEAD', 'SALES_MANAGER_LEAD', 'SALES_MANAGER', 'SYSTEM_ENGINEER'] }
  },
  {
    path: 'crm/sales',
    component: SalesDashboardComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['MANAGER','PROJECT_MANAGER', 'PROJECT_MANAGER_LEAD', 'SALES_MANAGER_LEAD', 'SALES_MANAGER', 'SYSTEM_ENGINEER'] }
  },
  {
    path: 'department',
    component: MyDepartmentPageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['DEPARTMENT_MANAGER', 'PROJECT_MANAGER', 'PROJECT_MANAGER_LEAD'] }
  },
  {
    path: 'employee',
    component: DashboardEmployeeComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard, RoleGuard],
    data: { employeePage: 'home', roles: ['EMPLOYEE'] }
  },
  { path: 'employee/tasks', component: DashboardEmployeeComponent, canActivate: [AuthGuard, RoleGuard], data: { roles: ['EMPLOYEE'], employeePage: 'tasks' } },
  { path: 'employee/actions', component: DashboardEmployeeComponent, canActivate: [AuthGuard, RoleGuard], data: { roles: ['EMPLOYEE'], employeePage: 'actions' } },
  { path: 'employee/schedule', component: DashboardEmployeeComponent, canActivate: [AuthGuard, RoleGuard], data: { roles: ['EMPLOYEE'], employeePage: 'schedule' } },
  { path: 'employee/projects', component: DashboardEmployeeComponent, canActivate: [AuthGuard, RoleGuard], data: { roles: ['EMPLOYEE'], employeePage: 'projects' } },
  { path: 'employee/notifications', component: DashboardEmployeeComponent, canActivate: [AuthGuard, RoleGuard], data: { roles: ['EMPLOYEE'], employeePage: 'notifications' } },
  {
    path: 'owner',
    loadChildren: () => import('./features/dashboard-owner/dashboard-owner.module').then(m => m.DashboardOwnerModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['PLATFORM_OWNER'] }
  },
  {
    path: 'gm/my-department',
    component: MyDepartmentPageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['PROJECT_MANAGER', 'PROJECT_MANAGER_LEAD'] }
  },
  {
    path: 'department/resources',
    component: ResourceSettingsPageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['PROJECT_MANAGER', 'PROJECT_MANAGER_LEAD', 'DEPARTMENT_MANAGER'] }
  },
  { path: 'forbidden', component: ForbiddenComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
