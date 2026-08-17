import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GmForecastService } from '../../services/gm-forecast.service';
import { ForecastRow } from '../../models/forecast-row.model';
import { ForecastSummary } from '../../models/forecast-summary.model';
import { GmDashboardService } from '../../services/gm-dashboard.service';

@Component({
  selector: 'app-gm-project-forecast-page',
  templateUrl: './gm-project-forecast-page.component.html',
  styleUrls: ['./gm-project-forecast-page.component.scss']
})
export class GmProjectForecastPageComponent implements OnInit {
  @ViewChild('wbsBody') wbsBody!: ElementRef<HTMLElement>;
  @ViewChild('calBody') calBody!: ElementRef<HTMLElement>;

  projectId!: number;

  loading = false;
  saving = false;
  error: string | null = null;

  projectName = '';
  projectLabel = '';
  projectShortName = '';

  rows: ForecastRow[] = [];
  filteredRows: ForecastRow[] = [];
  summary: ForecastSummary | null = null;

  periods = 12;
  searchTerm = '';
  viewMode: 'week' | 'month' = 'month';
  periodType = 'month';

  savingCellKey: string | null = null;
  savingFieldKey: string | null = null;

  private isScrolling = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private forecastService: GmForecastService,
    private dashboardService: GmDashboardService
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProjectName();
    this.loadData();
  }

  loadProjectName(): void {
    this.dashboardService.getProjects().subscribe({
      next: (projects) => {
        const project = (projects ?? []).find((p: any) => p.id === this.projectId);
        this.projectName = project?.name || `Project #${this.projectId}`;
        this.projectLabel = project?.name || `Project #${this.projectId}`;
        this.projectShortName = project?.shortName || project?.code || `#${this.projectId}`;
      },
      error: () => {
        this.projectName = `Project #${this.projectId}`;
        this.projectLabel = `Project #${this.projectId}`;
        this.projectShortName = `#${this.projectId}`;
      }
    });
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    this.forecastService.getForecastGrid(this.projectId, this.periods, this.periodType).subscribe({
      next: (rows) => {
        this.rows = rows ?? [];
        this.applyFilters();

        this.forecastService.getForecastSummary(this.projectId, this.periods).subscribe({
          next: (summary) => {
            this.summary = summary;
            this.loading = false;
          },
          error: (err) => {
            console.error(err);
            this.error = 'Failed to load forecast summary.';
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load forecast data.';
        this.loading = false;
      }
    });
  }

  getRowType(row: ForecastRow): string {
    return row.rowType || 'COST';
  }

  getTypeLabel(row: ForecastRow): string {
    const type = this.getRowType(row);
    if (type === 'SUMMARY') return '—';
    if (type === 'HOUR') return 'Hours';
    return 'Cost';
  }

  getTypeBadgeClass(row: ForecastRow): string {
    const type = this.getRowType(row);
    if (type === 'HOUR') return 'hours';
    if (type === 'SUMMARY') return 'summary';
    return 'cost';
  }

  isEditableRow(row: ForecastRow): boolean {
    return this.getRowType(row) !== 'SUMMARY';
  }

  getRemainingPercent(row: ForecastRow): number {
    const budget = row.budget || 0;
    const remaining = this.getRemaining(row);
    if (!budget || budget <= 0) return 0;
    return Math.max(0, Math.min(100, (remaining / budget) * 100));
  }

  formatBudgetOrHours(row: ForecastRow): string {
    return this.getRowType(row) === 'HOUR' ? this.formatHours(row.budget) : this.formatMoney(row.budget);
  }

  formatActualOrHours(row: ForecastRow): string {
    return this.getRowType(row) === 'HOUR' ? this.formatHours(row.actualCost) : this.formatMoney(row.actualCost);
  }

  formatRemainingOrHours(row: ForecastRow): string {
    const remaining = this.getRemaining(row);
    return this.getRowType(row) === 'HOUR' ? this.formatHours(remaining) : this.formatMoney(remaining);
  }

  formatRemainingSchedule(row: ForecastRow): string {
    return this.formatMoney(row.remainingCost);
  }

  formatTotalForecast(row: ForecastRow): string {
    return this.getRowType(row) === 'HOUR' ? this.formatHours(row.totalForecast) : this.formatMoney(row.totalForecast);
  }

  formatHours(value: number | null | undefined): string {
    if (value == null) return '—';
    return `${Math.round(value)}h`;
  }

  formatPlainNumber(value: number | null | undefined): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
  }

  getHeaderYearLabel(index: number): string | null {
    const keys = this.getPeriodKeys();
    if (!keys.length) return null;
    const years = [...new Set(keys.map(k => {
      if (k.includes('-W')) return k.split('-W')[0];
      return k.split('-')[0];
    }))];
    return years[index] ?? null;
  }
getRemaining(row: ForecastRow): number {
  const budget = row.budget || 0;
  const actual = row.actualCost || 0;
  const forecast = row.totalForecast || 0;
  
  return Math.max(0, budget - actual - forecast);
}
  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredRows = [...this.rows];
      return;
    }
    this.filteredRows = this.rows.filter(row =>
      row.wbsCode.toLowerCase().includes(term) ||
      row.description.toLowerCase().includes(term)
    );
  }

  setViewMode(mode: 'week' | 'month'): void {
    this.viewMode = mode;
    this.periodType = mode;
    this.loadData();
  }

  onPeriodsChange(): void {
    this.loadData();
  }

  private cellKey(row: ForecastRow, periodKey: string): string {
    return `${row.wbsCode}__${periodKey}`;
  }

  isCellSaving(row: ForecastRow, periodKey: string): boolean {
    return this.savingCellKey === this.cellKey(row, periodKey);
  }

  onCellChange(row: ForecastRow, periodKey: string, rawValue: string): void {
    const amount = Number(rawValue || 0);
    if (Number.isNaN(amount) || amount < 0) {
      this.error = 'Invalid value entered.';
      return;
    }

    const cell = row.periods.find(p => p.periodKey === periodKey);
    const previousAmount = cell ? cell.amount : 0;

    if (cell) {
      cell.amount = amount;
    } else {
      row.periods.push({ periodKey, amount } as any);
    }
    row.totalForecast = (row.periods || []).reduce((sum, p) => sum + (p.amount || 0), 0);

    this.saving = true;
    this.savingCellKey = this.cellKey(row, periodKey);
    this.error = null;

    this.forecastService.updateForecastCell(this.projectId, {
      wbsCode: row.wbsCode,
      periodKey,
      amount
    }).subscribe({
      next: () => {
        this.saving = false;
        this.savingCellKey = null;
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to update forecast value.';
        this.saving = false;
        this.savingCellKey = null;
        if (cell) {
          cell.amount = previousAmount;
          row.totalForecast = (row.periods || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        }
      }
    });
  }

  updateLevel(row: ForecastRow): void {
    this.forecastService.updateWbsLevel(this.projectId, row.financeEntryId, row.level).subscribe({
      next: () => {},
      error: (err) => {
        console.error(err);
        this.error = 'Failed to update level.';
        this.loadData();
      }
    });
  }

  getCellAmount(row: ForecastRow, periodKey: string): number | null {
    const cell = row.periods.find(p => p.periodKey === periodKey);
    return cell ? cell.amount : null;
  }

  getPeriodKeys(): string[] {
    if (!this.rows.length) return [];
    return this.rows[0].periods.map(p => p.periodKey);
  }

  formatMonth(periodKey: string): string {
    if (periodKey.includes('-W')) {
      const parts = periodKey.split('-W');
      return `W${parts[1]} '${parts[0].slice(2)}`;
    }
    const [year, month] = periodKey.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  }

  formatMoney(value: number | null | undefined): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  }

  // ✅ NOUVELLE MÉTHODE : Synchronisation du scroll WBS → Calendar
  onWbsScroll(event: Event): void {
    if (this.isScrolling) return;
    this.isScrolling = true;
    const wbsBody = this.wbsBody.nativeElement;
    const calBody = this.calBody.nativeElement;
    calBody.scrollTop = wbsBody.scrollTop;
    requestAnimationFrame(() => {
      this.isScrolling = false;
    });
  }

  // ✅ NOUVELLE MÉTHODE : Synchronisation du scroll Calendar → WBS
  onCalScroll(event: Event): void {
    if (this.isScrolling) return;
    this.isScrolling = true;
    const wbsBody = this.wbsBody.nativeElement;
    const calBody = this.calBody.nativeElement;
    wbsBody.scrollTop = calBody.scrollTop;
    requestAnimationFrame(() => {
      this.isScrolling = false;
    });
  }
  // ✅ MÉTHODE POUR LIER UNE TÂCHE SCHEDULE AU FORECAST
  onLinkedWbsChange(row: ForecastRow): void {
    this.saving = true;
    
    this.forecastService.updateLinkedScheduleWbs(
      this.projectId, 
      row.financeEntryId, 
      row.linkedScheduleWbs || null
    ).subscribe({
      next: () => {
        this.saving = false;
        this.loadData(); // Recharger pour recalculer Remaining Schedule
      },
      error: (err: any) => {
        console.error(err);
        this.error = 'Failed to update linked task.';
        this.saving = false;
      }
    });

  }
  // ✅ NOUVELLE MÉTHODE : TrackBy pour optimiser le *ngFor
  trackByRow(index: number, row: any): number {
    return row.financeEntryId || index;
  }

  goToProjectum(): void { this.router.navigate(['/gm/projectum']); }
  goToSchedule(): void { this.router.navigate(['/gm/projects', this.projectId, 'schedule']); }
  goToActions(): void { this.router.navigate(['/gm/projects', this.projectId, 'actions']); }
  goToFinance(): void { this.router.navigate(['/gm/projects', this.projectId, 'finance']); }
  goToRisks(): void { this.router.navigate(['/gm/projects', this.projectId, 'risks']); }
  goToCr(): void { this.router.navigate(['/gm/projects', this.projectId, 'change-requests']); }
}