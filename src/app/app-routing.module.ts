import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './features/login/login.component';
import { DashboardDmComponent } from './features/dashboard-dm/dashboard-dm.component';
import { DashboardEmployeeComponent } from './features/dashboard-employee/dashboard-employee.component';

import { AuthGuard } from './core/auth/auth.guard';
import { RoleGuard } from './core/auth/role.guard';

const routes: Routes = [

  // default route
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // login page (public)
  { path: 'login', component: LoginComponent },

  // GM dashboard
{
  path: 'gm',
  loadChildren: () =>
    import('./features/dashboard-gm/gm-dashboard.module')
      .then(m => m.GmDashboardModule),
  canActivate: [AuthGuard, RoleGuard],
  data: { roles: ['ROLE_GENERAL_MANAGER'] }
},

  // Department Manager dashboard
  {
    path: 'department',
    component: DashboardDmComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ROLE_DEPARTMENT_MANAGER'] }
  },

  // Employee dashboard
  {
    path: 'employee',
    component: DashboardEmployeeComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ROLE_EMPLOYEE'] }
  },

  // fallback
  { path: '**', redirectTo: 'login' }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
