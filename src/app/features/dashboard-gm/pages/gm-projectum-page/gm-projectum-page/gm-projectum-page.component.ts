import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  GmDashboardService,
  PortfolioKpiResponse,
  ProjectKpiResponse,
  UpsertProjectRequest
} from '../../../services/gm-dashboard.service';
import { GmResourceService } from '../../../services/gm-resource.service';
import { ProjectDashboardRow } from '../../../models/project-dashboard-row.model';
import { HealthStatus } from '../../../models/health-status.model';
import { ResourceListItem } from '../../../models/resource-list-item.model';
import { GmProjectTemplateService } from '../../../services/gm-project-template.service';

type SortColumn =
  | 'code'
  | 'name'
  | 'customer'
  | 'country'
  | 'projectType'
  | 'projectManagerName'
  | 'projectPhase'
  | 'plannedStart'
  | 'plannedEnd'
  | 'progressPercent'
  | 'riskLevel'
  | 'projectBudget';

interface TeamDepartmentGroup {
  code: string;
  label: string;
  colorClass: string;
}

@Component({
  selector: 'app-gm-projectum-page',
  templateUrl: './gm-projectum-page.component.html',
  styleUrls: ['./gm-projectum-page.component.scss']
})
export class GmProjectumPageComponent implements OnInit {
  projects: ProjectDashboardRow[] = [];
  filteredProjects: ProjectDashboardRow[] = [];

  loading = false;
  saving = false;
  error: string | null = null;

  searchTerm = '';
  selectedCountry = '';
  selectedPm = '';
  selectedCustomer = '';
  selectedStatus = '';
  selectedType = '';
  selectedRisk = '';

  selectedProjectId: number | null = null;
  selectedProject: ProjectDashboardRow | null = null;

  portfolioKpis: PortfolioKpiResponse | null = null;
  projectKpis: ProjectKpiResponse | null = null;

  sortColumn: SortColumn = 'code';
  sortDirection: 'asc' | 'desc' = 'asc';

  modalOpen = false;
  editingProjectId: number | null = null;

  // TEAM MODAL
  teamModalOpen = false;
  teamProject: ProjectDashboardRow | null = null;
  resources: ResourceListItem[] = [];
  teamAssignments: Record<number, Record<string, number[]>> = {};
  selectedTeamResource: Record<string, number | null> = {};

  readonly teamDepartments: TeamDepartmentGroup[] = [
    { code: 'ADMIN', label: 'ADMIN', colorClass: 'dept-admin' },
    { code: 'CS', label: 'CS', colorClass: 'dept-cs' },
    { code: 'EE', label: 'EE', colorClass: 'dept-ee' },
    { code: 'FIN', label: 'FIN', colorClass: 'dept-fin' },
    { code: 'HR', label: 'HR', colorClass: 'dept-hr' },
    { code: 'INST', label: 'INST', colorClass: 'dept-inst' },
    { code: 'ME', label: 'ME', colorClass: 'dept-me' },
    { code: 'MFC', label: 'MFC', colorClass: 'dept-mfc' },
    { code: 'MANAGEMENT', label: 'MANAGEMENT', colorClass: 'dept-management' },
    { code: 'OTHER', label: 'OTHER', colorClass: 'dept-other' },
    { code: 'PM', label: 'PM', colorClass: 'dept-pm' }
  ];

  projectForm: UpsertProjectRequest = {
    name: '',
    code: '',
    customer: '',
    category: '',
    country: '',
    projectType: '',
    projectPhase: 'PLANNED',
    riskLevel: '',
    plannedStart: '',
    plannedEnd: '',
    projectManagerName: '',
    programManagerName: '',
    salesManagerName: '',
    projectBudget: 0,
    estimatedCost: 0,
    comment: ''
  };

  readonly statusOptions = ['PLANNED', 'ACTIVE', 'COMPLETED', 'STANDBY', 'ARCHIVED'];
  readonly typeOptions = ['Greenfield', 'Brownfield', 'Retrofit', 'Consulting', 'R&D', 'Service'];
  readonly riskOptions = ['LOW', 'MEDIUM', 'HIGH'];

