import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'src/app/core/auth/auth.guard';
import { RoleGuard } from 'src/app/core/auth/role.guard';
import { TicketDashboardPageComponent } from './pages/ticket-dashboard-page/ticket-dashboard-page.component';
import { TicketCreatePageComponent } from './pages/ticket-create-page/ticket-create-page.component';
import { TicketDetailsPageComponent } from './pages/ticket-details-page/ticket-details-page.component';

// 👇 MISE À JOUR : Ajout de H24 et H24_LEAD aux rôles autorisés
const roles = [
  'CLIENT',
  'SALES_MANAGER',
  'SALES_MANAGER_LEAD',
  'PLATFORM_OWNER',
  'ORG_ADMIN',
  'MANAGER',
  'H24',        // 👈 AJOUT
  'H24_LEAD'    // 👈 AJOUT
];

const routes: Routes = [
  {
    path: '',
    component: TicketDashboardPageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles }
  },
  {
    path: 'new',
    component: TicketCreatePageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles }
  },
  {
    path: ':id',
    component: TicketDetailsPageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TicketingRoutingModule {}