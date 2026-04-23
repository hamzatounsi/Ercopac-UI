import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GmRiskService } from '../../services/gm-risk.service';
import { RiskItem } from '../../models/risk-item.model';
import { RiskSummary } from '../../models/risk-summary.model';

type SortColumn =
  | 'id'
  | 'description'
  | 'riskType'
  | 'state'
  | 'inputDate'
  | 'dueDate'
  | 'ownerDept'
  | 'owner'
  | 'wbsCode'
  | 'impact'
  | 'probability'
  | 'riskValue'
  | 'varianceStatus';

@Component({
  selector: 'app-gm-project-risks-page',
  templateUrl: './gm-project-risks-page.component.html',
  styleUrls: ['./gm-project-risks-page.component.scss']
})
export class GmProjectRisksPageComponent implements OnInit {
  projectId!: number;

  loading = false;
  saving = false;
  error: string | null = null;

  rows: RiskItem[] = [];
  filteredRows: RiskItem[] = [];
  summary: RiskSummary | null = null;
  pendingApprovals: RiskItem[] = [];

  selectedRisk: RiskItem | null = null;

  searchTerm = '';
  typeFilter = '';
  stateFilter = '';
  levelFilter = '';
  varianceStatusFilter = '';
  deptFilter = '';
  inputDateFrom = '';
  inputDateTo = '';
  dueDateFrom = '';
  dueDateTo = '';

  bellOpen = false;
  drawerOpen = false;
  riskPositionCollapsed = false;

  sortColumn: SortColumn = 'id';
  sortDirection: 'asc' | 'desc' = 'asc';

  readonly states = ['new', 'managing', 'closed', 'variance', 'cr'];
  readonly types = ['risk', 'opportunity'];
  readonly departments = ['PM', 'ME', 'EE', 'SW', 'PRC', 'MFC', 'QA', 'HSE', 'INST', 'FIN', 'CS', 'SALES'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private riskService: GmRiskService
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    this.riskService.getRisks(this.projectId).subscribe({
      next: (rows) => {
        this.rows = rows ?? [];
        this.loadSummaryAndPending();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load risks.';
        this.loading = false;
      }
    });
  }

