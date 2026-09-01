import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CompanyDashboard, CompanyDashboardService, RevenueForecast } from '../../services/company-dashboard.service';
import { MilestoneService, ProjectMilestone } from '../../services/milestone.service';

interface TimelineDay {
  date: Date;
  label: string;
  isMonthStart: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
}

interface TimelineMonth {
  label: string;
  width: number;
}

@Component({ selector: 'app-project-performance', templateUrl: './project-performance.component.html', styleUrls: ['./project-performance.component.scss'] })
export class ProjectPerformanceComponent implements OnInit, OnDestroy {
  // ✅ FIX: synchronisation du scroll horizontal entre le header (mois/jours)
  // et le corps de la timeline Milestone — sans ça le header reste figé
  // (ex. bloqué sur "AUG 2026") pendant que le corps défile.
  @ViewChild('timelineBodyScroll') timelineBodyScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('timelineHeaderScroll') timelineHeaderScroll!: ElementRef<HTMLDivElement>;

  dashboard: CompanyDashboard | null = null;
  revenue: RevenueForecast | null = null;
  loading = true;
  error = '';
  view: 'performance' | 'revenue-forecast' | 'milestone' = 'performance';
  year = new Date().getFullYear();
  actuals = true;
  private sub?: Subscription;
  revenueWindow: 6 | 12 = 12;
  revenueMode: 'forecast' | 'budget' | 'variance' = 'forecast';

  // ===================== MILESTONE (company-wide, tous PM confondus) =====================
  milestones: ProjectMilestone[] = [];
  milestonesLoading = false;
  milestonesLoaded = false;
  timelineDays: TimelineDay[] = [];
  timelineMonths: TimelineMonth[] = [];
  dayWidth = 30;
  msStartDate!: Date;
  msEndDate!: Date;

  statusFilter = 'ALL';
  pmFilter = 'ALL';
  statusMenuOpen = false;
  pmMenuOpen = false;

