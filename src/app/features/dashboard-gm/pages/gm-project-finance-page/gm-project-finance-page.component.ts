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
  FinanceWbsRowType
} from '../../models/finance-settings.model';

type SettingsTab = 'wbs' | 'owner' | 'rates' | 'import' | 'apply';

@Component({
  selector: 'app-gm-project-finance-page',
  templateUrl: './gm-project-finance-page.component.html',
  styleUrls: ['./gm-project-finance-page.component.scss']
})
export class GmProjectFinancePageComponent implements OnInit, OnDestroy {
  @ViewChild('donutChart') donutChartRef!: ElementRef;
  @ViewChild('barChart') barChartRef!: ElementRef;

  // ─── PORTAIL DOM pour la modale (fix du bug d'affichage) ────
  // Un ancêtre (layout, wrapper de transition de route, etc.)
  // possède probablement un transform/overflow/filter qui piège
  // le `position: fixed` de la modale, la rendant invisible même
  // si elle est bien présente dans le DOM (confirmé par devtools :
  // display:flex, ng-reflect-ng-if:"true", mais rien à l'écran).
  // Solution robuste : déplacer physiquement le noeud DOM de la
  // modale dans <body> à l'ouverture, et le remettre à sa place
  // d'origine avant la fermeture pour qu'Angular puisse le détruire
  // proprement via *ngIf.
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

  // ─── Apply to Projects (liste complète, pas juste le projet courant) ──
  applyProjectsList: any[] = [];
  applyProjectsLoading = false;
  applyResultMessage: string | null = null;

  // ─── Connect ERP (Phase 6 - stub) ───────────────────────────
  erpConnecting = false;

  readonly rowTypeOptions: FinanceWbsRowType[] = ['SUMMARY', 'HOUR', 'COST'];
  readonly resourceTypeOptions: string[] = [
    'PM', 'ME', 'EE', 'PC', 'PLC', 'PRC', 'MFC.M', 'MFC.E', 'QA', 'HSE',
    'MEC', 'ELECT', 'FIN', 'CS', 'SALES', 'CUST'
  ];

  constructor(
    private route: ActivatedRoute,
    private financeService: GmFinanceService,
    private dashboardService: GmDashboardService,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProjectName();
    this.loadData();
  }

  ngOnDestroy(): void {
    // Sécurité : si le composant est détruit pendant que la modale
    // est encore téléportée dans <body>, on la retire manuellement
    // pour éviter une fuite mémoire / un élément DOM orphelin.
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
      const data = XLSX.utils.sheet_to_json(sheet);

      this.importFinance(data as any[]);
    };

