import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Renderer2, RendererStyleFlags2 } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Chart } from 'chart.js/auto';
import * as XLSX from 'xlsx';
import { GmDashboardService } from '../../services/gm-dashboard.service';
import { GmFinanceService } from '../../services/gm-finance.service';
import { FinanceEntry, FinanceSummary, FinanceSettings, FinanceWbsTemplateRow, FinanceWbsRowType, Department, AppUser } from '../../models/finance-settings.model';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { assertSpreadsheetFile, assertSpreadsheetRowLimit, assertValidWorkbook } from 'src/app/core/utils/spreadsheet-import.utils';

type SettingsTab = 'wbs' | 'import';

@Component({
  selector: 'app-gm-project-finance-page',
  templateUrl: './gm-project-finance-page.component.html',
  styleUrls: ['./gm-project-finance-page.component.scss']
})
export class GmProjectFinancePageComponent implements OnInit, OnDestroy {
  @ViewChild('donutChart') donutChartRef!: ElementRef;
  @ViewChild('barChart') barChartRef!: ElementRef;
  @ViewChild('settingsOverlayRef') settingsOverlayRef?: ElementRef<HTMLElement>;
  
  private settingsOverlayHomeParent: HTMLElement | null = null;
  private settingsOverlayHomeNextSibling: Node | null = null;
  private donutChart?: Chart;
  private barChart?: Chart;
  private chartCreationTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly destroy$ = new Subject<void>();
  private destroyed = false;

  projectId!: number;
  loading = false;
  saving = false;
  error: string | null = null;

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
  importReplaceExisting = true;
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

