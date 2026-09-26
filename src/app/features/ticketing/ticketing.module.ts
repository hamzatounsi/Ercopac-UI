import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TicketingRoutingModule } from './ticketing-routing.module';

// Pages principales
import { TicketDashboardPageComponent } from './pages/ticket-dashboard-page/ticket-dashboard-page.component';
import { TicketCreatePageComponent } from './pages/ticket-create-page/ticket-create-page.component';
import { TicketDetailsPageComponent } from './pages/ticket-details-page/ticket-details-page.component';

// Pages Platform Settings (dans le dossier pages/)
import { PlatformSettingsComponent } from './pages/platform-settings/platform-settings.component';
import { StatusesSettingsComponent } from './pages/statuses-settings/statuses-settings.component';
import { PrioritiesSettingsComponent } from './pages/priorities-settings/priorities-settings.component';
import { CustomersSettingsComponent } from './pages/customers-settings/customers-settings.component';
import { H24AgentsSettingsComponent } from './pages/h24-agents-settings/h24-agents-settings.component';
import { L2TechniciansSettingsComponent } from './pages/l2-technicians-settings/l2-technicians-settings.component';
import { ProjectsSettingsComponent } from './pages/projects-settings/projects-settings.component';
import { EquipmentCatalogueSettingsComponent } from './pages/equipment-catalogue-settings/equipment-catalogue-settings.component';
import { PerformanceDashboardComponent } from './pages/performance-dashboard/performance-dashboard.component';
import { TicketingLayoutComponent } from './components/ticketing-layout/ticketing-layout.component';

@NgModule({
  declarations: [
    TicketDashboardPageComponent,
    TicketCreatePageComponent,
    TicketDetailsPageComponent,
    PlatformSettingsComponent,
    StatusesSettingsComponent,
    PrioritiesSettingsComponent,
    CustomersSettingsComponent,
    H24AgentsSettingsComponent,
    L2TechniciansSettingsComponent,
    ProjectsSettingsComponent,
    EquipmentCatalogueSettingsComponent,
    PerformanceDashboardComponent,
    TicketingLayoutComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TicketingRoutingModule
  ]
})
export class TicketingModule {}