import { Component, OnInit } from '@angular/core';
import { GmDashboardService } from '../../services/gm-dashboard.service';
import { MilestoneService, ProjectMilestone } from '../../services/milestone.service';

@Component({
  selector: 'app-milestone-dashboard',
  templateUrl: './milestone-dashboard.component.html',
  styleUrls: ['./milestone-dashboard.component.scss']
})
export class MilestoneDashboardComponent implements OnInit {
  projects: any[] = [];
  milestones: ProjectMilestone[] = [];
  loading = false;
  errorMessage = '';
  startDate = this.toDateInput(new Date(new Date().getFullYear() - 1, 0, 1));
  endDate = this.toDateInput(new Date(new Date().getFullYear() + 5, 11, 31));

  constructor(
    private readonly milestoneService: MilestoneService,
    private readonly dashboardService: GmDashboardService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.dashboardService.getProjects().subscribe({
      next: projects => {
        this.projects = projects ?? [];
        this.loadMilestones();
      },
      error: () => {
        this.projects = [];
        this.loading = false;
        this.errorMessage = 'Projects could not be loaded. Please try again.';
      }
    });
  }

  loadMilestones(): void {
    if (!this.projects.length) {
      this.milestones = [];
      this.loading = false;
      return;
    }

    this.milestoneService.getMilestonesByDateRange(
      this.projects.map(project => Number(project.id)), this.startDate, this.endDate
    ).subscribe({
      next: milestones => {
        this.milestones = milestones ?? [];
        this.loading = false;
      },
      error: () => {
        this.milestones = [];
        this.loading = false;
        this.errorMessage = 'Milestones could not be loaded. Please try again.';
      }
    });
  }

  milestonesFor(projectId: number | string): ProjectMilestone[] {
    return this.milestones
      .filter(milestone => Number(milestone.projectId) === Number(projectId))
      .sort((left, right) => left.milestoneDate.localeCompare(right.milestoneDate));
  }

  get timelineWidth(): number { return Math.max(900, this.daysInRange * 12); }
  get daysInRange(): number {
    return Math.max(1, Math.round((this.asDate(this.endDate).getTime() - this.asDate(this.startDate).getTime()) / 86400000) + 1);
  }
  get months(): { label: string; width: number }[] {
    const months: { label: string; width: number }[] = [];
    let cursor = new Date(this.asDate(this.startDate).getFullYear(), this.asDate(this.startDate).getMonth(), 1);
    const end = this.asDate(this.endDate);
    while (cursor <= end) {
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const visibleStart = cursor < this.asDate(this.startDate) ? this.asDate(this.startDate) : cursor;
      const visibleEnd = monthEnd > end ? end : monthEnd;
      const days = Math.round((visibleEnd.getTime() - visibleStart.getTime()) / 86400000) + 1;
      months.push({ label: cursor.toLocaleDateString('en-GB', { month: 'long', year: '2-digit' }).toUpperCase(), width: days / this.daysInRange * 100 });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return months;
  }
  milestoneOffset(milestone: ProjectMilestone): number {
    const offset = Math.round((this.asDate(milestone.milestoneDate).getTime() - this.asDate(this.startDate).getTime()) / 86400000);
    return Math.max(0, Math.min(100, offset / this.daysInRange * 100));
  }

  projectTitle(project: any): string {
    return project.name || project.projectName || project.code || `Project #${project.id}`;
  }

  formatDate(value: string): string {
    if (!value) return 'No date';
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  trackProject(_: number, project: any): number { return Number(project.id); }
  trackMilestone(_: number, milestone: ProjectMilestone): number { return milestone.id; }

  private toDateInput(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  private asDate(value: string): Date { return new Date(`${value}T00:00:00`); }
}
