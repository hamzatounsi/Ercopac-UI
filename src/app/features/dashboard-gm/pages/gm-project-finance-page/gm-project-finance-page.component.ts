import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Renderer2, RendererStyleFlags2 } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Chart } from 'chart.js/auto';
import * as XLSX from 'xlsx';
import { GmDashboardService } from '../../services/gm-dashboard.service';
import { GmFinanceService } from '../../services/gm-finance.service';
import { FinanceEntry, FinanceImportResult, FinanceSummary, FinanceSettings, FinanceWbsTemplateRow, FinanceWbsRowType, Department, AppUser } from '../../models/finance-settings.model';
import { PermissionService } from 'src/app/core/services/PermissionService';
import { ChartThemeService } from 'src/app/core/services/chart-theme.service';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { skip, takeUntil } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { assertSpreadsheetFile, assertSpreadsheetRowLimit, assertValidWorkbook } from 'src/app/core/utils/spreadsheet-import.utils';
import { I18nService } from 'src/app/core/i18n/i18n.service';

type SettingsTab = 'wbs' | 'import' | 'payments' | 'forecast';

@Component({
  selector: 'app-gm-project-finance-page',
  templateUrl: './gm-project-finance-page.component.html',
  styleUrls: ['./gm-project-finance-page.component.scss']
})
export class GmProjectFinancePageComponent implements OnInit, OnDestroy {
  @ViewChild('donutChart') donutChartRef!: ElementRef;
  @ViewChild('barChart') barChartRef!: ElementRef;
  @ViewChild('settingsOverlayRef') settingsOverlayRef?: ElementRef<HTMLElement>;
  @ViewChild('cashFlowChart') cashFlowChartRef!: ElementRef; // ✅ NOUVEAU
  
  private settingsOverlayHomeParent: HTMLElement | null = null;
  private settingsOverlayHomeNextSibling: Node | null = null;
  private donutChart?: Chart;
  private barChart?: Chart;
  private cashFlowChart?: Chart; // ✅ NOUVEAU
  private chartCreationTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly destroy$ = new Subject<void>();
  private destroyed = false;

  projectId!: number;
  loading = false;
  saving = false;
  error: string | null = null;
  actionError: string | null = null;
  actionMessage: string | null = null;
  canWriteFinance = false;

  rows: FinanceEntry[] = [];
  filteredRows: FinanceEntry[] = [];
  summary: FinanceSummary | null = null;
  projectName = '';

  searchTerm = '';
  levelFilter = '';
  currency: 'EUR' | 'USD' = 'EUR';

  sortColumn: keyof FinanceEntry = 'wbsCode';
  sortDirection: 1 | -1 = 1;

  settingsOpen = false;
  settingsLoading = false;
  settingsSaving = false;
  applyLoading = false;
  settingsError: string | null = null;
  activeSettingsTab: SettingsTab = 'wbs';
  applyResultMessage: string | null = null;

  financeSettings: FinanceSettings = {
    defaultHourlyRate: 65,
    templateRows: []
  };

  importLoading = false;
  importReplaceExisting = false;
  importPreviewRows: FinanceWbsTemplateRow[] = [];
  importMessage: string | null = null;
  importDragOver = false;
  odsTemplateLoading = false;

  departments: Department[] = [];
  usersByDepartment: { [deptId: number]: AppUser[] } = {};
  loadingDepartments = false;
  resourceTypes: any[] = [];

  erpConnecting = false;
  readonly rowTypeOptions: FinanceWbsRowType[] = ['SUMMARY', 'HOUR', 'EXPENSES', 'COST'];

  // ==========================================
  // ✅ MODULE PAYMENTS
  // ==========================================
  paymentSchedule: any = {
    projectId: 0,
    projectName: '',
    salesValue: null,
    currency: 'EUR',
    totalPercentage: 0,
    milestones: []
  };
  paymentSaving = false;

  // ==========================================
  // ✅ MODULE FORECAST BASELINE
  // ==========================================
  forecastBaseline: any = {
    projectId: 0,
    projectName: '',
    hasBaseline: false,
    baselineDate: null,
    totalBaselineForecast: 0,
    totalCurrentForecast: 0,
    totalVariance: 0,
    rows: []
  };
  forecastBaselineLoading = false;

