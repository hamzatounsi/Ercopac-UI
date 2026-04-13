import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Chart } from 'chart.js/auto';
import * as XLSX from 'xlsx';

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
export class GmProjectFinancePageComponent implements OnInit {
  @ViewChild('donutChart') donutChartRef!: ElementRef;
  @ViewChild('barChart') barChartRef!: ElementRef;

  private donutChart?: Chart;
  private barChart?: Chart;

  projectId!: number;

  loading = false;
  error: string | null = null;

  rows: FinanceEntry[] = [];
  filteredRows: FinanceEntry[] = [];
  summary: FinanceSummary | null = null;

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

  readonly rowTypeOptions: FinanceWbsRowType[] = ['SUMMARY', 'HOUR', 'COST'];
  readonly resourceTypeOptions: string[] = [
    'PM', 'ME', 'EE', 'PC', 'PLC', 'PRC', 'MFC.M', 'MFC.E', 'QA', 'HSE',
    'MEC', 'ELECT', 'FIN', 'CS', 'SALES', 'CUST'
  ];

  constructor(
    private route: ActivatedRoute,
    private financeService: GmFinanceService
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadData();
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
    if (!this.summary || !this.donutChartRef || !this.barChartRef) return;

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

  openSettings(): void {
    this.settingsOpen = true;
    this.activeSettingsTab = 'wbs';
    this.settingsLoading = true;
    this.settingsError = null;

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
      error: () => {
        this.settingsLoading = false;
        this.settingsError = 'Failed to load finance settings.';
      }
    });
  }

  closeSettings(): void {
    this.settingsOpen = false;
    this.settingsError = null;
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

    this.financeService.applyFinanceTemplate({ projectIds: [this.projectId] }).subscribe({
      next: () => {
        this.applyLoading = false;
        this.loadData();
      },
      error: () => {
        this.applyLoading = false;
        this.settingsError = 'Failed to apply finance template.';
      }
    });
  }

  setSettingsTab(tab: SettingsTab): void {
    this.activeSettingsTab = tab;
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
}