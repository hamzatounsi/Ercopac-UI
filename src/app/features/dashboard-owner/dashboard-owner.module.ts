import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OwnerDashboardPageComponent } from './pages/owner-dashboard-page/owner-dashboard-page.component';
import { DashboardOwnerRoutingModule } from './dashboard-owner-routing.module';
import { CreateOrganisationPageComponent } from './pages/create-organisation-page/create-organisation-page.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    OwnerDashboardPageComponent,
    CreateOrganisationPageComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    DashboardOwnerRoutingModule
  ]
})
export class DashboardOwnerModule {}