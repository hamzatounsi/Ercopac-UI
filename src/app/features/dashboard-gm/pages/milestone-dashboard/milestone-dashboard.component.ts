import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { GmDashboardService } from '../../services/gm-dashboard.service';
import { MilestoneService } from '../../services/milestone.service';
import { GmProjectTimelineService } from '../../services/gm-project-timeline.service';
import { GmProjectScheduleTask } from '../../models/gm-project-schedule-task.model';

interface TimelineDay {
  label: string;
  isWeekend: boolean;
  isToday: boolean;
}

interface TimelineMonth {
  label: string;
  width: number;
}

/** Milestone as displayed in the dashboard, built from the schedule task. */
export interface DashboardMilestone {
  id: number;                 // task id
  projectId: number;
  taskName: string;
  milestoneTypeId: number | null;
  milestoneTypeCode: string;
  milestoneTypeLabel: string;
  milestoneTypeColor: string;
  milestoneDate: string;      // yyyy-MM-dd (actual date, fallback baseline)
  dateSource: 'actual' | 'baseline';
  baselineDate: string | null;
}

@Component({
  selector: 'app-milestone-dashboard',
  templateUrl: './milestone-dashboard.component.html',
  styleUrls: ['./milestone-dashboard.component.scss']
})
export class MilestoneDashboardComponent implements OnInit {
  projectId: number | null = null;
  projectName = '';

  projects: any[] = [];
  milestones: DashboardMilestone[] = [];
  private milestonesByProject = new Map<number, DashboardMilestone[]>();
  loading = false;
  errorMessage = '';

  // Filter range: 1 Jan (last year) → 31 Dec (+3 years), e.g. 2025 → 2029
  startDate: string;
  endDate: string;

  dayWidth = 30;

  // Cached timeline (rebuilt only on init / Apply)
  days: TimelineDay[] = [];
  months: TimelineMonth[] = [];
  timelineWidth = 0;

  private scrollEl?: HTMLElement;
  private pendingScroll = true;

  // Setter runs as soon as the *ngIf renders the scroll container
  @ViewChild('timelineScroll')
  set timelineScroll(ref: ElementRef<HTMLElement> | undefined) {
    this.scrollEl = ref?.nativeElement;
    if (this.scrollEl && this.pendingScroll) {
      setTimeout(() => this.scrollToCurrentMonth());
    }
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly milestoneService: MilestoneService,
    private readonly dashboardService: GmDashboardService,
    private readonly timelineService: GmProjectTimelineService
  ) {
    const year = new Date().getFullYear();
    this.startDate = this.toDateInput(new Date(year - 1, 0, 1));
    this.endDate = this.toDateInput(new Date(year + 3, 11, 31));
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.projectId = idParam ? Number(idParam) : null;
    this.buildTimeline();
    this.loadData();
  }

  // ---------- Filter ----------

  applyFilter(): void {
    if (!this.startDate || !this.endDate) {
      this.errorMessage = 'Please select both a start and an end date.';
      return;
    }
    if (this.asDate(this.startDate) > this.asDate(this.endDate)) {
      this.errorMessage = 'The start date must be before the end date.';
      return;
    }
    this.errorMessage = '';
    this.buildTimeline();
    this.pendingScroll = true;
    this.loadMilestones();
    if (this.scrollEl) {
      setTimeout(() => this.scrollToCurrentMonth());
    }
  }

  // ---------- Timeline ----------

  private buildTimeline(): void {
    const start = this.asDate(this.startDate);
    const end = this.asDate(this.endDate);
    const todayKey = new Date().toDateString();

    const days: TimelineDay[] = [];
    const months: TimelineMonth[] = [];

    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      days.push({
        label: String(d.getDate()).padStart(2, '0'),
        isWeekend: dow === 0 || dow === 6,
        isToday: d.toDateString() === todayKey
      });

      const label = d
        .toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
        .toUpperCase(); // e.g. "SEP 2026"
      const last = months[months.length - 1];
      if (last && last.label === label) {
        last.width += this.dayWidth;
      } else {
        months.push({ label, width: this.dayWidth });
      }
    }