  constructor(private readonly i18n: I18nService, 
    private route: ActivatedRoute,
    private financeService: GmFinanceService,
    private dashboardService: GmDashboardService,
    private renderer: Renderer2,
    private http: HttpClient,
    private permissionService: PermissionService,
    private chartTheme: ChartThemeService
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProjectName();
    this.loadData();
    this.permissionService.permissions$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.canWriteFinance = this.permissionService.canWrite('FINANCE');
    });
    this.permissionService.loadPermissions();
    this.chartTheme.changes$.pipe(skip(1), takeUntil(this.destroy$)).subscribe(() => {
      this.scheduleChartRender();
      if (this.cashFlowChart) this.createCashFlowChart();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
    if (this.chartCreationTimer !== null) {
      clearTimeout(this.chartCreationTimer);
      this.chartCreationTimer = null;
    }
    this.donutChart?.destroy();
    this.barChart?.destroy();
    this.cashFlowChart?.destroy(); // ✅ NOUVEAU
    this.donutChart = undefined;
    this.barChart = undefined;
    this.cashFlowChart = undefined; // ✅ NOUVEAU

    const overlay = this.settingsOverlayRef?.nativeElement;
    if (overlay && overlay.parentElement === document.body) {
      this.renderer.removeChild(document.body, overlay);
    }
  }

  loadProjectName(): void {
    this.dashboardService.getProjects().pipe(takeUntil(this.destroy$)).subscribe({
      next: (projects) => {
        const project = (projects ?? []).find((p: any) => p.id === this.projectId);
        this.projectName = project?.name || `Project #${this.projectId}`;
      },
      error: () => { this.projectName = `Project #${this.projectId}`; }
    });
  }

  loadData(): void {
    this.loading = true;
    this.error = null;
    this.financeService.getFinanceRows(this.projectId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows) => {
        this.rows = rows ?? [];
        this.financeService.getFinanceSummary(this.projectId).pipe(takeUntil(this.destroy$)).subscribe({
          next: (summary) => {
            this.summary = summary;
            this.applyFilters();
            this.loading = false;
            this.scheduleChartRender();
          },
          error: () => { this.error = this.i18n.t('gm.finance.failedLoadFinanceSummary'); this.loading = false; }
        });
      },
      error: () => { this.error = this.i18n.t('gm.finance.failedLoadFinanceData'); this.loading = false; }
    });
  }

  applyFilters(): void {
    const search = this.searchTerm.toLowerCase().trim();
    this.filteredRows = this.rows.filter(row => {
      const matchesLevel = !this.levelFilter || String(row.level) === this.levelFilter;
      const matchesSearch = !search || row.wbsCode.toLowerCase().includes(search) || row.description.toLowerCase().includes(search);
      return matchesLevel && matchesSearch;
    });
    this.sortRows();
  }

  sortBy(column: keyof FinanceEntry): void {
    if (this.sortColumn === column) this.sortDirection *= -1;
    else { this.sortColumn = column; this.sortDirection = 1; }
    this.sortRows();
  }

  private sortRows(): void {
    this.filteredRows.sort((a, b) => {
      const av = a[this.sortColumn];
      const bv = b[this.sortColumn];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * this.sortDirection;
      return String(av ?? '').localeCompare(String(bv ?? '')) * this.sortDirection;
    });
  }

  formatMoney(value: number | null | undefined): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: this.currency, maximumFractionDigits: 0 }).format(value);
  }

  getVarianceClass(v: number | null | undefined): string { 
    if (!v) return ''; 
    return v > 0 ? 'pos' : 'neg'; 
  }

  getForecastVarianceClass(v: number | null | undefined): string { 
    if (!v) return ''; 
    return v > 0 ? 'neg' : 'pos'; 
  }

  getCpiClass(cpi: number | null | undefined): string { if (!cpi) return ''; return cpi >= 1 ? 'cpi-good' : 'cpi-bad'; }
  getProgressClass(p: number | null | undefined): string { if (!p) return ''; if (p < 50) return 'good'; if (p < 80) return 'warn'; return 'bad'; }

  createCharts(): void {
    if (this.destroyed || !this.summary || !this.donutChartRef?.nativeElement || !this.barChartRef?.nativeElement) return;
    const s = this.summary;
    const palette = this.chartTheme.applyDefaults(Chart);
    this.donutChart?.destroy();
    this.barChart?.destroy();

    this.donutChart = new Chart(this.donutChartRef.nativeElement, {
      type: 'doughnut',
      data: { labels: [this.i18n.t('gm.finance.chart.actualCost'), this.i18n.t('gm.finance.chart.forecast')], datasets: [{ data: [s.totalActualCost, s.totalForecast], backgroundColor: palette.series.slice(0, 2), borderColor: palette.surface }] },
      options: { responsive: true, maintainAspectRatio: false }
    });

    this.barChart = new Chart(this.barChartRef.nativeElement, {
      type: 'bar',
      data: { labels: [this.i18n.t('gm.finance.chart.budget'), 'EAC', this.i18n.t('gm.finance.chart.variance')], datasets: [{ label: this.i18n.t('gm.finance.chart.projectCost'), data: [s.totalBudget, s.totalEac, s.totalVariance], backgroundColor: palette.series[0] }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  private scheduleChartRender(): void {
    if (this.destroyed) return;
    if (this.chartCreationTimer !== null) clearTimeout(this.chartCreationTimer);
    this.chartCreationTimer = setTimeout(() => { this.chartCreationTimer = null; this.createCharts(); });
  }

  safePercent(value: number | null | undefined): number {
    if (value == null || Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(100, value));
  }

  onFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try { assertSpreadsheetFile(file, ['.xlsx', '.xls']); }
    catch (error) { this.error = error instanceof Error ? error.message : this.i18n.t('gm.finance.invalidSpreadsheet'); input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const binary = e.target?.result;
        if (!binary) throw new Error(this.i18n.t('gm.finance.invalidUnsupportedSpreadsheetFile'));
        const workbook = XLSX.read(binary, { type: 'binary' });
        const sheet = workbook.Sheets[assertValidWorkbook(workbook)];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
        assertSpreadsheetRowLimit(rawData);
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(rawData.length, 10); i++) {
          const rowStr = rawData[i].map(cell => String(cell).trim().toLowerCase()).join(" ");
          if (rowStr.includes("wbs") && rowStr.includes("description")) { headerRowIndex = i; break; }
        }
        if (headerRowIndex < 0) throw new Error(this.i18n.t('gm.finance.financeSpreadsheetMustInclude'));
        const data = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: "" }) as any[];
        assertSpreadsheetRowLimit(data);
        this.importFinance(data);
      } catch (error) {
        this.error = error instanceof Error ? error.message : this.i18n.t('gm.finance.invalidUnsupportedSpreadsheetFile');
      }
    };
    reader.readAsBinaryString(file);
  }

  importFinance(rows: any[]): void {
    if (!rows || rows.length === 0) { this.error = this.i18n.t('gm.finance.excelFileEmpty'); return; }
    try { assertSpreadsheetRowLimit(rows); } catch (error) { this.error = error instanceof Error ? error.message : this.i18n.t('gm.finance.invalidUnsupportedSpreadsheetFile'); return; }
    const safeNumber = (val: any): number => {
      if (val === null || val === undefined || val === '') return 0;
      if (typeof val === 'number') {
        if (!Number.isFinite(val)) throw new Error(this.i18n.t('gm.finance.financeSpreadsheetContainsInvalid'));
        return val;
      }
      const parsed = Number(String(val).replace(/,/g, '').trim());
      if (!Number.isFinite(parsed)) throw new Error(this.i18n.t('gm.finance.financeSpreadsheetContainsInvalid'));
      return parsed;
    };
    const getValue = (row: any, keys: string[]) => {
      for (const key of Object.keys(row)) {
        const cleanKey = key.trim().toLowerCase();
        for (const target of keys) { if (cleanKey === target.toLowerCase()) return row[key]; }
      }
      return 0;
    };
    const getStr = (row: any, keys: string[]) => {
      for (const key of Object.keys(row)) {
        const cleanKey = key.trim().toLowerCase();
        for (const target of keys) { if (cleanKey === target.toLowerCase()) return String(row[key]).trim(); }
      }
      return '';
    };
    const mapped = rows.map((r, index) => {
      if (!r || typeof r !== 'object') throw new Error(this.i18n.t('gm.finance.financeRowMalformed', { value: index + 1 }));
      const wbsCode = getStr(r, ['WBS', 'wbs', 'wbsCode']);
      const description = getStr(r, ['Description', 'description', 'DESCRIPTION']);
      const level = Number(r['LEVEL'] ?? r['Level'] ?? r['level'] ?? r['LVL'] ?? 1);
      if (!wbsCode || !description || !Number.isInteger(level) || level < 1) throw new Error(this.i18n.t('gm.finance.financeRowInvalid', { value: index + 1 }));
      return { wbsCode, description, level, sales: safeNumber(getValue(r, ['Sales', 'sales'])), budget: safeNumber(getValue(r, ['Budget', 'budget', 'Budjet', 'budjet'])), costReserve: safeNumber(getValue(r, ['CR', 'cr', 'Cost Reserve'])), updatedBudget: safeNumber(getValue(r, ['Updated budget', 'Updated budjet', 'updatedBudget', 'updated_budget'])), commitment: safeNumber(getValue(r, ['Commitment', 'commitment', 'COMMITMENT'])), actualCost: safeNumber(getValue(r, ['Actual', 'actual', 'ACTUAL', 'Actual Cost'])), forecast: safeNumber(getValue(r, ['Forecast', 'Forcast', 'forecast', 'FORECAST'])), ownerName: getStr(r, ['Owner', 'ownerName', 'OWNER']) };
    });
    this.sendFinanceImport(mapped, false);
  }

  // Existing values are never replaced silently: the backend answers 409 with the list and the user decides.
  private sendFinanceImport(rows: any[], overwrite: boolean): void {
    this.actionError = null;
    this.actionMessage = null;
    this.financeService.importFinance(this.projectId, rows, overwrite).subscribe({
      next: (result: FinanceImportResult) => {
        this.error = null;
        this.actionMessage = [this.i18n.t('gm.finance.importCompleted', { updated: result?.updatedRows ?? 0, unchanged: result?.unchangedRows ?? 0 }),
          ...(result?.messages ?? [])].join(' ');
        this.loadData();
      },
      error: (err) => {
        const message = this.i18n.error(err, 'gm.finance.failedImportFinanceFile');
        if (err?.status === 409 && !overwrite && confirm(this.i18n.t('gm.finance.overwriteTheseExistingValues', { message }))) {
          this.sendFinanceImport(rows, true);
          return;
        }
        this.actionError = message;
      }
    });
  }

  recalculate(): void {
    this.loading = true;
    this.financeService.recalculateLabour(this.projectId).subscribe({
      next: () => this.loadData(),
      error: () => { this.error = this.i18n.t('gm.finance.failedRecalculateFinance'); this.loading = false; }
    });
  }

  openSettings(): void {
    this.settingsOpen = true;
    this.activeSettingsTab = 'wbs';
    this.settingsLoading = true;
    this.settingsError = null;
    this.financeSettings = {
      defaultHourlyRate: this.financeSettings?.defaultHourlyRate ?? 65,
      templateRows: this.financeSettings?.templateRows ?? []
    };
    setTimeout(() => this.attachOverlayToBody());
    
    this.financeService.getFinanceSettings(this.projectId).subscribe({
      next: (settings) => {
        this.financeSettings = {
          defaultHourlyRate: settings?.defaultHourlyRate ?? 65,
          templateRows: [...(settings?.templateRows ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        };
        this.settingsLoading = false;
        this.loadDepartments();
        this.loadResourceTypes();
        this.loadPaymentSchedule();
        this.loadForecastBaseline();
      },
      error: (err) => {
        this.settingsLoading = false;
        this.settingsError = this.i18n.t(err?.status === 404 ? 'gm.finance.settingsEndpointNotFound' : 'gm.finance.failedLoadSettings');
      }
    });
  }

  closeSettings(): void {
    this.detachOverlayFromBody();
    this.settingsOpen = false;
    this.settingsError = null;
    this.applyResultMessage = null;
  }

  private attachOverlayToBody(): void {
    const overlay = this.settingsOverlayRef?.nativeElement;
    if (!overlay || overlay.parentElement === document.body) return;
    this.settingsOverlayHomeParent = overlay.parentElement;
    this.settingsOverlayHomeNextSibling = overlay.nextSibling;
    this.renderer.appendChild(document.body, overlay);
    ['opacity', 'visibility', 'display', 'position', 'top', 'left', 'right', 'bottom', 'z-index', 'pointer-events'].forEach(prop => 
      this.renderer.setStyle(overlay, prop, prop === 'opacity' ? '1' : prop === 'visibility' ? 'visible' : prop === 'display' ? 'flex' : prop === 'position' ? 'fixed' : prop === 'top' ? '0' : prop === 'left' ? '0' : prop === 'right' ? '0' : prop === 'bottom' ? '0' : prop === 'z-index' ? '2147483000' : 'auto', RendererStyleFlags2.Important)
    );
  }

  private detachOverlayFromBody(): void {
    const overlay = this.settingsOverlayRef?.nativeElement;
    if (!overlay || overlay.parentElement !== document.body) return;
    ['opacity', 'visibility', 'display', 'position', 'top', 'left', 'right', 'bottom', 'z-index', 'pointer-events'].forEach(prop => this.renderer.removeStyle(overlay, prop));
    if (this.settingsOverlayHomeParent) {
      if (this.settingsOverlayHomeNextSibling) this.renderer.insertBefore(this.settingsOverlayHomeParent, overlay, this.settingsOverlayHomeNextSibling);
      else this.renderer.appendChild(this.settingsOverlayHomeParent, overlay);
    }
  }

  saveSettings(): void {
    this.settingsError = null;
    const codes = this.financeSettings.templateRows.map(r => r.codeTemplate ? r.codeTemplate.trim().toLowerCase() : '');
    if (codes.length !== new Set(codes).size) {
      this.settingsError = this.i18n.t('gm.finance.validationErrorAllWbs');
      return;
    }
    this.settingsSaving = true;
    this.normalizeTemplateSortOrder();
    
    this.financeService.saveFinanceSettings(this.financeSettings, this.projectId).subscribe({
      next: (saved) => {
        this.financeSettings = {
          defaultHourlyRate: saved.defaultHourlyRate ?? 65,
          templateRows: [...(saved.templateRows ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        };
        this.settingsSaving = false;
        this.loadData();
      },
      error: (err) => { this.settingsSaving = false; this.settingsError = this.i18n.error(err, 'gm.finance.failedSaveFinanceSettings'); }
    });
  }

  applyTemplateToCurrentProject(): void {
    if (this.financeSettings.templateRows.length === 0) {
      this.settingsError = this.i18n.t('gm.finance.pleaseAddLeastOne');
      return;
    }
    this.applyLoading = true;
    this.settingsError = null;
    this.applyResultMessage = null;

    this.financeService.applyFinanceTemplateToCurrentProject(this.projectId).subscribe({
      next: (result) => {
        this.applyLoading = false;
        this.applyResultMessage = this.i18n.t('gm.finance.wbsAppliedSuccessfullyRows', { projectName: this.projectName, rowsGenerated: result?.rowsGenerated ?? 0 });
        this.loadData();
      },
      error: (err) => {
        this.applyLoading = false;
        this.settingsError = this.i18n.error(err, 'gm.finance.failedApplyFinanceTemplate');
      }
    });
  }

  setSettingsTab(tab: SettingsTab): void {
    this.activeSettingsTab = tab;
  }

  addTemplateRow(): void {
    const nextSort = this.financeSettings.templateRows.length + 1;
    this.financeSettings.templateRows.push({
      sortOrder: nextSort, level: 1, codeTemplate: 'xxx25-NEW', description: this.i18n.t('gm.finance.newRow'), type: 'COST',
      departmentId: null, departmentName: null, ownerId: null, ownerName: null, ownerKey: null, hourRate: null, resourceType: null
    });
  }

  removeTemplateRow(index: number): void {
    const row = this.financeSettings.templateRows[index];
    const confirmed = confirm(
      `Delete WBS node

${row?.codeTemplate ?? ''} – ${row?.description ?? ''}

` +
      this.i18n.t('gm.finance.removeTemplateRowWarning')
    );
    if (!confirmed) return;
    this.financeSettings.templateRows.splice(index, 1);
    this.normalizeTemplateSortOrder();
  }

  moveTemplateRow(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.financeSettings.templateRows.length) return;
    const rows = this.financeSettings.templateRows;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    this.normalizeTemplateSortOrder();
  }

  private normalizeTemplateSortOrder(): void {
    this.financeSettings.templateRows = this.financeSettings.templateRows.map((row, index) => ({ ...row, sortOrder: index + 1 }));
  }

  loadDepartments(): void {
    this.loadingDepartments = true;
    this.http.get<Department[]>(`${environment.apiUrl}/departments`).subscribe({
      next: (depts) => { this.departments = depts; this.loadingDepartments = false; },
      error: () => { this.loadingDepartments = false; this.settingsError = this.i18n.t('gm.finance.failedLoadDepartments'); }
    });
  }

  loadResourceTypes(): void {
    this.http.get<any[]>(`${environment.apiUrl}/resource-types`).subscribe({
      next: (types) => { this.resourceTypes = (types || []).filter((t: any) => t.active && t.assignable); },
      error: () => { this.resourceTypes = []; }
    });
  }

  loadUsersByDepartment(deptId: number): void {
    if (this.usersByDepartment[deptId]) return;
    this.http.get<AppUser[]>(`${environment.apiUrl}/departments/${deptId}/users`).subscribe({
      next: (users) => { this.usersByDepartment[deptId] = users; },
      error: () => { this.usersByDepartment[deptId] = []; }
    });
  }

  onDepartmentChange(row: FinanceWbsTemplateRow, deptId: number | null): void {
    row.departmentId = deptId;
    row.ownerId = null;
    row.ownerName = null;
    if (deptId) this.loadUsersByDepartment(deptId);
  }

  trackByIndex(index: number): number { return index; }

  onWbsTemplateFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.processWbsTemplateFile(file);
    input.value = '';
  }

  onImportDragOver(event: DragEvent): void { event.preventDefault(); this.importDragOver = true; }
  onImportDragLeave(): void { this.importDragOver = false; }
  onImportDrop(event: DragEvent): void {
    event.preventDefault();
    this.importDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const isAllowed = ['.json', '.csv', '.xlsx', '.xls', '.ods'].some(ext => file.name.toLowerCase().endsWith(ext));
    if (!isAllowed) { this.settingsError = this.i18n.t('gm.finance.onlyJsonCsvExcel'); return; }
    this.processWbsTemplateFile(file);
  }

  private processWbsTemplateFile(file: File): void {
    this.importMessage = null;
    this.settingsError = null;
    const fileName = file.name.toLowerCase();
    try { assertSpreadsheetFile(file, ['.json', '.csv', '.xlsx', '.xls', '.ods']); }
    catch (error) { this.settingsError = error instanceof Error ? error.message : this.i18n.t('gm.finance.invalidUnsupportedSpreadsheetFile'); return; }
    if (fileName.endsWith('.json')) this.readWbsJson(file);
    else if (fileName.endsWith('.csv')) this.readWbsCsv(file);
    else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.ods')) this.readWbsExcel(file);
    else this.settingsError = this.i18n.t('gm.finance.unsupportedFileType');
  }

  loadOdsTemplate(): void {
    this.odsTemplateLoading = true;
    this.settingsError = null;
    this.importMessage = null;
    this.financeService.loadOdsTemplate().subscribe({
      next: (rows) => {
        this.importPreviewRows = this.normalizeImportedWbsRows(rows ?? []);
        this.importMessage = this.i18n.t('gm.finance.wbsRowsLoaded', { count: this.importPreviewRows.length });
        this.odsTemplateLoading = false;
      },
      error: () => { this.odsTemplateLoading = false; this.settingsError = this.i18n.t('gm.finance.failedLoadStandardOds'); }
    });
  }

  private readWbsJson(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        this.importPreviewRows = this.normalizeImportedWbsRows(Array.isArray(parsed) ? parsed : parsed.rows);
        assertSpreadsheetRowLimit(this.importPreviewRows);
        if (!this.importPreviewRows.length) throw new Error(this.i18n.t('gm.finance.wbsFileEmptyMalformed'));
        this.importMessage = this.i18n.t('gm.finance.wbsRowsReadyImport', { count: this.importPreviewRows.length });
      } catch (err: any) { this.settingsError = this.i18n.t('gm.finance.importError', { message: err.message }); this.importPreviewRows = []; }
    };
    reader.readAsText(file);
  }

  private readWbsCsv(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workbook = XLSX.read(String(reader.result ?? ''), { type: 'string' });
        const sheet = workbook.Sheets[assertValidWorkbook(workbook)];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];
        assertSpreadsheetRowLimit(rows);
        this.importPreviewRows = this.normalizeImportedWbsRows(rows);
        if (!this.importPreviewRows.length) throw new Error(this.i18n.t('gm.finance.wbsFileEmptyMalformed'));
        this.importMessage = this.i18n.t('gm.finance.wbsRowsReadyImport', { count: this.importPreviewRows.length });
      } catch (err: any) { this.settingsError = this.i18n.t('gm.finance.importError', { message: err.message }); this.importPreviewRows = []; }
    };
    reader.readAsText(file);
  }

  private readWbsExcel(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const workbook = XLSX.read(e.target?.result as any, { type: 'binary' });
        const sheet = workbook.Sheets[assertValidWorkbook(workbook)];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];
        assertSpreadsheetRowLimit(rows);
        this.importPreviewRows = this.normalizeImportedWbsRows(rows);
        if (!this.importPreviewRows.length) throw new Error(this.i18n.t('gm.finance.wbsFileEmptyMalformed'));
        this.importMessage = this.i18n.t('gm.finance.wbsRowsReadyImport', { count: this.importPreviewRows.length });
      } catch (err: any) { this.settingsError = this.i18n.t('gm.finance.importError', { message: err.message }); this.importPreviewRows = []; }
    };
    reader.readAsBinaryString(file);
  }

  private normalizeImportedWbsRows(rows: any[]): FinanceWbsTemplateRow[] {
    if (!Array.isArray(rows)) throw new Error(this.i18n.t('gm.finance.wbsFileContainsMalformed'));
    return rows.map((r, index) => {
      if (!r || typeof r !== 'object') throw new Error(this.i18n.t('gm.finance.wbsRowMalformed', { value: index + 1 }));
      const codeTemplate = String(r['WBS CODE'] ?? r['WBS'] ?? r['Code'] ?? r['codeTemplate'] ?? r['wbsCode'] ?? '').trim();
      const description = String(r['DESCRIPTION'] ?? r['Description'] ?? r['description'] ?? '').trim();
      const level = Number(r['LVL'] ?? r['Level'] ?? r['LEVEL'] ?? r['level'] ?? this.detectWbsLevel(codeTemplate));
      if (!codeTemplate || !description || !Number.isInteger(level) || level < 1) throw new Error(this.i18n.t('gm.finance.wbsRowInvalid', { value: index + 1 }));
      const explicitTypeRaw = r['TYPE'] ?? r['Type'] ?? r['type'] ?? 'COST';
      const upper = String(explicitTypeRaw).toUpperCase().trim();
      let type: FinanceWbsRowType = 'COST';
      if (upper === 'SUMMARY') type = 'SUMMARY';
      else if (upper === 'HOUR') type = 'HOUR';
      else if (upper === 'EXPENSES') type = 'EXPENSES';
      
      return {
        sortOrder: index + 1, level, codeTemplate, description, type,
        departmentId: null, departmentName: null, ownerId: null, ownerName: null,
        ownerKey: String(r['OWNER KEY'] ?? r['Owner Key'] ?? r['ownerKey'] ?? '').trim() || null,
        hourRate: r['HOUR RATE'] ?? r['Hour Rate'] ?? r['hourRate'] ?? null,
        resourceType: String(r['RESOURCE TYPE'] ?? r['Resource Type'] ?? r['resourceType'] ?? '').trim() || null
      };
    }).filter(row => row.codeTemplate && row.description);
  }

  private detectWbsLevel(code: string): number {
    if (!code) return 1;
    if (code.includes('.')) return code.split('.').length;
    if (code.includes('-')) return Math.max(1, code.split('-').length - 1);
    return 1;
  }

  confirmImportWbsTemplate(): void {
    if (this.importPreviewRows.length === 0) { this.settingsError = this.i18n.t('gm.finance.pleaseSelectValidWbs'); return; }
    this.importLoading = true;
    this.settingsError = null;
    
    this.financeService.importWbsTemplate(this.importPreviewRows, this.importReplaceExisting, this.projectId).subscribe({
      next: (saved) => {
        this.financeSettings = {
          defaultHourlyRate: saved.defaultHourlyRate ?? 65,
          templateRows: [...(saved.templateRows ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        };
        this.importLoading = false;
        this.importMessage = this.i18n.t('gm.finance.importedWbsTemplateRows', { count: this.financeSettings.templateRows.length });
        this.activeSettingsTab = 'wbs';
        this.loadData();
      },
      error: (err) => { this.importLoading = false; this.settingsError = this.i18n.error(err, 'gm.finance.failedImportWbsTemplate'); }
    });
  }

  updateForecast(row: FinanceEntry, newValue: string | number): void {
    if (!this.isForecastEditable(row)) return;
    const parsed = Number(newValue);
    if (Number.isNaN(parsed) || parsed < 0 || parsed === row.forecast) return;
    const previous = row.forecast;
    row.forecast = parsed;
    this.financeService.updateForecastValue(this.projectId, row.id, parsed).subscribe({
      next: () => {
        this.loadData();
      },
      error: (err) => { row.forecast = previous; this.actionError = this.i18n.error(err, 'gm.finance.failedUpdateForecast'); }
    });
  }

  isFinanceLeaf(row: FinanceEntry): boolean {
    return row.leaf ?? !this.rows.some(candidate => candidate.parentId === row.id);
  }

  // HOUR rows are forecast in hours on the Forecast page; parents are calculated
  isForecastEditable(row: FinanceEntry): boolean {
    return this.canWriteFinance && this.isFinanceLeaf(row) && row.rowType !== 'HOUR';
  }

  deleteWbsNode(row: FinanceEntry): void {
    if (!this.canWriteFinance) return;
    const confirmed = confirm(
      this.i18n.t('gm.finance.deleteWbsNodeConfirm', { code: row.wbsCode, description: row.description })
    );
    if (!confirmed) return;
    this.actionError = null;
    this.actionMessage = null;
    this.financeService.deleteWbsNode(this.projectId, row.id).subscribe({
      next: () => this.loadData(),
      error: (err) => { this.actionError = this.i18n.error(err, 'gm.finance.failedDeleteWbsNode'); }
    });
  }

  connectErp(): void {
    this.erpConnecting = true;
    this.error = null;
    setTimeout(() => { this.erpConnecting = false; this.error = this.i18n.t('gm.finance.erpConnectionConfiguredYet'); }, 600);
  }

  // ==========================================
  // ✅ MODULE PAYMENTS - MÉTHODES
  // ==========================================

  loadPaymentSchedule(): void {
    this.financeService.getPaymentSchedule(this.projectId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        this.paymentSchedule = data;
        setTimeout(() => this.createCashFlowChart(), 100); // ✅ AJOUTÉ
      },
      error: (err: any) => {
        this.paymentSchedule = {
          projectId: this.projectId,
          projectName: this.projectName,
          salesValue: null,
          currency: 'EUR',
          totalPercentage: 0,
          milestones: []
        };
      }
    });
  }

  updateTotalPercentage(): void {
    this.paymentSchedule.totalPercentage = this.paymentSchedule.milestones.reduce(
      (sum: number, p: any) => sum + (p.percentage || 0), 0
    );
  }

  onPercentageChange(index: number, value: number): void {
    this.paymentSchedule.milestones[index].percentage = value || 0;
    this.updateTotalPercentage();
  }

  addPaymentMilestone(): void {
    this.paymentSchedule.milestones.push({
      id: null,
      milestoneOrder: this.paymentSchedule.milestones.length + 1,
      percentage: 0,
      dueDate: '',
      status: 'EXPECTED',
      calculatedValue: 0
    });
    this.updateTotalPercentage();
  }

  removePaymentMilestone(index: number): void {
    this.paymentSchedule.milestones.splice(index, 1);
    this.paymentSchedule.milestones.forEach((p: any, i: number) => (p.milestoneOrder = i + 1));
    this.updateTotalPercentage();
  }

  togglePaymentStatus(p: any): void {
    p.status = p.status === 'PAID' ? 'EXPECTED' : 'PAID';
  }

  calculatePaymentValue(percentage: number): string {
    if (!this.paymentSchedule.salesValue || this.paymentSchedule.salesValue <= 0) return '—';
    const val = (this.paymentSchedule.salesValue * percentage) / 100;
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  getProgressBarWidth(): number {
    return Math.min(this.paymentSchedule.totalPercentage, 100);
  }

  savePaymentSchedule(): void {
    if (this.paymentSchedule.totalPercentage !== 100) {
      this.settingsError = this.i18n.t('gm.finance.paymentPercentagesMustSum');
      return;
    }
    this.paymentSaving = true;
    this.settingsError = null;

    const payload = {
      salesValue: this.paymentSchedule.salesValue,
      currency: this.paymentSchedule.currency,
      milestones: this.paymentSchedule.milestones.map((p: any, index: number) => ({
        ...p,
        milestoneOrder: index + 1
      }))
    };

    this.financeService.savePaymentSchedule(this.projectId, payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        this.paymentSchedule = data;
        this.paymentSaving = false;
        this.settingsError = null;
        setTimeout(() => this.createCashFlowChart(), 100); // ✅ AJOUTÉ
      },
      error: (err: any) => {
        this.paymentSaving = false;
        this.settingsError = this.i18n.error(err, 'gm.finance.failedSavePaymentSchedule');
      }
    });
  }

  exportPaymentsCSV(): void {
    if (!this.paymentSchedule.milestones.length) return;
    const headers = ['Project', 'Sales Value', 'Currency', 'Payment', 'Percentage', 'Value', 'Date', 'Status'];
    const rows = this.paymentSchedule.milestones.map((p: any, index: number) => [
      this.projectName,
      this.paymentSchedule.salesValue,
      this.paymentSchedule.currency,
      `Payment ${index + 1}`,
      p.percentage + '%',
      this.calculatePaymentValue(p.percentage),
      p.dueDate,
      p.status
    ]);
    const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payments-${this.projectName.replace(/\s+/g, '_')}.csv`;
    link.click();
  }

  // ==========================================
  // ✅ MODULE FORECAST BASELINE - MÉTHODES
  // ==========================================

  loadForecastBaseline(): void {
    this.forecastBaselineLoading = true;
    this.financeService.getForecastBaseline(this.projectId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        this.forecastBaseline = data;
        this.forecastBaselineLoading = false;
      },
      error: (err: any) => {
        this.forecastBaselineLoading = false;
        this.settingsError = this.i18n.t('gm.finance.failedLoadForecastBaseline');
      }
    });
  }

  onSetBaseline(): void {
    if (!confirm(this.i18n.t('gm.finance.willCaptureCurrentForecast'))) return;
    this.forecastBaselineLoading = true;
    this.financeService.setForecastBaseline(this.projectId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        this.forecastBaseline = data;
        this.forecastBaselineLoading = false;
      },
      error: (err: any) => {
        this.forecastBaselineLoading = false;
        this.settingsError = this.i18n.t('gm.finance.failedSetBaseline');
      }
    });
  }

  onResetBaseline(): void {
    if (!confirm(this.i18n.t('gm.finance.willDeleteCurrentBaseline'))) return;
    this.forecastBaselineLoading = true;
    this.financeService.resetForecastBaseline(this.projectId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        this.forecastBaseline = data;
        this.forecastBaselineLoading = false;
      },
      error: (err: any) => {
        this.forecastBaselineLoading = false;
        this.settingsError = this.i18n.t('gm.finance.failedResetBaseline');
      }
    });
  }

  exportForecastBaselineCSV(): void {
    if (!this.forecastBaseline.rows.length) return;
    const headers = ['WBS Code', 'Description', 'Level', 'Baseline Forecast', 'Current Forecast', 'Variance', 'Variance %'];
    const rows = this.forecastBaseline.rows.map((r: any) => [
      r.wbsCode,
      r.description,
      r.level,
      r.baselineForecast || 0,
      r.currentForecast || 0,
      r.variance || 0,
      r.variancePercent ? r.variancePercent.toFixed(2) + '%' : '-'
    ]);
    const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `forecast-baseline-${this.projectName.replace(/\s+/g, '_')}.csv`;
    link.click();
  }

  // ==========================================
  // ✅ CASH FLOW CHART - NOUVELLES MÉTHODES
  // ==========================================
  createCashFlowChart(): void {
    if (!this.cashFlowChartRef?.nativeElement) return;
    this.cashFlowChart?.destroy();

    const milestones = this.paymentSchedule.milestones;
    if (!milestones || milestones.length === 0) return;
    const palette = this.chartTheme.applyDefaults(Chart);

    const monthlyData = new Map<string, { expected: number; paid: number; date: Date }>();
    
    milestones.forEach((m: any) => {
      if (!m.dueDate) return;
      const date = new Date(m.dueDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { expected: 0, paid: 0, date });
      }
      
      const value = this.calculatePaymentValueAsNumber(m.percentage);
      if (m.status === 'PAID') {
        monthlyData.get(monthKey)!.paid += value;
      } else {
        monthlyData.get(monthKey)!.expected += value;
      }
    });

    const sortedMonths = Array.from(monthlyData.entries()).sort((a, b) => 
      a[1].date.getTime() - b[1].date.getTime()
    );

    const labels = sortedMonths.map(([key, data]) => {
      return new Intl.DateTimeFormat(document.documentElement.lang || 'en', { month: 'short', year: 'numeric' }).format(data.date);
    });

    const expectedValues = sortedMonths.map(([, data]) => data.expected);
    const paidValues = sortedMonths.map(([, data]) => data.paid);

    const cumulativeValues: number[] = [];
    let cumulative = 0;
    sortedMonths.forEach(([key, data]) => {
      cumulative += data.expected + data.paid;
      cumulativeValues.push(cumulative);
    });

    this.cashFlowChart = new Chart(this.cashFlowChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: this.i18n.t('gm.finance.chart.expected'),
            data: expectedValues,
            backgroundColor: palette.series[0],
            borderRadius: 4,
            order: 2
          },
          {
            type: 'bar',
            label: this.i18n.t('gm.finance.chart.paid'),
            data: paidValues,
            backgroundColor: palette.series[1],
            borderRadius: 4,
            order: 2
          },
          {
            type: 'line',
            label: this.i18n.t('gm.finance.chart.cumulative'),
            data: cumulativeValues,
            borderColor: palette.series[2],
            backgroundColor: palette.series[2],
            borderWidth: 3,
            pointBackgroundColor: palette.series[2],
            pointRadius: 6,
            pointHoverRadius: 8,
            tension: 0.1,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              // ✅ CORRECTION 1 : Conversion explicite en number pour éviter l'erreur 'null'
              label: (context) => `${context.dataset.label}: ${this.formatCurrency(Number(context.parsed.y))}`
            }
          }
        },
        scales: {
          x: { 
            grid: { display: false }, 
            ticks: { font: { size: 11 }, color: palette.muted } 
          },
          y: {
            beginAtZero: true,
            // ✅ CORRECTION 2 : Suppression de 'drawBorder' qui n'existe plus dans Chart.js v4
            grid: { color: palette.grid }, 
            ticks: { 
              font: { size: 11 }, 
              color: palette.muted, 
              callback: (value) => this.formatCurrency(Number(value)) 
            }
          }
        }
      }
    });
  }

  calculatePaymentValueAsNumber(percentage: number): number {
    if (!this.paymentSchedule.salesValue || this.paymentSchedule.salesValue <= 0) return 0;
    return (this.paymentSchedule.salesValue * percentage) / 100;
  }

  formatCurrency(value: number): string {
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
    return `€${value.toFixed(0)}`;
  }
}
