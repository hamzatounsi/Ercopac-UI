import { GmDashboardService } from '../../services/gm-dashboard.service';
import { MilestoneService, ProjectMilestone } from '../../services/milestone.service';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
@Component({
  selector: 'app-milestone-dashboard',
  templateUrl: './milestone-dashboard.component.html',
  styleUrls: ['./milestone-dashboard.component.scss']
})
export class MilestoneDashboardComponent implements OnInit {
  // ✅ Contexte projet (repris de la route, même logique que Finance) — utilisé
  // uniquement pour l'affichage du header (badge projet + barre d'onglets).
  // Ne filtre PAS le tableau : celui-ci reste global (tous les projets).
  projectId: number | null = null;
  projectName = '';

  projects: any[] = [];
  milestones: ProjectMilestone[] = [];
  loading = false;
  errorMessage = '';
  startDate = this.toDateInput(new Date(new Date().getFullYear() - 1, 0, 1));
  endDate = this.toDateInput(new Date(new Date().getFullYear() + 5, 11, 31));
  
  // ✅ Largeur fixe par jour en pixels (comme ta version originale qui marchait)
  dayWidth = 30;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly milestoneService: MilestoneService,
    private readonly dashboardService: GmDashboardService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.projectId = idParam ? Number(idParam) : null;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.dashboardService.getProjects().subscribe({
      next: projects => {
        this.projects = projects ?? [];
        this.resolveProjectName();
        this.loadMilestones();
      },
      error: () => {
        this.projects = [];
        this.loading = false;
        this.errorMessage = 'Projects could not be loaded. Please try again.';
      }
    });
  }

  // ✅ Résout le nom du projet courant pour le badge du header (même logique que Finance).
  // N'affecte pas la liste `projects` ni le tableau des milestones.
  private resolveProjectName(): void {
    if (!this.projectId) { this.projectName = ''; return; }
    const project = this.projects.find((p: any) => Number(p.id) === this.projectId);
    this.projectName = project?.name || project?.projectName || `Project #${this.projectId}`;
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

  // ✅ Largeur totale de la timeline en pixels
  get timelineWidth(): number {
    return this.daysInRange * this.dayWidth;
  }

  get daysInRange(): number {
    return Math.max(1, Math.round((this.asDate(this.endDate).getTime() - this.asDate(this.startDate).getTime()) / 86400000) + 1);
  }

  // ✅ Liste des mois avec largeur en pixels
  get months(): { label: string; width: number }[] {
    const months: { label: string; width: number }[] = [];
    let cursor = new Date(this.asDate(this.startDate).getFullYear(), this.asDate(this.startDate).getMonth(), 1);
    const end = this.asDate(this.endDate);
    while (cursor <= end) {
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const visibleStart = cursor < this.asDate(this.startDate) ? this.asDate(this.startDate) : cursor;
      const visibleEnd = monthEnd > end ? end : monthEnd;
      const days = Math.round((visibleEnd.getTime() - visibleStart.getTime()) / 86400000) + 1;
      months.push({ 
        label: cursor.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).toUpperCase(), 
        width: days * this.dayWidth 
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return months;
  }

  // ✅ Liste des jours
  get days(): { label: string; isWeekend: boolean }[] {
    const daysList = [];
    let cursor = this.asDate(this.startDate);
    const end = this.asDate(this.endDate);
    while (cursor <= end) {
      const dayOfWeek = cursor.getDay();
      daysList.push({
        label: cursor.getDate().toString().padStart(2, '0'),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return daysList;
  }

  // ✅ Position du milestone en PIXELS (pas en pourcentage)
  milestoneOffsetPx(milestone: ProjectMilestone): number {
    const offsetDays = Math.round((this.asDate(milestone.milestoneDate).getTime() - this.asDate(this.startDate).getTime()) / 86400000);
    return Math.max(0, offsetDays * this.dayWidth + (this.dayWidth / 2));
  }

  projectTitle(project: any): string {
    return project.name || project.projectName || project.code || `Project #${project.id}`;
  }

  getProjectStat(project: any): string {
    return project.projectPhase || project.status || 'A';
  }

  getPMInitials(project: any): string {
    const name = project.projectManagerName;
    if (!name || name.trim() === '') return '—';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
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