  constructor(
    private service: CompanyDashboardService,
    private milestoneService: MilestoneService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.buildMilestoneDateRange();
    this.sub = this.route.queryParamMap.subscribe(q => {
      const v = q.get('view');
      this.view = v === 'revenue-forecast' ? 'revenue-forecast' : v === 'milestone' ? 'milestone' : 'performance';
      this.load();
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service.getDashboard().subscribe({
      next: d => {
        this.dashboard = d;
        this.service.getRevenueForecast(this.year).subscribe({
          next: r => {
            this.revenue = r;
            this.loading = false;
            if (this.view === 'milestone') this.loadMilestones();
          },
          error: () => { this.error = 'Revenue forecast could not be loaded.'; this.loading = false; }
        });
      },
      error: () => { this.error = 'Project performance data could not be loaded.'; this.loading = false; }
    });
  }

  setView(view: 'performance' | 'revenue-forecast' | 'milestone'): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { view }, queryParamsHandling: 'merge' });
    if (view === 'milestone' && !this.milestonesLoaded) this.loadMilestones();
  }

  changeYear(): void { this.load(); }
  back(): void { this.router.navigate(['/gm/command-center']); }

  pct(value: number, total: number): number { return total ? Math.round(value / total * 100) : 0; }
  money(value: number | null | undefined): string { return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(value || 0); }
  cell(month: number, row: number[]): number { return row[month] || 0; }
  displayedMonths(r: RevenueForecast) { return r.months.slice(0, this.revenueWindow); }
  displayedValue(project: any, index: number): number {
    const forecast = this.cell(index, project.monthlyForecast);
    if (this.revenueMode === 'forecast') return forecast;
    const monthlyBudget = (project.budget || 0) / 12;
    return this.revenueMode === 'budget' ? monthlyBudget : forecast - monthlyBudget;
  }
  monthValue(r: RevenueForecast, index: number): number {
    const forecast = r.months[index]?.forecast || 0;
    if (this.revenueMode === 'forecast') return forecast;
    const monthlyBudget = (r.totalBudget || 0) / 12;
    return this.revenueMode === 'budget' ? monthlyBudget : forecast - monthlyBudget;
  }
  isCurrentMonth(key: string): boolean { return key === `${this.year}-${String(new Date().getMonth() + 1).padStart(2, '0')}`; }
  bestMonth(r: RevenueForecast): string { return r.months.reduce((best, month) => month.forecast > best.forecast ? month : best, r.months[0])?.label || '—'; }

  // ===================== MILESTONE LOGIC (même pattern que milestone-dashboard.component) =====================

  private buildMilestoneDateRange(): void {
    const today = new Date();
    this.msStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    this.msEndDate = new Date(today.getFullYear(), today.getMonth() + 4, 0);
    this.buildTimeline();
  }

  private buildTimeline(): void {
    const days: TimelineDay[] = [];
    const cursor = new Date(this.msStartDate);
    while (cursor <= this.msEndDate) {
      const dayOfWeek = cursor.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      days.push({
        date: new Date(cursor),
        label: cursor.getDate().toString().padStart(2, '0'),
        isMonthStart: cursor.getDate() === 1,
        isWeekend,
        isHoliday: this.isHoliday(cursor),
        holidayName: this.getHolidayName(cursor)
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    this.timelineDays = days;
    this.buildMonths();
  }

  private buildMonths(): void {
    const months: TimelineMonth[] = [];
    let currentMonth = '';
    let currentLabel = '';
    let currentCount = 0;
    this.timelineDays.forEach((day, index) => {
      const monthKey = `${day.date.getFullYear()}-${day.date.getMonth()}`;
      const label = day.date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).toUpperCase();
      if (monthKey !== currentMonth) {
        if (currentCount > 0) months.push({ label: currentLabel, width: currentCount * this.dayWidth });
        currentMonth = monthKey;
        currentLabel = label;
        currentCount = 1;
      } else {
        currentCount++;
      }
      if (index === this.timelineDays.length - 1) months.push({ label: currentLabel, width: currentCount * this.dayWidth });
    });
    this.timelineMonths = months;
  }

  private isHoliday(date: Date): boolean {
    const month = date.getMonth();
    const day = date.getDate();
    return (month === 4 && day === 1) || (month === 11 && day === 25);
  }

  private getHolidayName(date: Date): string | undefined {
    const month = date.getMonth();
    const day = date.getDate();
    if (month === 4 && day === 1) return 'Labour Day';
    if (month === 11 && day === 25) return 'Christmas';
    return undefined;
  }

  loadMilestones(): void {
    if (!this.dashboard?.projects?.length) { this.milestonesLoaded = true; return; }
    this.milestonesLoading = true;

    const projectIds = this.dashboard.projects
      .map(p => p.id)
      .filter((id): id is number => typeof id === 'number' && id > 0);

    // ✅ DEBUG temporaire — vérifie dans la console ce qui est vraiment envoyé.
    // Supprime ces 2 lignes une fois le problème confirmé résolu.
    console.log('[Milestone/Command Center] projectIds envoyés:', projectIds);
    console.log('[Milestone/Command Center] plage de dates:', this.formatDate(this.msStartDate), '->', this.formatDate(this.msEndDate));

    if (!projectIds.length) {
      console.warn('[Milestone/Command Center] Aucun projectId valide — dashboard.projects:', this.dashboard.projects);
      this.milestones = [];
      this.milestonesLoading = false;
      this.milestonesLoaded = true;
      return;
    }

    const startDateStr = this.formatDate(this.msStartDate);
    const endDateStr = this.formatDate(this.msEndDate);
    this.milestoneService.getMilestonesByDateRange(projectIds, startDateStr, endDateStr).subscribe({
      next: (milestones) => {
        console.log('[Milestone/Command Center] réponse reçue:', milestones);
        this.milestones = milestones;
        this.milestonesLoading = false;
        this.milestonesLoaded = true;
      },
      error: (err) => {
        console.error('[Milestone/Command Center] erreur API:', err);
        this.milestonesLoading = false;
        this.milestonesLoaded = true;
      }
    });
  }

  formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getTimelineWidth(): number { return this.timelineDays.length * this.dayWidth; }

  getMilestoneLeft(milestone: ProjectMilestone): number {
    if (!milestone.milestoneDate) return -100;
    const date = new Date(milestone.milestoneDate);
    const dayIndex = this.timelineDays.findIndex(d => d.date.toDateString() === date.toDateString());
    if (dayIndex === -1) return -100;
    return dayIndex * this.dayWidth + (this.dayWidth / 2);
  }

  getMilestonesForProject(projectId: number): ProjectMilestone[] {
    return this.milestones.filter(m => m.projectId === projectId);
  }

  getRowHeight(): number { return 32; }

  // ✅ FIX: synchronise le scroll horizontal du header avec le corps de la timeline
  onTimelineScroll(): void {
    const bodyEl = this.timelineBodyScroll?.nativeElement;
    const headerEl = this.timelineHeaderScroll?.nativeElement;
    if (bodyEl && headerEl) {
      headerEl.scrollLeft = bodyEl.scrollLeft;
    }
  }

  // ============ FILTERS (company-wide: filtre par health, et par PM) ============

  get uniqueStatuses(): string[] {
    const statuses = (this.dashboard?.projects ?? []).map(p => p.health || p.phase || 'A');
    return ['ALL', ...Array.from(new Set(statuses))].sort();
  }

  get uniquePMs(): string[] {
    const pms = (this.dashboard?.projects ?? []).map(p => p.manager || '—');
    return ['ALL', ...Array.from(new Set(pms))].sort();
  }

  get filteredMilestoneProjects() {
    return (this.dashboard?.projects ?? []).filter(project => {
      const statusMatch = this.statusFilter === 'ALL' || (project.health || project.phase || 'A') === this.statusFilter;
      const pmMatch = this.pmFilter === 'ALL' || (project.manager || '—') === this.pmFilter;
      return statusMatch && pmMatch;
    });
  }

  toggleStatusMenu(): void { this.statusMenuOpen = !this.statusMenuOpen; this.pmMenuOpen = false; }
  togglePMMenu(): void { this.pmMenuOpen = !this.pmMenuOpen; this.statusMenuOpen = false; }
  setStatusFilter(status: string): void { this.statusFilter = status; this.statusMenuOpen = false; }
  setPMFilter(pm: string): void { this.pmFilter = pm; this.pmMenuOpen = false; }

  getPMInitials(project: { manager: string | null }): string {
    const name = project.manager;
    if (!name || String(name).trim() === '') return '—';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return '—';
  }
}