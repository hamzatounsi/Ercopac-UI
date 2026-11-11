import { AppNavButtonsComponent } from 'src/app/core/navigation/app-nav-buttons.component';
import { ProfileMenuComponent } from 'src/app/core/navigation/profile-menu.component';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
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
import { CategoriesSettingsComponent } from './pages/categories-settings/categories-settings.component';
import { AccountsSettingsComponent } from './pages/accounts-settings/accounts-settings.component';
import { ClientDashboardComponent } from './pages/client-dashboard/client-dashboard.component';

// Shell
import { TicketingLayoutComponent } from './components/ticketing-layout/ticketing-layout.component';
import { TicketNotificationsComponent } from './components/ticket-notifications/ticket-notifications.component';

// Reusable form parts
import { SelectOrManualComponent } from './components/select-or-manual/select-or-manual.component';
import { ResourceEmployeePickerComponent } from './components/resource-employee-picker/resource-employee-picker.component';
import { CustomerImportComponent } from './components/customer-import/customer-import.component';

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
    CategoriesSettingsComponent,
    AccountsSettingsComponent,
    ClientDashboardComponent,
    TicketingLayoutComponent,
    TicketNotificationsComponent,
    SelectOrManualComponent,
    ResourceEmployeePickerComponent,
    CustomerImportComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TicketingRoutingModule,
    TranslateModule,
    AppNavButtonsComponent, ProfileMenuComponent
  ]
})
export class TicketingModule {}