    reader.readAsBinaryString(file);
  }

  importFinance(rows: any[]): void {
    const mapped = rows.map(r => ({
      wbsCode: r['WBS'] ?? r['wbsCode'] ?? '',
      description: r['Description'] ?? r['description'] ?? '',
      level: Number(r['Level'] ?? r['level'] ?? 1),
      sales: Number(r['Sales'] ?? r['sales'] ?? 0),
      budget: Number(r['Budget'] ?? r['budget'] ?? 0),
      commitment: Number(r['Commitment'] ?? r['commitment'] ?? 0),
      actualCost: Number(r['Actual Cost'] ?? r['actualCost'] ?? 0),
      forecast: Number(r['Forecast'] ?? r['forecast'] ?? 0),
      ownerName: r['Owner'] ?? r['ownerName'] ?? ''
    }));

    this.financeService.importFinance(this.projectId, mapped).subscribe({
      next: () => this.loadData(),
      error: () => this.error = 'Failed to import finance file.'
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

  // ─── PHASE 2: openSettings rendu défensif ───────────────────
  // La modale s'ouvre TOUJOURS (settingsOpen = true en premier).
  // On garantit une structure financeSettings valide même avant la
  // réponse API, pour ne jamais casser le rendu (*ngFor sur undefined).
  // En cas d'erreur (404 = route backend absente, 500 = erreur serveur),
  // le message exact s'affiche DANS la modale plutôt que de la bloquer.
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

    // Laisse Angular créer le noeud (*ngIf) avant de le téléporter dans <body>.
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
    // Remet le noeud à sa place d'origine AVANT de couper *ngIf,
    // sinon Angular ne retrouve pas le noeud là où il l'a créé
    // (il a été déplacé dans <body>) et lève une erreur au retrait.
    this.detachOverlayFromBody();
    this.settingsOpen = false;
    this.settingsError = null;
  }

  // ─── Portail DOM : contourne un ancêtre transform/overflow ──
  private attachOverlayToBody(): void {
    const overlay = this.settingsOverlayRef?.nativeElement;
    if (!overlay || overlay.parentElement === document.body) return;

    this.settingsOverlayHomeParent = overlay.parentElement;
    this.settingsOverlayHomeNextSibling = overlay.nextSibling;

    this.renderer.appendChild(document.body, overlay);

    // FIX DIAGNOSTIQUÉ : une règle CSS globale (probablement une classe
    // générique .overlay/.settings-overlay du thème/UI kit, chargée
    // après le style scopé du composant) impose visibility:hidden et
    // opacity:0 malgré notre CSS. On force donc ces propriétés en
    // inline !important, qui gagne toujours sur n'importe quelle
    // feuille de style externe, peu importe sa spécificité ou son
    // ordre de chargement.
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

    // Nettoie les styles inline forcés à l'ouverture (propreté, pas
    // strictement nécessaire puisque le noeud sera détruit par *ngIf
    // juste après, mais évite tout résidu si jamais réutilisé).
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
    this.settingsSaving = true;
    this.settingsError = null;

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

  // ─── Apply to ALL projects (comme la référence WBS Settings) ──
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

  // ─── Owner Key suggestions (datalist) ───────────────────────
  // Utilisé dans l'onglet WBS Structure : suggère les clés déjà
  // définies dans l'Owner Mapping, tout en laissant la saisie libre
  // (un nouvel owner key peut être créé directement ici, puis
  // complété ensuite dans l'onglet Owner Mapping).
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

  // ─── Drag & drop pour la zone "Import from JSON or CSV" ─────
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

  // ─── Load Standard WBS Template (from uploaded ODS) ─────────
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
      } catch {
        this.settingsError = 'Invalid JSON file.';
      }
    };

    reader.readAsText(file);
  }

  private readWbsCsv(file: File): void {
    const reader = new FileReader();

    reader.onload = () => {
      const text = String(reader.result ?? '');
      const workbook = XLSX.read(text, { type: 'string' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      this.importPreviewRows = this.normalizeImportedWbsRows(rows as any[]);
      this.importMessage = `${this.importPreviewRows.length} WBS rows ready to import.`;
    };

    reader.readAsText(file);
  }

  private readWbsExcel(file: File): void {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const binary = e.target?.result;
      if (!binary) return;

      const workbook = XLSX.read(binary, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      this.importPreviewRows = this.normalizeImportedWbsRows(rows as any[]);
      this.importMessage = `${this.importPreviewRows.length} WBS rows ready to import.`;
    };

    reader.readAsBinaryString(file);
  }

  // ─── PHASE 3: Import WBS avec auto-détection du TYPE ────────
  // Le fichier source réel (WBS_Structure.ods) ne contient que
  // LEVEL, WBS, Description — pas de colonne TYPE/OWNER KEY/HOUR RATE.
  // Si TYPE est absent du fichier, on le déduit :
  //   - level <= 1                    → SUMMARY
  //   - description contient "hour"   → HOUR
  //   - sinon                         → COST
  // Puis une 2e passe force SUMMARY sur toute ligne qui a des enfants
  // directs dans le fichier (même si sa description contient "hour").
  private normalizeImportedWbsRows(rows: any[]): FinanceWbsTemplateRow[] {
    const mapped = (rows ?? [])
      .map((r, index) => {
        const codeTemplate =
          r['WBS CODE'] ?? r['WBS'] ?? r['Code'] ?? r['codeTemplate'] ?? r['wbsCode'] ?? '';

        const description =
          r['DESCRIPTION'] ?? r['Description'] ?? r['description'] ?? '';

        const level = Number(
          r['LVL'] ?? r['Level'] ?? r['LEVEL'] ?? r['level'] ?? this.detectWbsLevel(String(codeTemplate))
        );

        const explicitTypeRaw = r['TYPE'] ?? r['Type'] ?? r['type'] ?? null;

        let type: FinanceWbsRowType;

        if (explicitTypeRaw) {
          const upper = String(explicitTypeRaw).toUpperCase();
          type = (upper === 'SUMMARY' || upper === 'HOUR' || upper === 'COST')
            ? upper as FinanceWbsRowType
            : 'COST';
        } else {
          type = this.detectRowType(String(description), level);
        }

        return {
          sortOrder: index + 1,
          level,
          codeTemplate: String(codeTemplate).trim(),
          description: String(description).trim(),
          type,
          ownerKey: r['OWNER KEY'] ?? r['Owner Key'] ?? r['ownerKey'] ?? null,
          hourRate: r['HOUR RATE'] ?? r['Hour Rate'] ?? r['hourRate'] ?? null
        };
      })
      .filter(row => row.codeTemplate && row.description);

    return mapped.map(row => {
      const hasChildren = mapped.some(other =>
        other.codeTemplate !== row.codeTemplate &&
        other.codeTemplate.startsWith(row.codeTemplate + '-')
      );
      return hasChildren ? { ...row, type: 'SUMMARY' as FinanceWbsRowType } : row;
    });
  }

  private detectRowType(description: string, level: number): FinanceWbsRowType {
    if (level <= 1) return 'SUMMARY';

    const desc = description.toLowerCase();
    if (desc.includes('hour')) return 'HOUR';

    return 'COST';
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

  // ─── PHASE 4: Forecast éditable en ligne ────────────────────
  // Mise à jour optimiste avec rollback en cas d'échec réseau.
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

  // ─── PHASE 6: Connect ERP (stub — à implémenter) ────────────
  // TODO: câbler le vrai flux une fois le système ERP cible,
  // le protocole (fichier / API / webservice) et les champs à
  // synchroniser (AC ? Commitment ?) définis avec le métier.
  connectErp(): void {
    this.erpConnecting = true;
    this.error = null;

    setTimeout(() => {
      this.erpConnecting = false;
      this.error = 'ERP connection is not configured yet. Contact your administrator.';
    }, 600);
  }
}