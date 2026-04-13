import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OwnerDashboardPageComponent } from './pages/owner-dashboard-page/owner-dashboard-page.component';

const routes: Routes = [
  {
    path: '',
    component: OwnerDashboardPageComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardOwnerRoutingModule {}