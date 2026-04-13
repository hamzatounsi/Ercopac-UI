import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './features/login/login.component';
import { DashboardDmComponent } from './features/dashboard-dm/dashboard-dm.component';
import { DashboardEmployeeComponent } from './features/dashboard-employee/dashboard-employee.component';
import { MyDepartmentPageComponent } from './features/dashboard-department/pages/my-department-page/my-department-page.component';
import { ResourceSettingsPageComponent } from './features/dashboard-department/pages/resource-settings-page/resource-settings-page.component';

import { AuthGuard } from './core/auth/auth.guard';
import { RoleGuard } from './core/auth/role.guard';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: LoginComponent },

  {
    path: 'gm',
    loadChildren: () =>
      import('./features/dashboard-gm/gm-dashboard.module').then(m => m.GmDashboardModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ROLE_GENERAL_MANAGER'] }
  },

  {
    path: 'department',
    component: DashboardDmComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ROLE_DEPARTMENT_MANAGER'] }
  },

  {
    path: 'employee',
    component: DashboardEmployeeComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ROLE_EMPLOYEE'] }
  },

  {
    path: 'owner',
    loadChildren: () =>
      import('./features/dashboard-owner/dashboard-owner.module').then(m => m.DashboardOwnerModule),
    canActivate: [AuthGuard]
  },

  {
    path: 'gm/my-department',
    component: MyDepartmentPageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ROLE_GENERAL_MANAGER'] }
  },

  {
    path: 'department/resources',
    component: ResourceSettingsPageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ROLE_GENERAL_MANAGER', 'ROLE_DEPARTMENT_MANAGER'] }
  },

  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}