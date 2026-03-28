import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GmDashboardService } from '../../../services/gm-dashboard.service';

interface ProjectKpiView {
  title: string;
  value: string | number;
  hint: string;
  accent?: 'blue' | 'green' | 'orange' | 'purple';
}

@Component({
  selector: 'app-gm-projectum-page',
  templateUrl: './gm-projectum-page.component.html',
  styleUrls: ['./gm-projectum-page.component.scss']
})
export class GmProjectumPageComponent implements OnInit {
  projects: any[] = [];
  filteredProjects: any[] = [];
  searchTerm: string = '';
  loading: boolean = false;
  error: string | null = null;

  selectedProjectId: number | null = null;
  selectedProject: any | null = null;

  portfolioKpis: any = null;
  projectKpis: any = null;
  displayedKpis: ProjectKpiView[] = [];

  stats = {
    totalProjects: 0,
    activeProjects: 0,
    delayedProjects: 0,
    averageProgress: 0
  };

  constructor(
    private gmDashboardService: GmDashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loading = true;
    this.error = null;

    this.gmDashboardService.getProjects().subscribe({
      next: (response) => {
        this.projects = response || [];
        this.filteredProjects = [...this.projects];
        this.computeStatistics();

        this.gmDashboardService.getPortfolioKpis().subscribe({
          next: (kpiResponse) => {
            this.portfolioKpis = kpiResponse;
            this.selectedProjectId = null;
            this.selectedProject = null;
            this.projectKpis = null;
            this.displayPortfolioKpis();
            this.loading = false;
          },
          error: (error) => {
            console.error('Failed to load portfolio KPIs', error);
            this.error = 'Failed to load portfolio KPIs.';
            this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('Failed to load projects', error);
        this.error = 'Failed to load projects.';
        this.loading = false;
      }
    });
  }

  loadProjects(): void {
    this.loadInitialData();
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

  selectProject(project: any): void {
    if (!project?.id) {
      return;
    }

    this.selectedProjectId = project.id;
    this.selectedProject = project;
    this.loading = true;

    this.gmDashboardService.getProjectKpis(project.id).subscribe({
      next: (response) => {
        this.projectKpis = response;
        this.displayProjectKpis();
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load project KPIs', error);
        this.error = 'Failed to load selected project KPIs.';
        this.loading = false;
      }
    });
  }

  clearSelection(): void {
    this.selectedProjectId = null;
    this.selectedProject = null;
    this.projectKpis = null;
    this.displayPortfolioKpis();
  }

  openProject(projectId: number): void {
    this.router.navigate(['/gm/projects', projectId]);
  }

  goToScheduleInit(): void {
    this.router.navigate(['/gm/projects/schedule-init']);
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  }

  private displayPortfolioKpis(): void {
    if (!this.portfolioKpis) {
      this.displayedKpis = [];
      return;
    }

    this.displayedKpis = [
      {
        title: 'Total Projects',
        value: this.portfolioKpis.totalProjects,
        hint: 'Projects in portfolio',
        accent: 'blue'
      },
      {
        title: 'Active Projects',
        value: this.portfolioKpis.activeProjects,
        hint: 'Currently active',
        accent: 'green'
      },
      {
        title: 'Delayed Projects',
        value: this.portfolioKpis.delayedProjects,
        hint: 'Delayed or at risk',
        accent: 'orange'
      },
      {
        title: 'Average Progress',
        value: `${this.portfolioKpis.averageProgress}%`,
        hint: 'Across all projects',
        accent: 'purple'
      },
      {
        title: 'Total Budget',
        value: this.formatCurrency(this.portfolioKpis.totalBudget),
        hint: 'Combined budgets',
        accent: 'blue'
      },
      {
        title: 'On-Time Rate',
        value: `${this.portfolioKpis.onTimeRate}%`,
        hint: 'Projects not delayed',
        accent: 'green'
      }
    ];
  }

  private displayProjectKpis(): void {
    if (!this.projectKpis) {
      this.displayedKpis = [];
      return;
    }

    this.displayedKpis = [
      {
        title: 'Total Tasks',
        value: this.projectKpis.totalTasks,
        hint: 'Tasks in project',
        accent: 'blue'
      },
      {
        title: 'Completed Tasks',
        value: this.projectKpis.completedTasks,
        hint: 'Finished tasks',
        accent: 'green'
      },
      {
        title: 'Delayed Tasks',
        value: this.projectKpis.delayedTasks,
        hint: 'Delayed against baseline',
        accent: 'orange'
      },
      {
        title: 'Average Progress',
        value: `${this.projectKpis.averageTaskProgress}%`,
        hint: 'Average completion',
        accent: 'purple'
      },
      {
        title: 'Project Budget',
        value: this.formatCurrency(this.projectKpis.projectBudget),
        hint: 'Selected project budget',
        accent: 'blue'
      },
      {
        title: 'Planned Duration',
        value: `${this.projectKpis.plannedDurationDays} d`,
        hint: 'Planned duration',
        accent: 'green'
      }
    ];
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