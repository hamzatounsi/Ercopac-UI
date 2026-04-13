import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GmForecastService } from '../../services/gm-forecast.service';
import { ForecastRow } from '../../models/forecast-row.model';
import { ForecastSummary } from '../../models/forecast-summary.model';

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

  rows: ForecastRow[] = [];
  filteredRows: ForecastRow[] = [];
  summary: ForecastSummary | null = null;

  periods = 12;
  searchTerm = '';
  viewMode: 'week' | 'month' = 'month';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private forecastService: GmForecastService
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadData();
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

  projectLabel = 'A-26002 - Barilla Novara';
projectShortName = 'Barilla Novara';

getTypeLabel(row: ForecastRow): string {
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

  onCellChange(row: ForecastRow, periodKey: string, rawValue: string): void {
    const amount = Number(rawValue || 0);

    if (Number.isNaN(amount) || amount < 0) {
      return;
    }

    this.saving = true;

    this.forecastService.updateForecastCell(this.projectId, {
      wbsCode: row.wbsCode,
      periodKey,
      amount
    }).subscribe({
      next: () => {
        this.saving = false;
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to update forecast value.';
        this.saving = false;
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