  constructor(
    private route: ActivatedRoute,
    private financeService: GmFinanceService,
    private dashboardService: GmDashboardService,
    private renderer: Renderer2,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProjectName();
    this.loadData();
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
    this.donutChart = undefined;
    this.barChart = undefined;

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
          error: () => { this.error = 'Failed to load finance summary.'; this.loading = false; }
        });
      },
      error: () => { this.error = 'Failed to load finance data.'; this.loading = false; }
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

  getVarianceClass(v: number | null | undefined): string { if (!v) return ''; return v > 0 ? 'pos' : 'neg'; }
  getCpiClass(cpi: number | null | undefined): string { if (!cpi) return ''; return cpi >= 1 ? 'cpi-good' : 'cpi-bad'; }
  getProgressClass(p: number | null | undefined): string { if (!p) return ''; if (p < 50) return 'good'; if (p < 80) return 'warn'; return 'bad'; }

  createCharts(): void {
    if (this.destroyed || !this.summary || !this.donutChartRef?.nativeElement || !this.barChartRef?.nativeElement) return;
    const s = this.summary;
    this.donutChart?.destroy();
    this.barChart?.destroy();

    this.donutChart = new Chart(this.donutChartRef.nativeElement, {
      type: 'doughnut',
      data: { labels: ['Actual Cost', 'Forecast'], datasets: [{ data: [s.totalActualCost, s.totalForecast] }] },
      options: { responsive: true, maintainAspectRatio: false }
    });

    this.barChart = new Chart(this.barChartRef.nativeElement, {
      type: 'bar',
      data: { labels: ['Budget', 'EAC', 'Variance'], datasets: [{ label: 'Project Cost', data: [s.totalBudget, s.totalEac, s.totalVariance] }] },
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
    catch (error) { this.error = error instanceof Error ? error.message : 'Invalid or unsupported spreadsheet file.'; input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const binary = e.target?.result;
        if (!binary) throw new Error('Invalid or unsupported spreadsheet file.');
        const workbook = XLSX.read(binary, { type: 'binary' });
        const sheet = workbook.Sheets[assertValidWorkbook(workbook)];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
        assertSpreadsheetRowLimit(rawData);
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(rawData.length, 10); i++) {
          const rowStr = rawData[i].map(cell => String(cell).trim().toLowerCase()).join(" ");
          if (rowStr.includes("wbs") && rowStr.includes("description")) { headerRowIndex = i; break; }
        }
        if (headerRowIndex < 0) throw new Error('Finance spreadsheet must include WBS and Description headers.');
        const data = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: "" }) as any[];
        assertSpreadsheetRowLimit(data);
        this.importFinance(data);
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Invalid or unsupported spreadsheet file.';
      }
    };
    reader.readAsBinaryString(file);
  }

  importFinance(rows: any[]): void {
    if (!rows || rows.length === 0) { this.error = 'Excel file is empty.'; return; }
    try { assertSpreadsheetRowLimit(rows); } catch (error) { this.error = error instanceof Error ? error.message : 'Invalid or unsupported spreadsheet file.'; return; }
    const safeNumber = (val: any): number => {
      if (val === null || val === undefined || val === '') return 0;
      if (typeof val === 'number') {
        if (!Number.isFinite(val)) throw new Error('Finance spreadsheet contains an invalid number.');
        return val;
      }
      const parsed = Number(String(val).replace(/,/g, '').trim());
      if (!Number.isFinite(parsed)) throw new Error('Finance spreadsheet contains an invalid number.');
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
      if (!r || typeof r !== 'object') throw new Error(`Finance row ${index + 1} is malformed.`);
      const wbsCode = getStr(r, ['WBS', 'wbs', 'wbsCode']);
      const description = getStr(r, ['Description', 'description', 'DESCRIPTION']);
      const level = Number(r['LEVEL'] ?? r['Level'] ?? r['level'] ?? r['LVL'] ?? 1);
      if (!wbsCode || !description || !Number.isInteger(level) || level < 1) throw new Error(`Finance row ${index + 1} is invalid.`);
      return { wbsCode, description, level, sales: safeNumber(getValue(r, ['Sales', 'sales'])), budget: safeNumber(getValue(r, ['Budget', 'budget', 'Budjet', 'budjet'])), costReserve: safeNumber(getValue(r, ['CR', 'cr', 'Cost Reserve'])), updatedBudget: safeNumber(getValue(r, ['Updated budget', 'Updated budjet', 'updatedBudget', 'updated_budget'])), commitment: safeNumber(getValue(r, ['Commitment', 'commitment', 'COMMITMENT'])), actualCost: safeNumber(getValue(r, ['Actual', 'actual', 'ACTUAL', 'Actual Cost'])), forecast: safeNumber(getValue(r, ['Forecast', 'Forcast', 'forecast', 'FORECAST'])), ownerName: getStr(r, ['Owner', 'ownerName', 'OWNER']) };
    });
    this.financeService.importFinance(this.projectId, mapped).subscribe({
      next: () => { this.loadData(); this.error = null; },
      error: () => { this.error = 'Failed to import finance file.'; }
    });
  }

  recalculate(): void {
    this.loading = true;
    this.financeService.recalculateLabour(this.projectId).subscribe({
      next: () => this.loadData(),
      error: () => { this.error = 'Failed to recalculate finance.'; this.loading = false; }
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
      },
      error: (err) => {
        this.settingsLoading = false;
        this.settingsError = err?.status === 404 ? 'Finance settings endpoint not found.' : 'Failed to load finance settings.';
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
      this.settingsError = 'Validation Error: All WBS Codes must be unique.';
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
      },
      error: () => { this.settingsSaving = false; this.settingsError = 'Failed to save finance settings.'; }
    });
  }

  applyTemplateToCurrentProject(): void {
    if (this.financeSettings.templateRows.length === 0) {
      this.settingsError = 'Please add at least one WBS row before applying.';
      return;
    }
    this.applyLoading = true;
    this.settingsError = null;
    this.applyResultMessage = null;

    this.financeService.applyFinanceTemplateToCurrentProject(this.projectId).subscribe({
      next: (result) => {
        this.applyLoading = false;
        this.applyResultMessage = `✅ WBS applied successfully to "${this.projectName}" - ${result?.rowsGenerated ?? 0} rows generated.`;
        this.loadData();
      },
      error: () => {
        this.applyLoading = false;
        this.settingsError = 'Failed to apply finance template to current project.';
      }
    });
  }

  setSettingsTab(tab: SettingsTab): void {
    this.activeSettingsTab = tab;
  }

  addTemplateRow(): void {
    const nextSort = this.financeSettings.templateRows.length + 1;
    this.financeSettings.templateRows.push({
      sortOrder: nextSort, level: 1, codeTemplate: 'xxx25-NEW', description: 'New Row', type: 'COST',
      departmentId: null, departmentName: null, ownerId: null, ownerName: null, ownerKey: null, hourRate: null, resourceType: null
    });
  }

  removeTemplateRow(index: number): void {
    this.financeSettings.templateRows.splice(index, 1);
    this.normalizeTemplateSortOrder();
  }

  private normalizeTemplateSortOrder(): void {
    this.financeSettings.templateRows = this.financeSettings.templateRows.map((row, index) => ({ ...row, sortOrder: index + 1 }));
  }

  loadDepartments(): void {
    this.loadingDepartments = true;
    this.http.get<Department[]>(`${environment.apiUrl}/departments`).subscribe({
      next: (depts) => { this.departments = depts; this.loadingDepartments = false; },
      error: () => { this.loadingDepartments = false; this.settingsError = 'Failed to load departments.'; }
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
    if (!isAllowed) { this.settingsError = 'Only JSON, CSV, or Excel files are accepted.'; return; }
    this.processWbsTemplateFile(file);
  }

  private processWbsTemplateFile(file: File): void {
    this.importMessage = null;
    this.settingsError = null;
    const fileName = file.name.toLowerCase();
    try { assertSpreadsheetFile(file, ['.json', '.csv', '.xlsx', '.xls', '.ods']); }
    catch (error) { this.settingsError = error instanceof Error ? error.message : 'Invalid or unsupported spreadsheet file.'; return; }
    if (fileName.endsWith('.json')) this.readWbsJson(file);
    else if (fileName.endsWith('.csv')) this.readWbsCsv(file);
    else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.ods')) this.readWbsExcel(file);
    else this.settingsError = 'Unsupported file type.';
  }

  loadOdsTemplate(): void {
    this.odsTemplateLoading = true;
    this.settingsError = null;
    this.importMessage = null;
    this.financeService.loadOdsTemplate().subscribe({
      next: (rows) => {
        this.importPreviewRows = this.normalizeImportedWbsRows(rows ?? []);
        this.importMessage = `${this.importPreviewRows.length} WBS rows loaded.`;
        this.odsTemplateLoading = false;
      },
      error: () => { this.odsTemplateLoading = false; this.settingsError = 'Failed to load the standard ODS template.'; }
    });
  }

  private readWbsJson(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        this.importPreviewRows = this.normalizeImportedWbsRows(Array.isArray(parsed) ? parsed : parsed.rows);
        assertSpreadsheetRowLimit(this.importPreviewRows);
        if (!this.importPreviewRows.length) throw new Error('WBS file is empty or malformed.');
        this.importMessage = `${this.importPreviewRows.length} WBS rows ready to import.`;
      } catch (err: any) { this.settingsError = `Import Error: ${err.message}`; this.importPreviewRows = []; }
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
        if (!this.importPreviewRows.length) throw new Error('WBS file is empty or malformed.');
        this.importMessage = `${this.importPreviewRows.length} WBS rows ready to import.`;
      } catch (err: any) { this.settingsError = `Import Error: ${err.message}`; this.importPreviewRows = []; }
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
        if (!this.importPreviewRows.length) throw new Error('WBS file is empty or malformed.');
        this.importMessage = `${this.importPreviewRows.length} WBS rows ready to import.`;
      } catch (err: any) { this.settingsError = `Import Error: ${err.message}`; this.importPreviewRows = []; }
    };
    reader.readAsBinaryString(file);
  }

  private normalizeImportedWbsRows(rows: any[]): FinanceWbsTemplateRow[] {
    if (!Array.isArray(rows)) throw new Error('WBS file contains malformed rows.');
    return rows.map((r, index) => {
      if (!r || typeof r !== 'object') throw new Error(`WBS row ${index + 1} is malformed.`);
      const codeTemplate = String(r['WBS CODE'] ?? r['WBS'] ?? r['Code'] ?? r['codeTemplate'] ?? r['wbsCode'] ?? '').trim();
      const description = String(r['DESCRIPTION'] ?? r['Description'] ?? r['description'] ?? '').trim();
      const level = Number(r['LVL'] ?? r['Level'] ?? r['LEVEL'] ?? r['level'] ?? this.detectWbsLevel(codeTemplate));
      if (!codeTemplate || !description || !Number.isInteger(level) || level < 1) throw new Error(`WBS row ${index + 1} is invalid.`);
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
    if (this.importPreviewRows.length === 0) { this.settingsError = 'Please select a valid WBS file first.'; return; }
    this.importLoading = true;
    this.settingsError = null;
    
    this.financeService.importWbsTemplate(this.importPreviewRows, this.importReplaceExisting, this.projectId).subscribe({
      next: (saved) => {
        this.financeSettings = {
          defaultHourlyRate: saved.defaultHourlyRate ?? 65,
          templateRows: [...(saved.templateRows ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        };
        this.importLoading = false;
        this.importMessage = `Imported ${this.financeSettings.templateRows.length} WBS template rows successfully.`;
        this.activeSettingsTab = 'wbs';
      },
      error: () => { this.importLoading = false; this.settingsError = 'Failed to import WBS template.'; }
    });
  }

  updateForecast(row: FinanceEntry, newValue: string | number): void {
    const parsed = Number(newValue);
    if (Number.isNaN(parsed) || parsed < 0 || parsed === row.forecast) return;
    const previous = row.forecast;
    row.forecast = parsed;
    this.financeService.updateForecastValue(this.projectId, row.id, parsed).subscribe({
      next: (updated) => {
        const idx = this.rows.findIndex(r => r.id === updated.id);
        if (idx !== -1) this.rows[idx] = updated;
        this.applyFilters();
        this.financeService.getFinanceSummary(this.projectId).subscribe({ next: (summary) => { this.summary = summary; this.createCharts(); } });
      },
      error: () => { row.forecast = previous; this.error = 'Failed to update forecast.'; }
    });
  }

  connectErp(): void {
    this.erpConnecting = true;
    this.error = null;
    setTimeout(() => { this.erpConnecting = false; this.error = 'ERP connection is not configured yet.'; }, 600);
  }
}
