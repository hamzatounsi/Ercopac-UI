import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GmDashboardService } from '../../../services/gm-dashboard.service';


@Component({
  selector: 'app-gm-projectum-page',
  templateUrl: './gm-projectum-page.component.html',
  styleUrls: ['./gm-projectum-page.component.scss']
})
export class GmProjectumPageComponent implements OnInit {
back() {
throw new Error('Method not implemented.');
}
formatCurrency(arg0: any) {
throw new Error('Method not implemented.');
}
  projects: any[] = [];
  filteredProjects: any[] = [];
  searchTerm: string = '';
  loading: boolean = false;

  stats = {
    totalProjects: 0,
    activeProjects: 0,
    delayedProjects: 0,
    averageProgress: 0
  };
error: any;
project: any;

  constructor(
    private gmDashboardService: GmDashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;

    this.gmDashboardService.getProjects().subscribe({
      next: (response) => {
        this.projects = response || [];
        this.filteredProjects = [...this.projects];
        this.computeStatistics();
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load projects', error);
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      this.filteredProjects = [...this.projects];
      return;
    }

    this.filteredProjects = this.projects.filter(project =>
      (project.code || '').toLowerCase().includes(term) ||
      (project.name || '').toLowerCase().includes(term) ||
      (project.shortName || '').toLowerCase().includes(term) ||
      (project.country || '').toLowerCase().includes(term) ||
      (project.portfolio || '').toLowerCase().includes(term)
    );
  }

  openProject(projectId: number): void {
    this.router.navigate(['/gm/projects', projectId]);
  }

  goToScheduleInit(): void {
    this.router.navigate(['/gm/projects/schedule-init']);
  }

  private computeStatistics(): void {
    this.stats.totalProjects = this.projects.length;

    this.stats.activeProjects = this.projects.filter(project =>
      project.projectPhase &&
      project.projectPhase !== 'COMPLETED' &&
      project.projectPhase !== 'CLOSED'
    ).length;

    this.stats.delayedProjects = this.projects.filter(project =>
      project.timeHealth === 'DELAYED' || project.timeHealth === 'AT_RISK'
    ).length;

    this.stats.averageProgress = this.projects.length > 0 ? 64 : 0;
  }
}