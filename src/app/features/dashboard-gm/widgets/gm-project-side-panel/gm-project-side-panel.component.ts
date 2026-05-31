import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
  selector: 'app-gm-project-side-panel',
  templateUrl: './gm-project-side-panel.component.html',
  styleUrls: ['./gm-project-side-panel.component.scss']
})
export class GmProjectSidePanelComponent {

  @Input() projectId!: number;
  @Input() currentPage: 'gantt' | 'actions' | 'finance' | 'forecast' | 'risk' | 'cr' = 'gantt';

  expanded = false;

  constructor(private auth: AuthService , private router: Router) {}

  togglePanel(): void {
    this.expanded = !this.expanded;
  }

  goToProjectum(): void {
    this.router.navigate(['/gm/projectum']);
  }

  goToSchedule(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'schedule']);
  }

  goToActions(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'actions']);
  }

  goToFinance(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'finance']);
  }

  goToForecast(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'forecast']);
  }

  goToRisks(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'risks']);
  }

  goToCr(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'change-requests']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}