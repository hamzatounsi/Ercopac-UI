import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'src/app/core/auth/auth.guard';
import { RoleGuard } from 'src/app/core/auth/role.guard';

// Layout
import { TicketingLayoutComponent } from './components/ticketing-layout/ticketing-layout.component';

// Pages
import { TicketDashboardPageComponent } from './pages/ticket-dashboard-page/ticket-dashboard-page.component';
import { TicketDetailsPageComponent } from './pages/ticket-details-page/ticket-details-page.component';
import { PerformanceDashboardComponent } from './pages/performance-dashboard/performance-dashboard.component';
import { PlatformSettingsComponent } from './pages/platform-settings/platform-settings.component';
import { StatusesSettingsComponent } from './pages/statuses-settings/statuses-settings.component';
import { PrioritiesSettingsComponent } from './pages/priorities-settings/priorities-settings.component';
import { CustomersSettingsComponent } from './pages/customers-settings/customers-settings.component';
import { H24AgentsSettingsComponent } from './pages/h24-agents-settings/h24-agents-settings.component';
import { L2TechniciansSettingsComponent } from './pages/l2-technicians-settings/l2-technicians-settings.component';

const roles = [
  'CLIENT', 'SALES_MANAGER', 'SALES_MANAGER_LEAD', 'PLATFORM_OWNER', 
  'ORG_ADMIN', 'MANAGER', 'H24', 'H24_LEAD'
];

const routes: Routes = [
  {
    path: '',
    component: TicketingLayoutComponent, // 👈 Le Layout qui contient la Sidebar
    canActivate: [AuthGuard, RoleGuard],
    data: { roles },
    children: [
      { path: '', component: TicketDashboardPageComponent },
      { path: 'dashboard', component: PerformanceDashboardComponent },
      { path: ':id', component: TicketDetailsPageComponent },
      {
        path: 'settings',
        component: PlatformSettingsComponent,
        children: [
          { path: 'statuses', component: StatusesSettingsComponent },
          { path: 'priorities', component: PrioritiesSettingsComponent },
          { path: 'customers', component: CustomersSettingsComponent },
          { path: 'h24-agents', component: H24AgentsSettingsComponent },
          { path: 'l2-technicians', component: L2TechniciansSettingsComponent },
          { path: '', redirectTo: 'statuses', pathMatch: 'full' }
        ]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TicketingRoutingModule {}