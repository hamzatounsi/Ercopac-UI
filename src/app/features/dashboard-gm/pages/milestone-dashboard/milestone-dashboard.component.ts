import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GmDashboardService } from '../../services/gm-dashboard.service';
import { MilestoneService, ProjectMilestone } from '../../services/milestone.service';

interface TimelineDay {
  label: string;
  isWeekend: boolean;
  isToday: boolean;
}

interface TimelineMonth {
  label: string;
  width: number;
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
  milestones: ProjectMilestone[] = [];
  loading = false;
  errorMessage = '';

  // Filter range: 1 Jan (last year) → 31 Dec (+3 years), e.g. 2025 → 2029
  startDate: string;
  endDate: string;

  dayWidth = 30;

  // Cached timeline (rebuilt only on init / Apply, never on change detection)
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
    private readonly dashboardService: GmDashboardService
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
    // Fixed columns are sticky inside the same scroller,
    // so scrollLeft is simply the offset inside the timeline track.
    this.scrollEl.scrollLeft = offsetDays * this.dayWidth;
    this.pendingScroll = false;
  }

  milestoneOffsetPx(milestone: ProjectMilestone): number {
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

  loadMilestones(): void {
    if (!this.projects.length) {
      this.milestones = [];
      this.loading = false;
      return;
    }

    this.milestoneService
      .getMilestonesByDateRange(
        this.projects.map(project => Number(project.id)),
        this.startDate,
        this.endDate
      )
      .subscribe({
        next: milestones => {
          // Backend returns only milestones where shared = true
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
  trackMilestone(_: number, milestone: ProjectMilestone): number { return milestone.id; }
  trackIndex(index: number): number { return index; }

  // ---------- Date utils ----------

  private dayDiff(from: Date, to: Date): number {
    // Math.round absorbs the 1-hour DST shift
    return Math.round((to.getTime() - from.getTime()) / 86400000);
  }

  private toDateInput(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private asDate(value: string): Date {
    return new Date(`${value}T00:00:00`);
  }
}