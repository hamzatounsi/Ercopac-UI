import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GmForecastService } from '../../services/gm-forecast.service';
import { ForecastRow } from '../../models/forecast-row.model';
import { ForecastSummary } from '../../models/forecast-summary.model';
import { GmDashboardService } from '../../services/gm-dashboard.service';
import { HttpClient } from '@angular/common/http';
import { PermissionService } from 'src/app/core/services/PermissionService';

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
  viewMode: 'week' | 'month' = 'week';
  periodType = 'week';

  savingCellKey: string | null = null;
  savingFieldKey: string | null = null;
  canWriteForecast = false;
  @ViewChild('wbsHeader') wbsHeader!: ElementRef<HTMLElement>;
  @ViewChild('calHeader') calHeader!: ElementRef<HTMLElement>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private forecastService: GmForecastService,
    private dashboardService: GmDashboardService,
    private http: HttpClient,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProjectName();
    this.loadData();
    this.permissionService.permissions$.subscribe(() => {
      this.canWriteForecast = this.permissionService.canWrite('FORECAST');
    });
    this.permissionService.loadPermissions();
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
            this.error = err?.error?.message || 'Failed to load forecast summary.';
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.error = err?.error?.message || 'Failed to load forecast data.';
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
    return this.getRowType(row) !== 'SUMMARY' && row.leaf !== false;
  }

  getRemainingPercent(row: ForecastRow): number {
    const budget = row.budget || 0;
    const remaining = row.remainingForecastCost || 0;
    if (!budget || budget <= 0) return 0;
    return Math.max(0, Math.min(100, (remaining / budget) * 100));
  }

  formatBudgetOrHours(row: ForecastRow): string {
    return this.formatMoney(row.budget);
  }

  formatActualOrHours(row: ForecastRow): string {
    return this.formatMoney(row.actualCost);
  }

  // Remaining forecast cost is calculated by the backend (HOUR leaves already converted with their rate)
  formatRemainingOrHours(row: ForecastRow): string {
    const remainingAmount = this.getRemaining(row);
    return this.formatMoney(remainingAmount);
  }
    // ✅ Affichage de la colonne "Remaining Schedule" (calculé par le backend en €)
  formatRemainingSchedule(row: ForecastRow): string {
    const cost = (row as any).remainingCost;
    if (cost != null && cost > 0) {
      return this.formatMoney(cost);
    }
    // Fallback visuel si le backend n'a pas encore calculé
    const hours = row.remainingHours || 0;
    const rate = this.getHourlyRate(row);
    return this.formatMoney(hours * rate);
  }

   getRemaining(row: ForecastRow): number {
    // Backend value: money for every row, parents rolled up from their leaves
    if (row.remainingForecastCost != null) return row.remainingForecastCost;
    const type = this.getRowType(row);
    const totalForecast = (row.periods || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const rate = this.getHourlyRate(row);

    // Pour les lignes SUMMARY ou Level 1 : SOMME des Remaining de tous les enfants
    if (type === 'SUMMARY' || row.level === 1) {
      if (row.level === 1) {
        // Level 1 = Total Projet : sommer TOUTES les lignes sauf elle-même
        return this.filteredRows
          .filter(r => r.financeEntryId !== row.financeEntryId)
          .reduce((sum, child) => sum + this.getRemaining(child), 0);
      } else {
        // Summary intermédiaire : sommer les enfants par préfixe WBS
        const children = this.filteredRows.filter(r => 
          r.level > row.level && 
          (r.wbsCode.startsWith(row.wbsCode + '.') || 
           r.wbsCode.startsWith(row.wbsCode + '-'))
        );
        return children.reduce((sum, child) => sum + this.getRemaining(child), 0);
      }
    }

    if (type === 'HOUR') {
      // HOUR : Somme forecast * Taux horaire
      return totalForecast * rate;
    }
    
    // COST : Somme forecast directement (déjà en €)
    return totalForecast;
  }

  // Helper pour le taux (à ajuster si ton backend envoie le taux dans le DTO)
  getHourlyRate(row: ForecastRow): number {
    // Rate of the row as resolved by the backend (row rate, resource type rate or default rate)
    return row.hourRate || 65;
  }

  // HOUR leaves are forecast in hours; every parent total is a cost
  formatTotalForecast(row: ForecastRow): string {
    // Only HOUR leaves are in hours; parent totals are money roll-ups
    return this.getRowType(row) === 'HOUR' && row.leaf !== false ? this.formatHours(row.totalForecast) : this.formatMoney(row.totalForecast);
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
    return `${row.financeEntryId}__${periodKey}`;
  }

  isCellSaving(row: ForecastRow, periodKey: string): boolean {
    return this.savingCellKey === this.cellKey(row, periodKey);
  }

  onCellChange(row: ForecastRow, periodKey: string, rawValue: string): void {
    if (!this.isEditableRow(row)) {
      this.error = 'Select a leaf Finance WBS row to enter a forecast amount.';
      return;
    }
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

    this.saving = true;
    this.savingCellKey = this.cellKey(row, periodKey);
    this.error = null;

    this.forecastService.updateForecastCell(this.projectId, {
      financeEntryId: row.financeEntryId,
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
        this.error = err?.error?.message || 'Failed to update forecast value.';
        this.saving = false;
        this.savingCellKey = null;
        if (cell) cell.amount = previousAmount;
      }
    });
  }

  canDeleteForecastEntry(row: ForecastRow): boolean {
    return this.canWriteForecast && this.isEditableRow(row) && !!row.totalForecast;
  }

  deleteForecastEntry(row: ForecastRow): void {
    if (!this.canDeleteForecastEntry(row)) return;
    const confirmed = confirm(
      `Delete forecast entry

${row.wbsCode} – ${row.description}

` +
      'All forecast values of this row are removed and the parent totals are recalculated. ' +
      'The WBS node itself stays in Finance and Forecast.'
    );
    if (!confirmed) return;
    this.saving = true;
    this.error = null;
    this.forecastService.deleteForecastEntry(this.projectId, row.financeEntryId).subscribe({
      next: () => {
        this.saving = false;
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.error = err?.error?.message || 'Failed to delete forecast entry.';
        this.saving = false;
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

  onWbsScroll(event: Event): void {
    const source = this.wbsBody.nativeElement;
    const target = this.calBody.nativeElement;
    if (target.scrollTop !== source.scrollTop) target.scrollTop = source.scrollTop;
    this.wbsHeader.nativeElement.scrollLeft = source.scrollLeft;
  }

  onCalScroll(event: Event): void {
    const source = this.calBody.nativeElement;
    const target = this.wbsBody.nativeElement;
    if (target.scrollTop !== source.scrollTop) target.scrollTop = source.scrollTop;
    this.calHeader.nativeElement.scrollLeft = source.scrollLeft;
  }

  onLinkedWbsChange(row: ForecastRow): void {
    if (this.getRowType(row) !== 'HOUR') return;
    this.saving = true;
    this.forecastService.updateLinkedScheduleWbs(this.projectId, row.financeEntryId, row.linkedScheduleWbs || null).subscribe({
      next: () => {
        this.saving = false;
        this.loadData();
      },
      error: (err: any) => {
        console.error(err);
        this.error = 'Failed to update linked task.';
        this.saving = false;
      }
    });
  }

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
