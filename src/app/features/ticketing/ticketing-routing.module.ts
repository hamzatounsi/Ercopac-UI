import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'src/app/core/auth/auth.guard';
import { RoleGuard } from 'src/app/core/auth/role.guard';

import { TicketingLayoutComponent } from './components/ticketing-layout/ticketing-layout.component';
import { TicketDashboardPageComponent } from './pages/ticket-dashboard-page/ticket-dashboard-page.component';
import { TicketDetailsPageComponent } from './pages/ticket-details-page/ticket-details-page.component';
import { PerformanceDashboardComponent } from './pages/performance-dashboard/performance-dashboard.component';
import { PlatformSettingsComponent } from './pages/platform-settings/platform-settings.component';
import { StatusesSettingsComponent } from './pages/statuses-settings/statuses-settings.component';
import { PrioritiesSettingsComponent } from './pages/priorities-settings/priorities-settings.component';
import { CustomersSettingsComponent } from './pages/customers-settings/customers-settings.component';
import { H24AgentsSettingsComponent } from './pages/h24-agents-settings/h24-agents-settings.component';
import { L2TechniciansSettingsComponent } from './pages/l2-technicians-settings/l2-technicians-settings.component';
import { LanguageSettingsComponent } from './pages/language-settings/language-settings.component';
import { LiveChatComponent } from './pages/live-chat/live-chat.component';
import { TicketCreatePageComponent } from './pages/ticket-create-page/ticket-create-page.component';
import { TICKETING_LEAD_ROLES, TICKETING_ROLES, TICKETING_STAFF_ROLES } from './ticketing-roles';

const staffOnly = { canActivate: [RoleGuard], data: { roles: TICKETING_STAFF_ROLES } };
const leadsOnly = { canActivate: [RoleGuard], data: { roles: TICKETING_LEAD_ROLES } };

const routes: Routes = [
  {
    path: '',
    component: TicketingLayoutComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: TICKETING_ROLES, excludeRoles: ['ORG_ADMIN', 'PLATFORM_OWNER'] },
    children: [
      { path: '', component: TicketDashboardPageComponent },
      { path: 'dashboard', component: PerformanceDashboardComponent, ...leadsOnly },
      { path: 'chat', component: LiveChatComponent },
      { path: 'new', component: TicketCreatePageComponent },
      // Settings: everyone sets their language; the support team sees the rest, leads change it
      {
        path: 'settings',
        component: PlatformSettingsComponent,
        children: [
          { path: '', redirectTo: 'language', pathMatch: 'full' },
          { path: 'language', component: LanguageSettingsComponent },
          { path: 'h24-agents', component: H24AgentsSettingsComponent, ...staffOnly },
          { path: 'l2-technicians', component: L2TechniciansSettingsComponent, ...staffOnly },
          { path: 'statuses', component: StatusesSettingsComponent, ...staffOnly },
          { path: 'priorities', component: PrioritiesSettingsComponent, ...staffOnly },
          { path: 'customers', component: CustomersSettingsComponent, ...staffOnly }
        ]
      },
      // Keep last: any other segment is a ticket id
      { path: ':id', component: TicketDetailsPageComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TicketingRoutingModule {}
