import { AppNavButtonsComponent } from 'src/app/core/navigation/app-nav-buttons.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TicketingRoutingModule } from './ticketing-routing.module';

// Pages
import { TicketDashboardPageComponent } from './pages/ticket-dashboard-page/ticket-dashboard-page.component';
import { TicketCreatePageComponent } from './pages/ticket-create-page/ticket-create-page.component';
import { TicketDetailsPageComponent } from './pages/ticket-details-page/ticket-details-page.component';
import { PerformanceDashboardComponent } from './pages/performance-dashboard/performance-dashboard.component';
import { LiveChatComponent } from './pages/live-chat/live-chat.component';

// Settings
import { PlatformSettingsComponent } from './pages/platform-settings/platform-settings.component';
import { StatusesSettingsComponent } from './pages/statuses-settings/statuses-settings.component';
import { PrioritiesSettingsComponent } from './pages/priorities-settings/priorities-settings.component';
import { CustomersSettingsComponent } from './pages/customers-settings/customers-settings.component';
import { H24AgentsSettingsComponent } from './pages/h24-agents-settings/h24-agents-settings.component';
import { L2TechniciansSettingsComponent } from './pages/l2-technicians-settings/l2-technicians-settings.component';
import { LanguageSettingsComponent } from './pages/language-settings/language-settings.component';

// Shell
import { TicketingLayoutComponent } from './components/ticketing-layout/ticketing-layout.component';
import { TicketNotificationsComponent } from './components/ticket-notifications/ticket-notifications.component';

@NgModule({
  declarations: [
    TicketDashboardPageComponent,
    TicketCreatePageComponent,
    TicketDetailsPageComponent,
    PerformanceDashboardComponent,
    LiveChatComponent,
    PlatformSettingsComponent,
    StatusesSettingsComponent,
    PrioritiesSettingsComponent,
    CustomersSettingsComponent,
    H24AgentsSettingsComponent,
    L2TechniciansSettingsComponent,
    LanguageSettingsComponent,
    TicketingLayoutComponent,
    TicketNotificationsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TicketingRoutingModule,
    AppNavButtonsComponent
  ]
})
export class TicketingModule {}
