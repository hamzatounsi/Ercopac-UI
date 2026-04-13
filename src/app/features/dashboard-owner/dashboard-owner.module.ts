import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OwnerDashboardPageComponent } from './pages/owner-dashboard-page/owner-dashboard-page.component';
import { DashboardOwnerRoutingModule } from './dashboard-owner-routing.module';

@NgModule({
  declarations: [
    OwnerDashboardPageComponent
  ],
  imports: [
    CommonModule,
    DashboardOwnerRoutingModule
  ]
})
export class DashboardOwnerModule {}