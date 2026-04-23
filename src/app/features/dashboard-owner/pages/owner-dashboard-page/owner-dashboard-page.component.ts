import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { OwnerDashboardService } from '../../services/owner-dashboard.service';
import { OwnerKpi } from '../../models/owner-kpi.model';
import { OwnerOrganisationSummary } from '../../models/owner-organisation-summary.model';
import { OwnerProjectRow } from '../../models/owner-project-row.model';
import { OwnerAlert } from '../../models/owner-alert.model';

@Component({
  selector: 'app-owner-dashboard-page',
  templateUrl: './owner-dashboard-page.component.html',
  styleUrls: ['./owner-dashboard-page.component.scss']
})
export class OwnerDashboardPageComponent implements OnInit {
  kpis: OwnerKpi | null = null;

  organisations: OwnerOrganisationSummary[] = [];
  projects: OwnerProjectRow[] = [];
  alerts: OwnerAlert[] = [];

  filteredOrganisations: OwnerOrganisationSummary[] = [];
  filteredProjects: OwnerProjectRow[] = [];
  visibleAlerts: OwnerAlert[] = [];

  loading = false;
  errorMessage = '';

  searchTerm = '';
  organisationFilter: 'ALL' | 'ACTIVE' | 'RISK' = 'ALL';
  projectFilter: 'ALL' | 'DELAYED' | 'CRITICAL' | 'ACTIVE' = 'ALL';

  constructor(
    private ownerDashboardService: OwnerDashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  openPlatformWorkspace(): void {
    this.router.navigate(['/gm']);
  }

  openResourcesConfig(): void {
    this.router.navigate(['/owner/resources']);
  }

  openProjectDetails(projectId: number): void {
    this.router.navigate(['/gm/projects', projectId, 'details']);
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      kpis: this.ownerDashboardService.getKpis(),
      organisations: this.ownerDashboardService.getOrganisations(),
      projects: this.ownerDashboardService.getProjects(),
      alerts: this.ownerDashboardService.getAlerts()
    }).subscribe({
      next: ({ kpis, organisations, projects, alerts }) => {
        this.kpis = kpis;
        this.organisations = organisations ?? [];
        this.projects = projects ?? [];
        this.alerts = alerts ?? [];

        this.applyAllFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load owner dashboard', error);
        this.errorMessage = 'Failed to load owner dashboard data.';
        this.loading = false;
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm = value ?? '';
    this.applyAllFilters();
  }

  setOrganisationFilter(filter: 'ALL' | 'ACTIVE' | 'RISK'): void {
    this.organisationFilter = filter;
    this.applyOrganisationFilters();
  }

  setProjectFilter(filter: 'ALL' | 'DELAYED' | 'CRITICAL' | 'ACTIVE'): void {
    this.projectFilter = filter;
    this.applyProjectFilters();
  }

  get riskOrganisationCount(): number {
    return this.organisations.filter(org =>
      org.criticalProjects > 0 ||
      org.delayedProjects > 0 ||
      org.overallHealth === 'RED' ||
      org.overallHealth === 'AMBER'
    ).length;
  }

  get activeOrganisationCount(): number {
    return this.organisations.filter(org => org.projectsCount > 0).length;
  }

  get activeProjectCount(): number {
    return this.projects.filter(project => this.isProjectActive(project)).length;
  }

  get delayedProjectCount(): number {
    return this.projects.filter(project => this.isProjectDelayed(project)).length;
  }

  get criticalProjectCount(): number {
    return this.projects.filter(project => project.health === 'RED').length;
  }

  get totalAlertCount(): number {
    return this.alerts.length;
  }

  private applyAllFilters(): void {
    this.applyOrganisationFilters();
    this.applyProjectFilters();
    this.applyAlertFilters();
  }

  private applyOrganisationFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredOrganisations = this.organisations.filter(org => {
      const matchesSearch =
        !term ||
        org.organisationName.toLowerCase().includes(term);

      if (!matchesSearch) {
        return false;
      }

      switch (this.organisationFilter) {
        case 'ACTIVE':
          return org.projectsCount > 0;

        case 'RISK':
          return (
            org.criticalProjects > 0 ||
            org.delayedProjects > 0 ||
            org.overallHealth === 'RED' ||
            org.overallHealth === 'AMBER'
          );

        case 'ALL':
        default:
          return true;
      }
    });
  }

  private applyProjectFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredProjects = this.projects.filter(project => {
      const matchesSearch =
        !term ||
        project.projectCode.toLowerCase().includes(term) ||
        project.projectName.toLowerCase().includes(term) ||
        project.organisationName.toLowerCase().includes(term);

      if (!matchesSearch) {
        return false;
      }

      switch (this.projectFilter) {
        case 'DELAYED':
          return this.isProjectDelayed(project);

        case 'CRITICAL':
          return project.health === 'RED';

        case 'ACTIVE':
          return this.isProjectActive(project);

        case 'ALL':
        default:
          return true;
      }
    });
  }

  private applyAlertFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.visibleAlerts = this.alerts.filter(alert => {
      if (!term) {
        return true;
      }

      return (
        alert.type.toLowerCase().includes(term) ||
        alert.message.toLowerCase().includes(term) ||
        alert.severity.toLowerCase().includes(term)
      );
    });
  }

  private isProjectDelayed(project: OwnerProjectRow): boolean {
    return project.status?.toUpperCase().includes('DELAYED') ?? false;
  }

  private isProjectActive(project: OwnerProjectRow): boolean {
    const status = project.status?.toUpperCase() ?? '';
    return (
      status.includes('IN_PROGRESS') ||
      status.includes('ACTIVE') ||
      status.includes('EXECUTION')
    );
  }

  trackByOrganisation(index: number, item: OwnerOrganisationSummary): number {
    return item.organisationId;
  }

  trackByProject(index: number, item: OwnerProjectRow): number {
    return item.projectId;
  }

  trackByAlert(index: number, item: OwnerAlert): string {
    return `${item.type}-${item.severity}-${index}`;
  }
}