  constructor(
    private gmDashboardService: GmDashboardService,
    private gmResourceService: GmResourceService,
    private router: Router,
    private gmProjectTemplateService: GmProjectTemplateService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.loadResourcesForTeam();
    this.loadTeamAssignmentsFromStorage();
  }

  get countries(): string[] {
    return [...new Set(this.projects.map(p => p.country).filter(Boolean) as string[])].sort();
  }

  get customers(): string[] {
    return [...new Set(this.projects.map(p => p.customer).filter(Boolean) as string[])].sort();
  }

  get projectManagers(): string[] {
    return [...new Set(this.projects.map(p => p.projectManagerName).filter(Boolean) as string[])].sort();
  }

  loadInitialData(): void {
    this.loading = true;
    this.error = null;

    this.gmDashboardService.getProjects().subscribe({
      next: (projectsResponse) => {
        this.projects = (projectsResponse ?? [])
          .filter((project): project is ProjectDashboardRow & { id: number } => project.id != null)
          .map(project => ({
            ...project,
            timeHealth: this.normalizeHealthStatus(project.timeHealth),
            progressPercent: project.progressPercent ?? this.deriveProgress(project)
          }));

        this.gmDashboardService.getPortfolioKpis().subscribe({
          next: (kpiResponse) => {
            this.portfolioKpis = kpiResponse;
            this.projectKpis = null;
            this.selectedProject = null;
            this.selectedProjectId = null;
            this.applyFiltersAndSort();
            this.loading = false;
          },
          error: () => {
            this.error = 'Failed to load portfolio KPIs.';
            this.loading = false;
          }
        });
      },
      error: () => {
        this.error = 'Failed to load projects.';
        this.loading = false;
      }
    });
  }

  loadResourcesForTeam(): void {
    this.gmResourceService.getResources({
      active: true,
      page: 0,
      size: 500
    }).subscribe({
      next: (page) => {
        this.resources = page.content ?? [];
      },
      error: () => {
        this.resources = [];
      }
    });
  }

  applyFiltersAndSort(): void {
    let rows = [...this.projects];

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      rows = rows.filter(project =>
        (project.code || '').toLowerCase().includes(term) ||
        (project.name || '').toLowerCase().includes(term) ||
        (project.shortName || '').toLowerCase().includes(term) ||
        (project.customer || '').toLowerCase().includes(term) ||
        (project.country || '').toLowerCase().includes(term)
      );
    }

    if (this.selectedCountry) {
      rows = rows.filter(p => (p.country || '') === this.selectedCountry);
    }

    if (this.selectedPm) {
      rows = rows.filter(p => (p.projectManagerName || '') === this.selectedPm);
    }

    if (this.selectedCustomer) {
      rows = rows.filter(p => (p.customer || '') === this.selectedCustomer);
    }

    if (this.selectedStatus) {
      rows = rows.filter(p => (p.projectPhase || '') === this.selectedStatus);
    }

    if (this.selectedType) {
      rows = rows.filter(p => (p.projectType || '') === this.selectedType);
    }

    if (this.selectedRisk) {
      rows = rows.filter(p => (p.riskLevel || '').toUpperCase() === this.selectedRisk);
    }

