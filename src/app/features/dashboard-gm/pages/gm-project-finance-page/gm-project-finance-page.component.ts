import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Renderer2, RendererStyleFlags2 } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Chart } from 'chart.js/auto';
import * as XLSX from 'xlsx';
import { GmDashboardService } from '../../services/gm-dashboard.service';
import { GmFinanceService } from '../../services/gm-finance.service';
import { FinanceEntry } from '../../models/finance-entry.model';
import { FinanceSummary } from '../../models/finance-summary.model';
import {
  FinanceSettings,
  FinanceWbsTemplateRow,
  FinanceOwnerMapping,
  FinanceHourlyRate,
  FinanceWbsRowType,
  Department,
  AppUser
} from '../../models/finance-settings.model';
import { HttpClient } from '@angular/common/http';

type SettingsTab = 'wbs' | 'owner' | 'rates' | 'import' | 'apply';

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

  financeSettings: FinanceSettings = {
    defaultHourlyRate: 65,
    templateRows: [],
    ownerMappings: [],
    hourlyRates: []
  };

  importLoading = false;
  importReplaceExisting = true;
  importPreviewRows: FinanceWbsTemplateRow[] = [];
  importMessage: string | null = null;
  importDragOver = false;
  odsTemplateLoading = false;

  applyProjectsList: any[] = [];
  applyProjectsLoading = false;
  applyResultMessage: string | null = null;

  // Department and User management
  departments: Department[] = [];
  usersByDepartment: { [deptId: number]: AppUser[] } = {};
  loadingDepartments = false;

  erpConnecting = false;

  readonly rowTypeOptions: FinanceWbsRowType[] = ['SUMMARY', 'HOUR', 'EXPENSES', 'COST'];
  readonly resourceTypeOptions: string[] = [
    'PM', 'ME', 'EE', 'PC', 'PLC', 'PRC', 'MFC.M', 'MFC.E', 'QA', 'HSE',
    'MEC', 'ELECT', 'FIN', 'CS', 'SALES', 'CUST'
  ];

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
    const overlay = this.settingsOverlayRef?.nativeElement;
    if (overlay && overlay.parentElement === document.body) {
      this.renderer.removeChild(document.body, overlay);
    }
  }

  loadProjectName(): void {
    this.dashboardService.getProjects().subscribe({
      next: (projects) => {
        const project = (projects ?? []).find((p: any) => p.id === this.projectId);
        this.projectName = project?.name || `Project #${this.projectId}`;
      },
      error: () => {
        this.projectName = `Project #${this.projectId}`;
      }
    });
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    this.financeService.getFinanceRows(this.projectId).subscribe({
      next: (rows) => {
        this.rows = rows ?? [];

        this.financeService.getFinanceSummary(this.projectId).subscribe({
          next: (summary) => {
            this.summary = summary;
            this.applyFilters();
            this.loading = false;
            setTimeout(() => this.createCharts());
          },
          error: () => {
            this.error = 'Failed to load finance summary.';
            this.loading = false;
          }
        });
      },
      error: () => {
        this.error = 'Failed to load finance data.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const search = this.searchTerm.toLowerCase().trim();

    this.filteredRows = this.rows.filter(row => {
      const matchesLevel = !this.levelFilter || String(row.level) === this.levelFilter;
      const matchesSearch =
        !search ||
        row.wbsCode.toLowerCase().includes(search) ||
        row.description.toLowerCase().includes(search);

      return matchesLevel && matchesSearch;
    });

    this.sortRows();
  }

  sortBy(column: keyof FinanceEntry): void {
    if (this.sortColumn === column) {
      this.sortDirection *= -1;
    } else {
      this.sortColumn = column;
      this.sortDirection = 1;
    }
    this.sortRows();
  }

  private sortRows(): void {
    this.filteredRows.sort((a, b) => {
      const av = a[this.sortColumn];
      const bv = b[this.sortColumn];

      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * this.sortDirection;
      }

      return String(av ?? '').localeCompare(String(bv ?? '')) * this.sortDirection;
    });
  }

  formatMoney(value: number | null | undefined): string {
    if (value == null) return '—';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
      maximumFractionDigits: 0
    }).format(value);
  }

  getVarianceClass(v: number | null | undefined): string {
    if (!v) return '';
    return v > 0 ? 'pos' : 'neg';
  }

  getCpiClass(cpi: number | null | undefined): string {
    if (!cpi) return '';
    return cpi >= 1 ? 'cpi-good' : 'cpi-bad';
  }

  getProgressClass(p: number | null | undefined): string {
    if (!p) return '';
    if (p < 50) return 'good';
    if (p < 80) return 'warn';
    return 'bad';
  }

  createCharts(): void {
    if (!this.summary || !this.donutChartRef?.nativeElement || !this.barChartRef?.nativeElement) {
      return;
    }

    const s = this.summary;

    this.donutChart?.destroy();
    this.barChart?.destroy();

    this.donutChart = new Chart(this.donutChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Actual Cost', 'Forecast'],
        datasets: [{
          data: [s.totalActualCost, s.totalForecast]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });

    this.barChart = new Chart(this.barChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Budget', 'EAC', 'Variance'],
        datasets: [{
          label: 'Project Cost',
          data: [s.totalBudget, s.totalEac, s.totalVariance]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  safePercent(value: number | null | undefined): number {
    if (value == null || Number.isNaN(value)) {
      return 0;
    }

    return Math.max(0, Math.min(100, value));
  }

    onFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const binary = e.target?.result;
      if (!binary) return;

      const workbook = XLSX.read(binary, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // 🔍 FIX: Read as array of arrays to find the actual header row
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
      
      // Find the row index that contains "WBS" or "LEVEL" (skip blank title rows)
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(rawData.length, 10); i++) {
        const rowStr = rawData[i].map(cell => String(cell).trim().toLowerCase()).join(" ");
        if (rowStr.includes("wbs") || rowStr.includes("level")) {
          headerRowIndex = i;
          break;
        }
      }

      console.log(`✅ Found real headers at row index: ${headerRowIndex}`);

      // Parse the sheet starting from the real header row
      const data = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: "" });
      
      this.importFinance(data as any[]);
    };
    reader.readAsBinaryString(file);
  }
    importFinance(rows: any[]): void {
    if (!rows || rows.length === 0) {
      this.error = 'Excel file is empty.';
      return;
    }

    console.log('🔍 FIRST ROW AFTER FIX:', rows[0]);

    // Helper to safely parse numbers (handles commas, strings, etc.)
    const safeNumber = (val: any): number => {
      if (val === null || val === undefined || val === '') return 0;
      if (typeof val === 'number') return val;
      const cleaned = String(val).replace(/,/g, '').trim(); // Remove commas
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Helper to find a value by checking multiple possible key names (case-insensitive)
    const getValue = (row: any, keys: string[]) => {
      for (const key of Object.keys(row)) {
        const cleanKey = key.trim().toLowerCase();
        for (const target of keys) {
          if (cleanKey === target.toLowerCase()) {
            return row[key];
          }
        }
      }
      return 0; // Default fallback
    };

    const getStr = (row: any, keys: string[]) => {
      for (const key of Object.keys(row)) {
        const cleanKey = key.trim().toLowerCase();
        for (const target of keys) {
          if (cleanKey === target.toLowerCase()) {
            return String(row[key]).trim();
          }
        }
      }
      return '';
    };

    const mapped = rows.map((r) => {
      return {
        // ✅ Map WBS and Description
        wbsCode: getStr(r, ['WBS', 'wbs', 'wbsCode']),
        description: getStr(r, ['Description', 'description', 'DESCRIPTION']),
        level: Number(r['LEVEL'] ?? r['Level'] ?? r['level'] ?? r['LVL'] ?? 1),
        
        // ✅ Map Financials (including client's typos: "Budjet", "Forcast", "Updated budjet")
        sales: safeNumber(getValue(r, ['Sales', 'sales'])),
        budget: safeNumber(getValue(r, ['Budget', 'budget', 'Budjet', 'budjet'])),
        costReserve: safeNumber(getValue(r, ['CR', 'cr', 'Cost Reserve'])),
        updatedBudget: safeNumber(getValue(r, ['Updated budget', 'Updated budjet', 'updatedBudget', 'updated_budget'])),
        commitment: safeNumber(getValue(r, ['Commitment', 'commitment', 'COMMITMENT'])),
        actualCost: safeNumber(getValue(r, ['Actual', 'actual', 'ACTUAL', 'Actual Cost'])),
        forecast: safeNumber(getValue(r, ['Forecast', 'Forcast', 'forecast', 'FORECAST'])),
        
        ownerName: getStr(r, ['Owner', 'ownerName', 'OWNER'])
      };
    });

    console.log('📤 MAPPED DATA TO SEND (First 3 rows):', mapped.slice(0, 3));

    this.financeService.importFinance(this.projectId, mapped).subscribe({
      next: () => {
        this.loadData();
        this.error = null;
      },
      error: (err) => {
        console.error('❌ Import failed:', err);
        this.error = 'Failed to import finance file.';
      }
    });
  }
  recalculate(): void {
    this.loading = true;

    this.financeService.recalculateLabour(this.projectId).subscribe({
      next: () => this.loadData(),
      error: () => {
        this.error = 'Failed to recalculate finance.';
        this.loading = false;
      }
    });
  }

  openSettings(): void {
    this.settingsOpen = true;
    this.activeSettingsTab = 'wbs';
    this.settingsLoading = true;
    this.settingsError = null;

    this.financeSettings = {
      defaultHourlyRate: this.financeSettings?.defaultHourlyRate ?? 65,
      templateRows: this.financeSettings?.templateRows ?? [],
      ownerMappings: this.financeSettings?.ownerMappings ?? [],
      hourlyRates: this.financeSettings?.hourlyRates ?? []
    };

    setTimeout(() => this.attachOverlayToBody());

    this.financeService.getFinanceSettings().subscribe({
      next: (settings) => {
        this.financeSettings = {
          defaultHourlyRate: settings?.defaultHourlyRate ?? 65,
          templateRows: [...(settings?.templateRows ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
          ownerMappings: [...(settings?.ownerMappings ?? [])],
          hourlyRates: [...(settings?.hourlyRates ?? [])]
        };
        this.settingsLoading = false;
        
        // Load departments after settings are loaded
        this.loadDepartments();
      },
      error: (err) => {
        console.error('[FinanceSettings] load failed:', err);
        this.settingsLoading = false;
        this.settingsError = err?.status === 404
          ? 'Finance settings endpoint not found (404). The backend route "/finance/settings" may be missing.'
          : 'Failed to load finance settings.';
      }
    });
  }

  closeSettings(): void {
    this.detachOverlayFromBody();
    this.settingsOpen = false;
    this.settingsError = null;
  }

  private attachOverlayToBody(): void {
    const overlay = this.settingsOverlayRef?.nativeElement;
    if (!overlay || overlay.parentElement === document.body) return;

    this.settingsOverlayHomeParent = overlay.parentElement;
    this.settingsOverlayHomeNextSibling = overlay.nextSibling;

    this.renderer.appendChild(document.body, overlay);

    this.renderer.setStyle(overlay, 'opacity', '1', RendererStyleFlags2.Important);
    this.renderer.setStyle(overlay, 'visibility', 'visible', RendererStyleFlags2.Important);
    this.renderer.setStyle(overlay, 'display', 'flex', RendererStyleFlags2.Important);
    this.renderer.setStyle(overlay, 'position', 'fixed', RendererStyleFlags2.Important);
    this.renderer.setStyle(overlay, 'top', '0', RendererStyleFlags2.Important);
    this.renderer.setStyle(overlay, 'left', '0', RendererStyleFlags2.Important);
    this.renderer.setStyle(overlay, 'right', '0', RendererStyleFlags2.Important);
    this.renderer.setStyle(overlay, 'bottom', '0', RendererStyleFlags2.Important);
    this.renderer.setStyle(overlay, 'z-index', '2147483000', RendererStyleFlags2.Important);
    this.renderer.setStyle(overlay, 'pointer-events', 'auto', RendererStyleFlags2.Important);
  }

  private detachOverlayFromBody(): void {
    const overlay = this.settingsOverlayRef?.nativeElement;
    if (!overlay || overlay.parentElement !== document.body) return;

    ['opacity', 'visibility', 'display', 'position', 'top', 'left', 'right', 'bottom', 'z-index', 'pointer-events']
      .forEach(prop => this.renderer.removeStyle(overlay, prop));

    if (this.settingsOverlayHomeParent) {
      if (this.settingsOverlayHomeNextSibling) {
        this.renderer.insertBefore(
          this.settingsOverlayHomeParent,
          overlay,
          this.settingsOverlayHomeNextSibling
        );
      } else {
        this.renderer.appendChild(this.settingsOverlayHomeParent, overlay);
      }
    }
  }
  saveSettings(): void {
    this.settingsError = null;

    // ✅ NEW: Validate that all WBS Codes are unique before saving
    const codes = this.financeSettings.templateRows.map(r => 
      r.codeTemplate ? r.codeTemplate.trim().toLowerCase() : ''
    );
    const uniqueCodes = new Set(codes);
    
    if (codes.length !== uniqueCodes.size) {
      this.settingsError = 'Validation Error: All WBS Codes must be unique. Please remove or rename duplicate codes.';
      return; // Stop the save process immediately
    }

    this.settingsSaving = true;
    this.normalizeTemplateSortOrder();

    this.financeService.saveFinanceSettings(this.financeSettings).subscribe({
      next: (saved) => {
        this.financeSettings = {
          defaultHourlyRate: saved.defaultHourlyRate ?? 65,
          templateRows: [...(saved.templateRows ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
          ownerMappings: [...(saved.ownerMappings ?? [])],
          hourlyRates: [...(saved.hourlyRates ?? [])]
        };
        this.settingsSaving = false;
      },
      error: () => {
        this.settingsSaving = false;
        this.settingsError = 'Failed to save finance settings.';
      }
    });
  }


  applyTemplateToCurrentProject(): void {
    this.applyLoading = true;
    this.settingsError = null;
    this.applyResultMessage = null;
    
    this.financeService.applyFinanceTemplate({ projectIds: [this.projectId] }).subscribe({
      next: (result) => {
        this.applyLoading = false;
        this.applyResultMessage = `Applied to ${result?.projectsProcessed ?? 1} project(s), ${result?.rowsGenerated ?? 0} rows generated.`;
        this.loadData();
      },
      error: () => {
        this.applyLoading = false;
        this.settingsError = 'Failed to apply finance template.';
      }
    });
  }

  loadApplyProjectsList(): void {
    this.applyProjectsLoading = true;
    this.settingsError = null;

    this.dashboardService.getProjects().subscribe({
      next: (projects) => {
        this.applyProjectsList = projects ?? [];
        this.applyProjectsLoading = false;
      },
      error: () => {
        this.applyProjectsLoading = false;
        this.settingsError = 'Failed to load the projects list.';
      }
    });
  }

  applyTemplateToAllProjects(): void {
    if (this.applyProjectsList.length === 0) {
      this.settingsError = 'No projects found. Create projects in the Dashboard first.';
      return;
    }

    this.applyLoading = true;
    this.settingsError = null;
    this.applyResultMessage = null;

    this.financeService.applyFinanceTemplateToAll().subscribe({
      next: (result) => {
        this.applyLoading = false;
        this.applyResultMessage = `Applied to ${result?.projectsProcessed ?? this.applyProjectsList.length} project(s), ${result?.rowsGenerated ?? 0} rows generated.`;
        this.loadData();
      },
      error: () => {
        this.applyLoading = false;
        this.settingsError = 'Failed to apply the WBS template to all projects.';
      }
    });
  }

  setSettingsTab(tab: SettingsTab): void {
    this.activeSettingsTab = tab;

    if (tab === 'apply' && this.applyProjectsList.length === 0) {
      this.loadApplyProjectsList();
    }
  }

  getOwnerKeyOptions(): string[] {
    const keys = this.financeSettings.ownerMappings
      .map(m => m.ownerKey)
      .filter((k): k is string => !!k && k.trim().length > 0);
    return [...new Set(keys)].sort();
  }

  addTemplateRow(): void {
    const nextSort = this.financeSettings.templateRows.length + 1;
    this.financeSettings.templateRows.push({
      sortOrder: nextSort,
      level: 1,
      codeTemplate: 'xxx25-NEW',
      description: 'New Row',
      type: 'COST',
      departmentId: null,
      departmentName: null,
      ownerId: null,
      ownerName: null,
      ownerKey: null,
      hourRate: null
    });
  }

  removeTemplateRow(index: number): void {
    this.financeSettings.templateRows.splice(index, 1);
    this.normalizeTemplateSortOrder();
  }

  addOwnerMapping(): void {
    this.financeSettings.ownerMappings.push({
      ownerKey: '',
      resourceType: 'ME',
      roleFilter: '',
      notes: ''
    });
  }

  removeOwnerMapping(index: number): void {
    this.financeSettings.ownerMappings.splice(index, 1);
  }

  addHourlyRate(): void {
    this.financeSettings.hourlyRates.push({
      resourceType: 'ME',
      hourlyRate: 65
    });
  }

  removeHourlyRate(index: number): void {
    this.financeSettings.hourlyRates.splice(index, 1);
  }

  private normalizeTemplateSortOrder(): void {
    this.financeSettings.templateRows = this.financeSettings.templateRows.map((row, index) => ({
      ...row,
      sortOrder: index + 1
    }));
  }

  // ✅ FIXED: Point directly to backend port 8087
  loadDepartments(): void {
    this.loadingDepartments = true;
    console.log('🔍 Loading departments from backend...');
    
    this.http.get<Department[]>('http://localhost:8087/api/departments').subscribe({
      next: (depts) => {
        console.log('✅ Departments loaded:', depts);
        this.departments = depts;
        this.loadingDepartments = false;
      },
      error: (err) => {
        console.error('❌ Failed to load departments:', err);
        this.loadingDepartments = false;
        this.settingsError = 'Failed to load departments. Check if backend is running on port 8087.';
      }
    });
  }

  // ✅ FIXED: Point directly to backend port 8087
  loadUsersByDepartment(deptId: number): void {
    if (this.usersByDepartment[deptId]) return;
    
    this.http.get<AppUser[]>(`http://localhost:8087/api/departments/${deptId}/users`).subscribe({
      next: (users) => {
        console.log(`✅ Users loaded for dept ${deptId}:`, users);
        this.usersByDepartment[deptId] = users;
      },
      error: (err) => {
        console.error(`❌ Failed to load users for dept ${deptId}:`, err);
        this.usersByDepartment[deptId] = [];
      }
    });
  }

  onDepartmentChange(row: FinanceWbsTemplateRow, deptId: number | null): void {
    row.departmentId = deptId;
    row.ownerId = null;
    row.ownerName = null;
    
    if (deptId) {
      this.loadUsersByDepartment(deptId);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  onWbsTemplateFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.processWbsTemplateFile(file);
    input.value = '';
  }

  onImportDragOver(event: DragEvent): void {
    event.preventDefault();
    this.importDragOver = true;
  }

  onImportDragLeave(): void {
    this.importDragOver = false;
  }

  onImportDrop(event: DragEvent): void {
    event.preventDefault();
    this.importDragOver = false;

    const file = event.dataTransfer?.files?.[0];
    if (!file) return;

    const allowed = ['.json', '.csv'];
    const isAllowed = allowed.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isAllowed) {
      this.settingsError = 'Only JSON or CSV files are accepted in this drop zone.';
      return;
    }

    this.processWbsTemplateFile(file);
  }

  private processWbsTemplateFile(file: File): void {
    this.importMessage = null;
    this.settingsError = null;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.json')) {
      this.readWbsJson(file);
    } else if (fileName.endsWith('.csv')) {
      this.readWbsCsv(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.ods')) {
      this.readWbsExcel(file);
    } else {
      this.settingsError = 'Unsupported file type. Please import JSON, CSV, XLS, XLSX or ODS.';
    }
  }

  loadOdsTemplate(): void {
    this.odsTemplateLoading = true;
    this.settingsError = null;
    this.importMessage = null;

    this.financeService.loadOdsTemplate().subscribe({
      next: (rows) => {
        this.importPreviewRows = this.normalizeImportedWbsRows(rows ?? []);
        this.importMessage = `${this.importPreviewRows.length} WBS rows loaded from the standard ODS template. Review below, then click "Import Template".`;
        this.odsTemplateLoading = false;
      },
      error: (err) => {
        this.odsTemplateLoading = false;
        this.settingsError = err?.status === 404
          ? 'No standard ODS template found on the server. Ask an administrator to upload WBS_Structure.ods, or use manual import below.'
          : 'Failed to load the standard ODS template.';
      }
    });
  }
 private readWbsJson(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const rows = Array.isArray(parsed) ? parsed : parsed.rows;
        
        this.importPreviewRows = this.normalizeImportedWbsRows(rows ?? []);
        this.importMessage = `${this.importPreviewRows.length} WBS rows ready to import.`;
        this.settingsError = null; // Clear any previous errors
      } catch (err: any) {
        this.settingsError = `Import Error: ${err.message || 'Invalid JSON structure'}`;
        this.importPreviewRows = [];
      }
    };
    reader.readAsText(file);
  }

  private readWbsCsv(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '');
        const workbook = XLSX.read(text, { type: 'string' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        this.importPreviewRows = this.normalizeImportedWbsRows(rows as any[]);
        this.importMessage = `${this.importPreviewRows.length} WBS rows ready to import.`;
        this.settingsError = null;
      } catch (err: any) {
        this.settingsError = `Import Error: ${err.message || 'Failed to parse CSV'}`;
        this.importPreviewRows = [];
      }
    };
    reader.readAsText(file);
  }

  private readWbsExcel(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const binary = e.target?.result;
        if (!binary) return;

        const workbook = XLSX.read(binary, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        this.importPreviewRows = this.normalizeImportedWbsRows(rows as any[]);
        this.importMessage = `${this.importPreviewRows.length} WBS rows ready to import.`;
        this.settingsError = null;
      } catch (err: any) {
        this.settingsError = `Import Error: ${err.message || 'Failed to parse Excel file'}`;
        this.importPreviewRows = [];
      }
    };
    reader.readAsBinaryString(file);
  }
// ✅ UPDATED: Strict validation for explicit TYPE and clear error messages
  private normalizeImportedWbsRows(rows: any[]): FinanceWbsTemplateRow[] {
    const mapped = (rows ?? []).map((r, index) => {
      const codeTemplate = r['WBS CODE'] ?? r['WBS'] ?? r['Code'] ?? r['codeTemplate'] ?? r['wbsCode'] ?? '';
      const description = r['DESCRIPTION'] ?? r['Description'] ?? r['description'] ?? '';
      const level = Number(r['LVL'] ?? r['Level'] ?? r['LEVEL'] ?? r['level'] ?? this.detectWbsLevel(String(codeTemplate)));

      // ✅ STRICT CHECK: Require explicit TYPE
      const explicitTypeRaw = r['TYPE'] ?? r['Type'] ?? r['type'] ?? null;

      if (!explicitTypeRaw) {
        throw new Error(`Row ${index + 1} ("${codeTemplate}") is missing the required 'TYPE' column. Must be SUMMARY, HOUR, EXPENSES, or COST.`);
      }

      const upper = String(explicitTypeRaw).toUpperCase().trim();
      let type: FinanceWbsRowType;
      
      if (upper === 'SUMMARY') type = 'SUMMARY';
      else if (upper === 'HOUR') type = 'HOUR';
      else if (upper === 'EXPENSES') type = 'EXPENSES';
      else if (upper === 'COST') type = 'COST';
      else {
        throw new Error(`Row ${index + 1} ("${codeTemplate}") has an invalid TYPE: "${explicitTypeRaw}". Must be SUMMARY, HOUR, EXPENSES, or COST.`);
      }

      return {
        sortOrder: index + 1,
        level,
        codeTemplate: String(codeTemplate).trim(),
        description: String(description).trim(),
        type,
        departmentId: null,
        departmentName: null,
        ownerId: null,
        ownerName: null,
        ownerKey: r['OWNER KEY'] ?? r['Owner Key'] ?? r['ownerKey'] ?? null,
        hourRate: r['HOUR RATE'] ?? r['Hour Rate'] ?? r['hourRate'] ?? null
      };
    }).filter(row => row.codeTemplate && row.description);

    // Structural auto-detection: If a row has children, it acts as a SUMMARY.
    // This is safe because it's based on hierarchy, not guessing from description text.
    return mapped.map(row => {
      const hasChildren = mapped.some(other =>
        other.codeTemplate !== row.codeTemplate &&
        other.codeTemplate.startsWith(row.codeTemplate + '-')
      );
      return hasChildren ? { ...row, type: 'SUMMARY' as FinanceWbsRowType } : row;
    });
  }

  private detectWbsLevel(code: string): number {
    if (!code) return 1;
    if (code.includes('.')) return code.split('.').length;
    if (code.includes('-')) return Math.max(1, code.split('-').length - 1);
    return 1;
  }

  confirmImportWbsTemplate(): void {
    if (this.importPreviewRows.length === 0) {
      this.settingsError = 'Please select a valid WBS file first.';
      return;
    }

    this.importLoading = true;
    this.settingsError = null;

    this.financeService.importWbsTemplate(
      this.importPreviewRows,
      this.importReplaceExisting
    ).subscribe({
      next: (saved) => {
        this.financeSettings = {
          defaultHourlyRate: saved.defaultHourlyRate ?? 65,
          templateRows: [...(saved.templateRows ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
          ownerMappings: [...(saved.ownerMappings ?? [])],
          hourlyRates: [...(saved.hourlyRates ?? [])]
        };

        this.importLoading = false;
        this.importMessage = `Imported ${this.financeSettings.templateRows.length} WBS template rows successfully.`;
        this.activeSettingsTab = 'wbs';
      },
      error: () => {
        this.importLoading = false;
        this.settingsError = 'Failed to import WBS template.';
      }
    });
  }

  updateForecast(row: FinanceEntry, newValue: string | number): void {
    const parsed = Number(newValue);
    if (Number.isNaN(parsed) || parsed < 0) return;
    if (parsed === row.forecast) return;

    const previous = row.forecast;
    row.forecast = parsed;

    this.financeService.updateForecastValue(this.projectId, row.id, parsed).subscribe({
      next: (updated) => {
        const idx = this.rows.findIndex(r => r.id === updated.id);
        if (idx !== -1) this.rows[idx] = updated;
        this.applyFilters();

        this.financeService.getFinanceSummary(this.projectId).subscribe({
          next: (summary) => {
            this.summary = summary;
            this.createCharts();
          }
        });
      },
      error: () => {
        row.forecast = previous;
        this.error = 'Failed to update forecast.';
      }
    });
  }

  connectErp(): void {
    this.erpConnecting = true;
    this.error = null;

    setTimeout(() => {
      this.erpConnecting = false;
      this.error = 'ERP connection is not configured yet. Contact your administrator.';
    }, 600);
  }
}