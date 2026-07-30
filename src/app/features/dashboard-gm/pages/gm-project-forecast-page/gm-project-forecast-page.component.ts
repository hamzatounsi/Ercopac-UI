import { Component, OnInit } from '@angular/core';
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

  // Tracks which specific cell (row wbsCode + periodKey) is currently being saved,
  // so we can show a per-cell saving state instead of freezing the whole grid.
  savingCellKey: string | null = null;

  // Tracks which specific row field is currently being saved (e.g. "SAP-001__budget"),
  // used the same way as savingCellKey but for the WBS-panel fields.
  savingFieldKey: string | null = null;

  // Manual type overrides set by the user via the Type dropdown, keyed by wbsCode.
  // When present, this takes priority over the automatic keyword-based detection.
  private typeOverrides: { [wbsCode: string]: 'Hours' | 'Cost' | '—' } = {};

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

    this.forecastService.getForecastGrid(this.projectId, this.periods).subscribe({
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

  // ---------- Type / labels ----------

  getTypeLabel(row: ForecastRow): string {
    const override = this.typeOverrides[row.wbsCode];
    if (override) {
      return override;
    }

    const text = `${row.description || ''}`.toLowerCase();
    const wbs = `${row.wbsCode || ''}`.toLowerCase();

    if (text.includes('design') || text.includes('install') || text.includes('commission') || text.includes('engineering')) {
      return 'Hours';
    }

    if (text.includes('hardware') || text.includes('site') || text.includes('long lead') || text.includes('procurement') || text.includes('cost')) {
      return 'Cost';
    }

    if ((row.level || 0) <= 2) {
      return '—';
    }

    return 'Cost';
  }

  getTypeBadgeClass(row: ForecastRow): string {
    const type = this.getTypeLabel(row);

    if (type === 'Hours') return 'hours';
    if (type === 'Cost') return 'cost';
    return 'summary';
  }

  // Rows that are pure aggregation/summary rows (no own periods to edit)
  isEditableRow(row: ForecastRow): boolean {
    return this.getTypeLabel(row) !== '—';
  }

  // ---------- Formatting ----------

  getRemainingPercent(row: ForecastRow): number {
    const budget = row.budget || 0;
    const remaining = this.getRemaining(row);

    if (!budget || budget <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, (remaining / budget) * 100));
  }

  formatBudgetOrHours(row: ForecastRow): string {
    return this.getTypeLabel(row) === 'Hours'
      ? this.formatHours(row.budget)
      : this.formatMoney(row.budget);
  }

  formatActualOrHours(row: ForecastRow): string {
    return this.getTypeLabel(row) === 'Hours'
      ? this.formatHours(row.actualCost)
      : this.formatMoney(row.actualCost);
  }

  formatRemainingOrHours(row: ForecastRow): string {
    const remaining = this.getRemaining(row);
    return this.getTypeLabel(row) === 'Hours'
      ? this.formatHours(remaining)
      : this.formatMoney(remaining);
  }

  formatTotalForecast(row: ForecastRow): string {
    return this.getTypeLabel(row) === 'Hours'
      ? this.formatHours(row.totalForecast)
      : this.formatMoney(row.totalForecast);
  }

  formatForecastCell(row: ForecastRow, periodKey: string): string {
    const value = this.getCellAmount(row, periodKey) ?? 0;
    return this.getTypeLabel(row) === 'Hours'
      ? `${Math.round(value)}h`
      : this.formatPlainNumber(value);
  }

  formatHours(value: number | null | undefined): string {
    if (value == null) {
      return '—';
    }
    return `${Math.round(value)}h`;
  }

  formatPlainNumber(value: number | null | undefined): string {
    if (value == null) {
      return '—';
    }
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0
    }).format(value);
  }

  getHeaderYearLabel(index: number): string | null {
    const keys = this.getPeriodKeys();
    if (!keys.length) return null;

    const years = [...new Set(keys.map(k => k.split('-')[0]))];
    return years[index] ?? null;
  }

  // ---------- Filtering / view ----------

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
  }

  onPeriodsChange(): void {
    this.loadData();
  }

  // ---------- Editing ----------

  private cellKey(row: ForecastRow, periodKey: string): string {
    return `${row.wbsCode}__${periodKey}`;
  }

  isCellSaving(row: ForecastRow, periodKey: string): boolean {
    return this.savingCellKey === this.cellKey(row, periodKey);
  }

  onCellChange(row: ForecastRow, periodKey: string, rawValue: string): void {
    const amount = Number(rawValue || 0);

    if (Number.isNaN(amount) || amount < 0) {
      // Revert visually by reloading; invalid input is ignored.
      this.error = 'Invalid value entered.';
      return;
    }

    // Optimistic local update so the row Total Forecast and the cell
    // reflect the change immediately, before the backend confirms.
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
        // Reload to sync totals/summary exactly with backend-calculated values.
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to update forecast value.';
        this.saving = false;
        this.savingCellKey = null;

        // Roll back the optimistic change on failure.
        if (cell) {
          cell.amount = previousAmount;
          row.totalForecast = (row.periods || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        }
      }
    });
  }

  // ---------- Row-field editing (Description / Type / Budget / Actual) ----------

  private fieldKey(row: ForecastRow, field: string): string {
    return `${row.wbsCode}__${field}`;
  }

  isFieldSaving(row: ForecastRow, field: string): boolean {
    return this.savingFieldKey === this.fieldKey(row, field);
  }

  private saveRowField(
    row: ForecastRow,
    field: 'description' | 'budget' | 'actualCost' | 'type',
    value: string | number,
    rollback: () => void
  ): void {
    this.saving = true;
    this.savingFieldKey = this.fieldKey(row, field);
    this.error = null;

    this.forecastService.updateForecastRow(this.projectId, {
      wbsCode: row.wbsCode,
      field,
      value
    }).subscribe({
      next: () => {
        this.saving = false;
        this.savingFieldKey = null;
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.error = `Failed to update ${field}.`;
        this.saving = false;
        this.savingFieldKey = null;
        rollback();
      }
    });
  }

  onDescriptionChange(row: ForecastRow, rawValue: string): void {
    const previous = row.description;
    const value = (rawValue || '').trim();

    row.description = value;
    this.saveRowField(row, 'description', value, () => {
      row.description = previous;
    });
  }

  onBudgetChange(row: ForecastRow, rawValue: string): void {
    const amount = Number(rawValue || 0);

    if (Number.isNaN(amount) || amount < 0) {
      this.error = 'Invalid budget value.';
      return;
    }

    const previous = row.budget;
    row.budget = amount;
    this.saveRowField(row, 'budget', amount, () => {
      row.budget = previous;
    });
  }

  onActualChange(row: ForecastRow, rawValue: string): void {
    const amount = Number(rawValue || 0);

    if (Number.isNaN(amount) || amount < 0) {
      this.error = 'Invalid actual cost value.';
      return;
    }

    const previous = row.actualCost;
    row.actualCost = amount;
    this.saveRowField(row, 'actualCost', amount, () => {
      row.actualCost = previous;
    });
  }

  onTypeChange(row: ForecastRow, rawValue: string): void {
    const value = rawValue as 'Hours' | 'Cost' | '—';
    const previous = this.typeOverrides[row.wbsCode];

    this.typeOverrides[row.wbsCode] = value;
    this.saveRowField(row, 'type', value, () => {
      if (previous) {
        this.typeOverrides[row.wbsCode] = previous;
      } else {
        delete this.typeOverrides[row.wbsCode];
      }
    });
  }

  getRemaining(row: ForecastRow): number {
    return Math.max(0, (row.budget || 0) - (row.actualCost || 0));
  }

  getCellAmount(row: ForecastRow, periodKey: string): number | null {
    const cell = row.periods.find(p => p.periodKey === periodKey);
    return cell ? cell.amount : null;
  }

  getPeriodKeys(): string[] {
    if (!this.rows.length) {
      return [];
    }
    return this.rows[0].periods.map(p => p.periodKey);
  }

  formatMonth(periodKey: string): string {
    const [year, month] = periodKey.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  }

  formatMoney(value: number | null | undefined): string {
    if (value == null) {
      return '—';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  }

  // ---------- Navigation ----------

  goToProjectum(): void {
    this.router.navigate(['/gm/projectum']);
  }

  goToSchedule(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'schedule']);
  }

  goToActions(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'actions']);
  }

  goToFinance(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'finance']);
  }

  goToRisks(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'risks']);
  }

  goToCr(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'change-requests']);
  }
}