    rows.sort((a, b) => this.compareRows(a, b));
    this.filteredProjects = rows;
  }

  onSearch(): void {
    this.applyFiltersAndSort();
  }

  onFilterChange(): void {
    this.applyFiltersAndSort();
  }

  setSort(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.applyFiltersAndSort();
  }

  selectProject(project: ProjectDashboardRow): void {
    if (!project?.id) {
      return;
    }

    if (this.selectedProjectId === project.id) {
      this.clearSelection();
      return;
    }

    this.selectedProjectId = project.id;
    this.selectedProject = project;
    this.loading = true;
    this.error = null;

    this.gmDashboardService.getProjectKpis(project.id).subscribe({
      next: (response) => {
        this.projectKpis = response;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load selected project KPIs.';
        this.loading = false;
      }
    });
  }

  clearSelection(): void {
    this.selectedProjectId = null;
    this.selectedProject = null;
    this.projectKpis = null;
  }

  openProject(projectId?: number | null): void {
    if (projectId == null) {
      this.error = 'This project has no valid id.';
      return;
    }

    this.router.navigate(['/gm/projects', projectId, 'schedule']);
  }

  openCreateModal(): void {
    this.editingProjectId = null;
    this.projectForm = {
      name: '',
      code: '',
      customer: '',
      category: '',
      country: '',
      projectType: '',
      projectPhase: 'PLANNED',
      riskLevel: '',
      plannedStart: '',
      plannedEnd: '',
      projectManagerName: '',
      programManagerName: '',
      salesManagerName: '',
      projectBudget: 0,
      estimatedCost: 0,
      comment: ''
    };
    this.modalOpen = true;
  }

  openEditModal(project: ProjectDashboardRow, event?: MouseEvent): void {
    event?.stopPropagation();

    if (project.id == null) {
      this.error = 'This project cannot be edited because its id is missing.';
      return;
    }

    this.editingProjectId = project.id ?? null;

    this.projectForm = {
      name: project.name || '',
      code: project.code || '',
      customer: project.customer || '',
      category: project.category || '',
      country: project.country || '',
      projectType: project.projectType || '',
      projectPhase: project.projectPhase || 'PLANNED',
      riskLevel: project.riskLevel || '',
      plannedStart: this.toInputDate(project.plannedStart),
      plannedEnd: this.toInputDate(project.plannedEnd),
      projectManagerName: project.projectManagerName || '',
      programManagerName: project.programManagerName || '',
      salesManagerName: project.salesManagerName || '',
      projectBudget: project.projectBudget || 0,
      estimatedCost: project.estimatedCost || 0,
      
    };

    this.modalOpen = true;
  }

  closeModal(): void {
    if (!this.saving) {
      this.modalOpen = false;
    }
  }

  saveProject(): void {
    if (!this.projectForm.name?.trim() || !this.projectForm.code?.trim()) {
      this.error = 'Project name and project code are required.';
      return;
    }

    this.saving = true;
    this.error = null;

    const request$ = this.editingProjectId
      ? this.gmDashboardService.updateProject(this.editingProjectId, this.projectForm)
      : this.gmDashboardService.createProject(this.projectForm);

    request$.subscribe({
      next: () => {
        this.modalOpen = false;
        this.saving = false;
        this.loadInitialData();
      },
      error: () => {
        this.error = this.editingProjectId
          ? 'Failed to update project.'
          : 'Failed to create project.';
        this.saving = false;
      }
    });
  }

  archiveProject(project: ProjectDashboardRow, event: MouseEvent): void {
    event.stopPropagation();

    if (!project.id) {
      return;
    }

    this.gmDashboardService.archiveProject(project.id).subscribe({
      next: () => this.loadInitialData(),
      error: () => {
        this.error = 'Failed to archive project.';
      }
    });
  }

  // ===== TEAM =====

  openTeamModal(project: ProjectDashboardRow, event?: MouseEvent): void {
    event?.stopPropagation();

    if (!project.id) {
      return;
    }

    this.teamProject = project;
    this.teamModalOpen = true;

    if (!this.teamAssignments[project.id]) {
      this.teamAssignments[project.id] = {};
    }

    this.selectedTeamResource = {};
  }

  closeTeamModal(): void {
    this.teamModalOpen = false;
    this.teamProject = null;
    this.selectedTeamResource = {};
  }

  getResourcesForDepartment(dept: string): ResourceListItem[] {
    return this.resources
      .filter(resource => this.normalizeDepartment(resource.departmentCode) === dept)
      .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  }

  getAssignedResources(dept: string): ResourceListItem[] {
    if (!this.teamProject?.id) {
      return [];
    }

    const ids = this.teamAssignments[this.teamProject.id]?.[dept] ?? [];
    return ids
      .map(id => this.resources.find(resource => resource.id === id))
      .filter((resource): resource is ResourceListItem => !!resource);
  }

  addTeamMember(dept: string): void {
    if (!this.teamProject?.id) {
      return;
    }

    const resourceId = this.selectedTeamResource[dept];
    if (!resourceId) {
      return;
    }

    if (!this.teamAssignments[this.teamProject.id]) {
      this.teamAssignments[this.teamProject.id] = {};
    }

    if (!this.teamAssignments[this.teamProject.id][dept]) {
      this.teamAssignments[this.teamProject.id][dept] = [];
    }

    const deptAssignments = this.teamAssignments[this.teamProject.id][dept];
    if (!deptAssignments.includes(resourceId)) {
      deptAssignments.push(resourceId);
    }

    this.selectedTeamResource[dept] = null;
  }

  removeTeamMember(dept: string, resourceId: number): void {
    if (!this.teamProject?.id) {
      return;
    }

    const deptAssignments = this.teamAssignments[this.teamProject.id]?.[dept] ?? [];
    this.teamAssignments[this.teamProject.id][dept] = deptAssignments.filter(id => id !== resourceId);
  }

  saveTeamAssignments(): void {
    this.saveTeamAssignmentsToStorage();
    this.closeTeamModal();
  }

  private saveTeamAssignmentsToStorage(): void {
    localStorage.setItem('ercopac-project-team-assignments', JSON.stringify(this.teamAssignments));
  }

  private loadTeamAssignmentsFromStorage(): void {
    const raw = localStorage.getItem('ercopac-project-team-assignments');
    if (!raw) {
      this.teamAssignments = {};
      return;
    }

    try {
      this.teamAssignments = JSON.parse(raw);
    } catch {
      this.teamAssignments = {};
    }
  }

  private normalizeDepartment(value?: string | null): string {
    const raw = (value || '').trim().toUpperCase();

    if (!raw) return 'OTHER';
    if (raw.includes('ADMIN')) return 'ADMIN';
    if (raw === 'CS') return 'CS';
    if (raw === 'EE') return 'EE';
    if (raw === 'FIN') return 'FIN';
    if (raw === 'HR') return 'HR';
    if (raw === 'INST' || raw === 'INSTALLATION') return 'INST';
    if (raw === 'ME') return 'ME';
    if (raw.startsWith('MFC')) return 'MFC';
    if (raw === 'MANAGEMENT') return 'MANAGEMENT';
    if (raw === 'PM') return 'PM';

    return 'OTHER';
  }

  // ===== UI HELPERS =====

  getStatusLabel(project: ProjectDashboardRow): string {
    return project.projectPhase || '-';
  }

  getStatusClass(project: ProjectDashboardRow): string {
    const status = (project.projectPhase || '').toUpperCase();

    if (status === 'ACTIVE') return 'status-active';
    if (status === 'COMPLETED') return 'status-completed';
    if (status === 'STANDBY') return 'status-on-hold';
    if (status === 'ARCHIVED') return 'status-archived';
    return 'status-planned';
  }

  getRiskLabel(project: ProjectDashboardRow): string {
    const risk = (project.riskLevel || '').toUpperCase();

    if (risk === 'HIGH') return 'High';
    if (risk === 'MEDIUM') return 'Medium';
    return 'Low';
  }

  getRiskClass(project: ProjectDashboardRow): string {
    const risk = this.getRiskLabel(project);
    if (risk === 'High') return 'risk-high';
    if (risk === 'Medium') return 'risk-med';
    return 'risk-low';
  }

  formatDate(value?: string): string {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    });
  }

  private toInputDate(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().slice(0, 10);
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';

    if (value >= 1_000_000) {
      return `€${(value / 1_000_000).toFixed(1)}M`;
    }

    if (value >= 1_000) {
      return `€${Math.round(value / 1_000)}K`;
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  }

  get activeKpiTitle(): string {
    return 'Portfolio KPIs';
  }

  get activeKpiSubtitle(): string {
    return this.selectedProject
      ? `Filtered: ${this.selectedProject.name}`
      : `All Projects · ${this.filteredProjects.length} projects`;
  }

  get scheduleAverageProgress(): number {
    return this.selectedProject
      ? (this.projectKpis?.averageTaskProgress ?? 0)
      : (this.portfolioKpis?.averageProgress ?? 0);
  }

  get scheduleActiveProjects(): number {
    return this.selectedProject ? 1 : (this.portfolioKpis?.activeProjects ?? 0);
  }

  get scheduleTotalTasks(): number {
    return this.selectedProject
      ? (this.projectKpis?.totalTasks ?? 0)
      : (this.portfolioKpis?.totalTasks ?? 0);
  }

  get scheduleCompletedTasks(): number {
    return this.selectedProject
      ? (this.projectKpis?.completedTasks ?? 0)
      : (this.portfolioKpis?.completedTasks ?? 0);
  }

  get financeBudget(): number {
    return this.selectedProject
      ? (this.projectKpis?.projectBudget ?? 0)
      : (this.portfolioKpis?.totalBudget ?? 0);
  }

  get financeEstimatedCost(): number {
    return this.selectedProject
      ? (this.projectKpis?.estimatedCost ?? 0)
      : (this.portfolioKpis?.estimatedCost ?? 0);
  }

  get countriesCount(): number {
    return this.selectedProject ? 1 : (this.portfolioKpis?.countriesCount ?? 0);
  }

  get managersCount(): number {
    return this.selectedProject
      ? (this.selectedProject.projectManagerName ? 1 : 0)
      : (this.portfolioKpis?.projectManagersCount ?? 0);
  }

  get highRiskCount(): number {
    if (this.selectedProject) {
      return (this.selectedProject.riskLevel || '').toUpperCase() === 'HIGH' ? 1 : 0;
    }
    return this.portfolioKpis?.highRiskCount ?? 0;
  }

  get mediumRiskCount(): number {
    if (this.selectedProject) {
      return (this.selectedProject.riskLevel || '').toUpperCase() === 'MEDIUM' ? 1 : 0;
    }
    return this.portfolioKpis?.mediumRiskCount ?? 0;
  }

  get lowRiskCount(): number {
    if (this.selectedProject) {
      const risk = (this.selectedProject.riskLevel || '').toUpperCase();
      return risk !== 'HIGH' && risk !== 'MEDIUM' ? 1 : 0;
    }
    return this.portfolioKpis?.lowRiskCount ?? 0;
  }

  get overdueCount(): number {
    return this.selectedProject
      ? (this.projectKpis?.overdueTasks ?? 0)
      : (this.portfolioKpis?.overdueProjects ?? 0);
  }

  private compareRows(a: ProjectDashboardRow, b: ProjectDashboardRow): number {
    const aValue = this.getSortableValue(a, this.sortColumn);
    const bValue = this.getSortableValue(b, this.sortColumn);

    let result = 0;

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      result = aValue - bValue;
    } else {
      result = String(aValue).localeCompare(String(bValue));
    }

    return this.sortDirection === 'asc' ? result : -result;
  }

  private getSortableValue(project: ProjectDashboardRow, column: SortColumn): string | number {
    switch (column) {
      case 'progressPercent':
        return project.progressPercent ?? 0;
      case 'projectBudget':
        return project.projectBudget ?? 0;
      default:
        return (project[column] as string) ?? '';
    }
  }

  private deriveProgress(project: ProjectDashboardRow): number {
    if (project.completedTasks && project.totalTasks && project.totalTasks > 0) {
      return Math.round((project.completedTasks / project.totalTasks) * 100);
    }

    if (project.timeHealth === 'GREEN') return 70;
    if (project.timeHealth === 'YELLOW') return 40;
    if (project.timeHealth === 'RED') return 15;
    return 0;
  }

  private normalizeHealthStatus(status?: string): HealthStatus {
    switch (status) {
      case 'GREEN':
        return 'GREEN';
      case 'YELLOW':
      case 'AT_RISK':
        return 'YELLOW';
      case 'RED':
      case 'DELAYED':
        return 'RED';
      case 'NA':
      default:
        return 'NA';
    }
  }

  applyStandardTemplate(projectId: number, event?: MouseEvent): void {
    event?.stopPropagation();

    const confirmed = window.confirm(
      'Apply the standard template to this project? Existing schedule tasks will be replaced.'
    );

    if (!confirmed) {
      return;
    }

    this.gmProjectTemplateService.applyStandardTemplate(projectId).subscribe({
      next: (res) => {
        console.log('Standard template applied:', res);
        alert(`Standard template applied successfully.\nTasks created: ${res.tasksCreated}\nDependencies created: ${res.dependenciesCreated}`);
      },
      error: (err) => {
        console.error('Failed to apply standard template', err);
        alert('Failed to apply standard template.');
      }
    });
  }
}