  private loadSummaryAndPending(): void {
    this.riskService.getSummary(this.projectId).subscribe({
      next: (summary) => {
        this.summary = summary;
        this.riskService.getPendingApprovals(this.projectId).subscribe({
          next: (pending) => {
            this.pendingApprovals = pending ?? [];
            this.applyFilters();
            this.loading = false;
          },
          error: (err) => {
            console.error(err);
            this.pendingApprovals = [];
            this.applyFilters();
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load risk summary.';
        this.applyFilters();
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const search = this.searchTerm.trim().toLowerCase();

    const result = this.rows.filter((row) => {
      const typeOk = !this.typeFilter || row.riskType === this.typeFilter;
      const stateOk = !this.stateFilter || row.state === this.stateFilter;
      const levelOk = !this.levelFilter || this.getRiskLevel(row) === this.levelFilter;
      const varianceOk = !this.varianceStatusFilter || (row.varianceStatus || '') === this.varianceStatusFilter;
      const deptOk = !this.deptFilter || (row.ownerDept || '') === this.deptFilter;

      const inputFromOk = !this.inputDateFrom || !row.inputDate || row.inputDate >= this.inputDateFrom;
      const inputToOk = !this.inputDateTo || !row.inputDate || row.inputDate <= this.inputDateTo;
      const dueFromOk = !this.dueDateFrom || !row.dueDate || row.dueDate >= this.dueDateFrom;
      const dueToOk = !this.dueDateTo || !row.dueDate || row.dueDate <= this.dueDateTo;

      const searchOk =
        !search ||
        this.formatRiskId(row).toLowerCase().includes(search) ||
        (row.description || '').toLowerCase().includes(search) ||
        (row.owner || '').toLowerCase().includes(search) ||
        (row.wbsCode || '').toLowerCase().includes(search) ||
        (row.ownerDept || '').toLowerCase().includes(search) ||
        (row.mitigation || '').toLowerCase().includes(search);

      return typeOk && stateOk && levelOk && varianceOk && deptOk && inputFromOk && inputToOk && dueFromOk && dueToOk && searchOk;
    });

    this.filteredRows = this.sortRows(result);
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredRows = this.sortRows([...this.filteredRows]);
  }

  private sortRows(rows: RiskItem[]): RiskItem[] {
    return rows.sort((a, b) => {
      const direction = this.sortDirection === 'asc' ? 1 : -1;

      let av: any;
      let bv: any;

      switch (this.sortColumn) {
        case 'riskValue':
          av = this.getRiskValue(a);
          bv = this.getRiskValue(b);
          break;
        case 'id':
          av = a.id;
          bv = b.id;
          break;
        default:
          av = (a[this.sortColumn] ?? '') as any;
          bv = (b[this.sortColumn] ?? '') as any;
      }

      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * direction;
      }

      return String(av).localeCompare(String(bv)) * direction;
    });
  }

  addRisk(): void {
    const payload = {
      riskType: 'risk',
      state: 'new',
      description: 'New risk',
      inputDate: new Date().toISOString().slice(0, 10),
      dueDate: null,
      mitigation: '',
      ownerDept: '',
      owner: '',
      wbsCode: '',
      impact: 2,
      probability: 2,
      varianceStatus: null,
      notes: ''
    };

    this.saving = true;
    this.riskService.createRisk(this.projectId, payload).subscribe({
      next: (created) => {
        this.saving = false;
        this.loadData();
        this.openDrawer(created);
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to add risk.';
        this.saving = false;
      }
    });
  }

  saveRow(row: RiskItem, refreshDrawer = true): void {
    this.saving = true;

    const payload = {
      riskType: row.riskType,
      state: row.state,
      description: row.description,
      inputDate: row.inputDate,
      dueDate: row.dueDate,
      mitigation: row.mitigation,
      ownerDept: row.ownerDept,
      owner: row.owner,
      wbsCode: row.wbsCode,
      impact: row.impact,
      probability: row.probability,
      varianceStatus: row.varianceStatus,
      notes: row.notes
    };

    this.riskService.updateRisk(this.projectId, row.id, payload).subscribe({
      next: (updated) => {
        this.replaceRow(updated);
        this.saving = false;
        this.loadSummaryAndPending();
        if (refreshDrawer && this.selectedRisk?.id === updated.id) {
          this.selectedRisk = { ...updated };
        }
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to save risk.';
        this.saving = false;
      }
    });
  }

  deleteRow(row: RiskItem): void {
    if (!confirm('Delete this risk?')) {
      return;
    }

    this.saving = true;
    this.riskService.deleteRisk(this.projectId, row.id).subscribe({
      next: () => {
        this.saving = false;
        if (this.selectedRisk?.id === row.id) {
          this.closeDrawer();
        }
        this.rows = this.rows.filter(r => r.id !== row.id);
        this.applyFilters();
        this.loadSummaryAndPending();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to delete risk.';
        this.saving = false;
      }
    });
  }

  approveSelectedRisk(): void {
    if (!this.selectedRisk) return;

    this.saving = true;
    this.riskService.approveRisk(this.projectId, this.selectedRisk.id).subscribe({
      next: (updated) => {
        this.replaceRow(updated);
        this.selectedRisk = { ...updated };
        this.saving = false;
        this.loadSummaryAndPending();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to approve risk.';
        this.saving = false;
      }
    });
  }

  rejectSelectedRisk(): void {
    if (!this.selectedRisk) return;

    this.saving = true;
    this.riskService.rejectRisk(this.projectId, this.selectedRisk.id).subscribe({
      next: (updated) => {
        this.replaceRow(updated);
        this.selectedRisk = { ...updated };
        this.saving = false;
        this.loadSummaryAndPending();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to reject risk.';
        this.saving = false;
      }
    });
  }

  replaceRow(updated: RiskItem): void {
    const idx = this.rows.findIndex(r => r.id === updated.id);
    if (idx !== -1) {
      this.rows[idx] = updated;
    }
    this.applyFilters();
  }

  selectRow(row: RiskItem): void {
    this.selectedRisk = { ...row };
  }

  openDrawer(row: RiskItem): void {
    this.selectedRisk = { ...row };
    this.drawerOpen = true;
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.selectedRisk = null;
  }

  saveSelectedRisk(): void {
    if (!this.selectedRisk) return;
    this.saveRow(this.selectedRisk, true);
  }

  toggleBell(): void {
    this.bellOpen = !this.bellOpen;
  }

  toggleRiskPosition(): void {
    this.riskPositionCollapsed = !this.riskPositionCollapsed;
  }

  clearFilters(): void {
    this.typeFilter = '';
    this.stateFilter = '';
    this.levelFilter = '';
    this.varianceStatusFilter = '';
    this.deptFilter = '';
    this.inputDateFrom = '';
    this.inputDateTo = '';
    this.dueDateFrom = '';
    this.dueDateTo = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  exportRisks(): void {
    const rows = this.filteredRows.map((row) => ({
      id: this.formatRiskId(row),
      description: row.description,
      type: row.riskType,
      state: row.state,
      inputDate: row.inputDate,
      dueDate: row.dueDate,
      department: row.ownerDept,
      owner: row.owner,
      wbsCode: row.wbsCode,
      impact: row.impact,
      probability: row.probability,
      riskValue: this.getRiskValue(row),
      riskLevel: this.getRiskLevelLabel(row),
      varianceStatus: row.varianceStatus,
      mitigation: row.mitigation,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt,
      notes: row.notes
    }));

    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${this.projectId}-risks.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  formatRiskId(row: RiskItem): string {
    return `R-${String(row.id).padStart(3, '0')}`;
  }

  getRiskValue(row: RiskItem): number {
    return (row.impact || 1) * (row.probability || 1);
  }

  getRiskLevel(row: RiskItem): 'low' | 'med' | 'hi' | 'crit' {
    const rv = this.getRiskValue(row);
    if (rv >= 17) return 'crit';
    if (rv >= 10) return 'hi';
    if (rv >= 5) return 'med';
    return 'low';
  }

  getRiskLevelLabel(row: RiskItem): string {
    const level = this.getRiskLevel(row);
    if (level === 'crit') return 'Critical';
    if (level === 'hi') return 'High';
    if (level === 'med') return 'Medium';
    return 'Low';
  }

  getRiskClass(row: RiskItem): string {
    return 'rv-' + this.getRiskLevel(row);
  }

  getStateClass(state: string | null | undefined): string {
    return 'st-' + (state || 'new');
  }

  getTypeClass(type: string | null | undefined): string {
    return type === 'opportunity' ? 'rt-opportunity' : 'rt-risk';
  }

  getVarianceClass(status: string | null | undefined): string {
    if (status === 'approved') return 'vs-approved';
    if (status === 'open') return 'vs-open';
    return '';
  }

  getSortClass(column: SortColumn): string {
    if (this.sortColumn !== column) return '';
    return this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc';
  }

  getNetExposure(): number {
    if (!this.summary) return 0;
    return this.summary.netExposureScore;
  }

  getOpenRisksCount(): number {
    return this.rows.filter(r => r.state !== 'closed' && r.riskType !== 'opportunity').length;
  }

  getOpenOpportunitiesCount(): number {
    return this.rows.filter(r => r.state !== 'closed' && r.riskType === 'opportunity').length;
  }

  getTopRisks(): RiskItem[] {
    return [...this.rows]
      .filter(r => r.state !== 'closed' && r.riskType !== 'opportunity')
      .sort((a, b) => this.getRiskValue(b) - this.getRiskValue(a))
      .slice(0, 5);
  }

  getTopOpportunities(): RiskItem[] {
    return [...this.rows]
      .filter(r => r.state !== 'closed' && r.riskType === 'opportunity')
      .sort((a, b) => this.getRiskValue(b) - this.getRiskValue(a))
      .slice(0, 5);
  }

  getBarWidth(row: RiskItem, source: RiskItem[]): number {
    const max = Math.max(...source.map(r => this.getRiskValue(r)), 1);
    return (this.getRiskValue(row) / max) * 100;
  }

  needsApproval(row: RiskItem | null): boolean {
    if (!row) return false;
    return row.state === 'variance' || row.state === 'cr';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.bell-wrap')) {
      this.bellOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.bellOpen = false;
    this.closeDrawer();
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

  goToForecast(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'forecast']);
  }

  goToCr(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'change-requests']);
  }
}