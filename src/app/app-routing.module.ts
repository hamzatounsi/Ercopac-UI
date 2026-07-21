import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './features/login/login.component';
import { DashboardDmComponent } from './features/dashboard-dm/dashboard-dm.component';
import { DashboardEmployeeComponent } from './features/dashboard-employee/dashboard-employee.component';
import { ForbiddenComponent } from './features/forbidden/forbidden.component';
import { MyDepartmentPageComponent } from './features/dashboard-department/pages/my-department-page/my-department-page.component';
import { ResourceSettingsPageComponent } from './features/dashboard-department/pages/resource-settings-page/resource-settings-page.component';

import { AuthGuard } from './core/auth/auth.guard';
import { RoleGuard } from './core/auth/role.guard';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: LoginComponent },

  {
    path: 'reset-password',
    component: LoginComponent
  },

  // Organisation administration is isolated from operational workspaces.
  {
    path: 'org-admin',
    loadChildren: () =>
      import('./features/dashboard-org-admin/org-admin.module')
        .then(m => m.OrgAdminModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ORG_ADMIN'] }
  },

  // GM module — full dashboard
  {
    path: 'gm',
    loadChildren: () =>
      import('./features/dashboard-gm/gm-dashboard.module').then(m => m.GmDashboardModule),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: ['GENERAL_MANAGER', 'PLATFORM_OWNER']
    }
  },

  // CRM module
  {
    path: 'crm',
    loadChildren: () =>
      import('./features/dashboard-crm/dashboard-crm.module')
        .then(m => m.DashboardCrmModule),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: ['GENERAL_MANAGER', 'PLATFORM_OWNER']
    }
  },

  // DEPARTMENT MANAGER — lands here after login
{
  path: 'department',
  component: MyDepartmentPageComponent,
  canActivate: [AuthGuard, RoleGuard],
  data: {
    roles: ['DEPARTMENT_MANAGER', 'GENERAL_MANAGER', 'PLATFORM_OWNER']
  }
},
  // EMPLOYEE dashboard
  {
    path: 'employee',
    component: DashboardEmployeeComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: ['EMPLOYEE']                    // ← fixed: only EMPLOYEE
    }
  },

  // OWNER module
  {
    path: 'owner',
    loadChildren: () =>
      import('./features/dashboard-owner/dashboard-owner.module')
        .then(m => m.DashboardOwnerModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['PLATFORM_OWNER'] }
  },

  // GM accessing My Department page directly
  {
    path: 'gm/my-department',
    component: MyDepartmentPageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: ['GENERAL_MANAGER', 'PLATFORM_OWNER']
    }
  },

  // Resource settings
  {
    path: 'department/resources',
    component: ResourceSettingsPageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['GENERAL_MANAGER', 'DEPARTMENT_MANAGER'] }
  },

  { path: 'forbidden', component: ForbiddenComponent },

  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