    this.days = days;
    this.months = months;
    this.timelineWidth = days.length * this.dayWidth;
  }

  scrollToCurrentMonth(): void {
    if (!this.scrollEl) return;
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const offsetDays = this.dayDiff(this.asDate(this.startDate), firstOfMonth);
    if (offsetDays < 0 || offsetDays >= this.days.length) {
      this.pendingScroll = false;
      return;
    }
    this.scrollEl.scrollLeft = offsetDays * this.dayWidth;
    this.pendingScroll = false;
  }

  milestoneOffsetPx(milestone: DashboardMilestone): number {
    const offsetDays = this.dayDiff(this.asDate(this.startDate), this.asDate(milestone.milestoneDate));
    return Math.max(0, offsetDays * this.dayWidth + this.dayWidth / 2);
  }

  // ---------- Data ----------

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

  private resolveProjectName(): void {
    if (!this.projectId) {
      this.projectName = '';
      return;
    }
    const project = this.projects.find((p: any) => Number(p.id) === this.projectId);
    this.projectName = project?.name || project?.projectName || `Project #${this.projectId}`;
  }

  /**
   * Reads milestones directly from each project's schedule so the dashboard
   * always shows the same date as the Schedule page:
   *   actual date (actualStart) → fallback baseline date.
   * Only milestone types marked "shared" are displayed.
   */
  loadMilestones(): void {
    if (!this.projects.length) {
      this.milestones = [];
      this.milestonesByProject.clear();
      this.loading = false;
      return;
    }

    this.loading = true;
    const rangeStart = this.startDate;
    const rangeEnd = this.endDate;

    const requests = this.projects.map(project => {
      const projectId = Number(project.id);
      return forkJoin({
        tasks: this.timelineService.getProjectSchedule(projectId).pipe(
          catchError(() => of([] as GmProjectScheduleTask[]))
        ),
        types: this.milestoneService.getMilestoneTypes(projectId).pipe(
          catchError(() => of([] as any[]))
        )
      }).pipe(
        map(({ tasks, types }) => this.toDashboardMilestones(projectId, tasks ?? [], types ?? [], rangeStart, rangeEnd))
      );
    });

    forkJoin(requests).subscribe({
      next: perProject => {
        this.milestones = perProject.flat();
        this.milestonesByProject.clear();
        this.milestones.forEach(m => {
          const list = this.milestonesByProject.get(m.projectId) ?? [];
          list.push(m);
          this.milestonesByProject.set(m.projectId, list);
        });
        this.milestonesByProject.forEach(list =>
          list.sort((a, b) => a.milestoneDate.localeCompare(b.milestoneDate))
        );
        this.loading = false;
      },
      error: () => {
        this.milestones = [];
        this.milestonesByProject.clear();
        this.loading = false;
        this.errorMessage = 'Milestones could not be loaded. Please try again.';
      }
    });
  }

  private toDashboardMilestones(
    projectId: number,
    tasks: GmProjectScheduleTask[],
    types: any[],
    rangeStart: string,
    rangeEnd: string
  ): DashboardMilestone[] {
    const typeById = new Map<number, any>(types.map(t => [Number(t.id), t]));

    return tasks
      .filter(task => (task.taskType || '').toUpperCase() === 'MILESTONE')
      .map(task => {
        const typeId = task.milestoneTypeId == null ? null : Number(task.milestoneTypeId);
        const type = typeId != null ? typeById.get(typeId) : undefined;
        if (!type || type.shared !== true) return null;           // only shared types

        const actual = this.normalizeDate(task.actualStart ?? task.actualEnd);
        const baseline = this.normalizeDate(
          task.baselineStart ?? task.plannedStart ?? task.baselineEnd ?? task.plannedEnd
        );
        const date = actual ?? baseline;
        if (!date || date < rangeStart || date > rangeEnd) return null;

        return {
          id: task.id,
          projectId,
          taskName: task.name ?? '',
          milestoneTypeId: typeId,
          milestoneTypeCode: type.letterCode || type.code || 'M',
          milestoneTypeLabel: type.label || type.code || task.name || 'Milestone',
          milestoneTypeColor: type.color || task.color || '#6b7280',
          milestoneDate: date,
          dateSource: actual ? 'actual' : 'baseline',
          baselineDate: baseline
        } as DashboardMilestone;
      })
      .filter((m): m is DashboardMilestone => m !== null);
  }

  milestonesFor(projectId: number | string): DashboardMilestone[] {
    return this.milestonesByProject.get(Number(projectId)) ?? [];
  }

  milestoneTitle(m: DashboardMilestone): string {
    const main = `${m.milestoneTypeLabel} — ${this.formatDate(m.milestoneDate)} (${m.dateSource === 'actual' ? 'Actual' : 'Baseline'})`;
    return m.dateSource === 'actual' && m.baselineDate && m.baselineDate !== m.milestoneDate
      ? `${main}\nBaseline: ${this.formatDate(m.baselineDate)}`
      : main;
  }

  // ---------- Display helpers ----------

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
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ---------- trackBy ----------

  trackProject(_: number, project: any): number { return Number(project.id); }
  trackMilestone(_: number, milestone: DashboardMilestone): number { return milestone.id; }
  trackIndex(index: number): number { return index; }

  // ---------- Date utils ----------

  /** Accepts yyyy-MM-dd, yyyy-MM-ddTHH:mm..., or dd.MM.yyyy → yyyy-MM-dd */
  private normalizeDate(value?: string | null): string | null {
    if (!value) return null;
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const dotted = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
    if (dotted) return `${dotted[3]}-${dotted[2]}-${dotted[1]}`;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : this.toDateInput(d);
  }

  private dayDiff(from: Date, to: Date): number {
    return Math.round((to.getTime() - from.getTime()) / 86400000);
  }

  private toDateInput(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private asDate(value: string): Date {
    return new Date(`${value}T00:00:00`);
  }
}