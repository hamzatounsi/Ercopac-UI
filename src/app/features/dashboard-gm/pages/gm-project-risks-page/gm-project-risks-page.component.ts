import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GmRiskService } from '../../services/gm-risk.service';
import { RiskItem } from '../../models/risk-item.model';
import { RiskSummary } from '../../models/risk-summary.model';
import { RiskApprovalRule, UpsertRiskApprovalRuleRequest } from '../../models/risk-approval-rule.model';
import { ResourceTypeDto } from '../../models/resource-type.model';

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

  // Resource Type / Owner / WBS
  resourceTypes: ResourceTypeDto[] = [];
  usersByResourceType: any[] = [];
  wbsCodes: string[] = [];

  // Approval Matrix
  approvalMatrixOpen = false;
  approvalRules: RiskApprovalRule[] = [];
  approvalRulesLoading = false;
  currentApproverId: number | null = null;

  newRule: UpsertRiskApprovalRuleRequest = {
    riskLevel: 'low',
    minRiskValue: 0,
    approverRole: 'Project Manager',
    approverUserId: null
  };

  readonly approverRoles = [
    'Project Manager',
    'Senior Manager',
    'Director',
    'General Manager'
  ];

  readonly riskLevelOptions = [
    { value: 'low', label: 'Low', minRv: 0 },
    { value: 'med', label: 'Medium', minRv: 5 },
    { value: 'hi', label: 'High', minRv: 10 },
    { value: 'crit', label: 'Critical', minRv: 17 }
  ];

  readonly heatmap: { impact: number; prob: number; rv: number; level: string }[] =
    this.buildHeatmap();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private riskService: GmRiskService
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadData();
    this.loadResourceTypes();
    this.loadWbsCodes();
  }

  // ─── Data loading ───────────────────────────────────────────

  loadData(): void {
    this.loading = true;
    this.error = null;

    this.riskService.getRisks(this.projectId).subscribe({
      next: (rows) => {
        this.rows = rows ?? [];
        this.preloadRowUsers();  
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
        this.riskService.getAllPendingApprovals().subscribe({
          next: (pending) => {
            this.pendingApprovals = pending ?? [];
            this.applyFilters();
            this.loading = false;
          },
          error: () => {
            this.pendingApprovals = [];
            this.applyFilters();
            this.loading = false;
          }
        });
      },
      error: () => {
        this.error = 'Failed to load risk summary.';
        this.applyFilters();
        this.loading = false;
      }
    });
  }
testSave(): void {
  console.log('TEST SAVE CALLED', this.selectedRisk?.id);
  this.saveSelectedRisk();
}
// Cache for users per resource type
private rowUsersCache: Map<number, any[]> = new Map();

private preloadRowUsers(): void {
  const resourceTypeIds = [...new Set(
    this.rows
      .map(r => r.resourceTypeId)
      .filter((id): id is number => !!id)
  )];

  for (const id of resourceTypeIds) {
    if (!this.rowUsersCache.has(id)) {
      this.riskService.getUsersByResourceType(this.projectId, id).subscribe({
        next: (users) => { this.rowUsersCache.set(id, users ?? []); },
        error: () => {}
      });
    }
  }
}

getRowUsers(row: RiskItem): any[] {
  if (!row.resourceTypeId) return [];
  return this.rowUsersCache.get(row.resourceTypeId) || [];
}
onRowResourceTypeChange(row: RiskItem, id: number | null): void {
  const rt = id ? this.resourceTypes.find(r => r.id === id) || null : null;

  row.resourceTypeId = id;
  row.resourceTypeCode = rt?.code || null;
  row.ownerUserId = null;
  row.ownerUserName = null;

  if (id && !this.rowUsersCache.has(id)) {
    this.riskService.getUsersByResourceType(this.projectId, id).subscribe({
      next: (users) => { this.rowUsersCache.set(id, users ?? []); },
      error: () => {}
    });
  }
  this.saveRow(row, false);
}

onRowOwnerChange(row: RiskItem, id: number | null): void {
  const users = row.resourceTypeId ? this.rowUsersCache.get(row.resourceTypeId) || [] : [];
  const user = users.find(u => u.id === id);
  row.ownerUserId = id;
  row.ownerUserName = user?.fullName || null;
  this.saveRow(row, false);
}
  loadResourceTypes(): void {
    this.riskService.getResourceTypes(this.projectId).subscribe({
      next: (types) => { this.resourceTypes = types ?? []; },
      error: () => {}
    });
  }

  loadWbsCodes(): void {
    this.riskService.getWbsCodes(this.projectId).subscribe({
      next: (codes) => { this.wbsCodes = codes ?? []; },
      error: () => {}
    });
  }

  // ─── Filters & Sort ─────────────────────────────────────────

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
        (row.ownerUserName || '').toLowerCase().includes(search) ||
        (row.wbsCode || '').toLowerCase().includes(search) ||
        (row.resourceTypeCode || '').toLowerCase().includes(search) ||
        (row.mitigation || '').toLowerCase().includes(search);

      return typeOk && stateOk && levelOk && varianceOk && deptOk
        && inputFromOk && inputToOk && dueFromOk && dueToOk && searchOk;
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

  // ─── CRUD ───────────────────────────────────────────────────
addRisk(): void {
  const payload = {
    riskType: 'risk',
    state: 'new',
    description: 'New risk',
    inputDate: new Date().toISOString().slice(0, 10),
    dueDate: null,
    mitigation: '',
    resourceTypeId: null,
    ownerUserId: null,
    wbsCode: '',
    impact: '1',
    probability: 10,
    notes: ''
  };

  this.saving = true;
  this.riskService.createRisk(this.projectId, payload).subscribe({
    next: (created) => {
      console.log('CREATED:', created.id);
      this.saving = false;
      this.rows = [...this.rows, created];
      this.applyFilters();
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
    dueDate: row.dueDate || null,
    mitigation: row.mitigation || '',
    resourceTypeId: row.resourceTypeId || null,
    ownerUserId: row.ownerUserId || null,
    wbsCode: row.wbsCode || '',
    impact: row.impact ? String(row.impact) : '1',
    probability: row.probability ? Number(row.probability) : 10,
    varianceStatus: row.varianceStatus || null,
    notes: row.notes || ''
  };

  this.riskService.updateRisk(this.projectId, row.id, payload).subscribe({
    next: (updated) => {
      console.log('SAVED SUCCESSFULLY:', updated.id);
      const idx = this.rows.findIndex(r => r.id === updated.id);
      if (idx !== -1) this.rows[idx] = updated;
      this.applyFilters();
      this.saving = false;
      if (refreshDrawer && this.selectedRisk?.id === updated.id) {
        this.selectedRisk = { ...updated };
        // reload users for resource type if set
        if (updated.resourceTypeId) {
          this.riskService.getUsersByResourceType(this.projectId, updated.resourceTypeId).subscribe({
            next: (users) => { this.usersByResourceType = users ?? []; },
            error: () => {}
          });
        }
      }
    },
    error: (err) => {
      console.error('SAVE ERROR:', err.status, err.error);
      this.error = 'Failed to save risk.';
      this.saving = false;
    }
  });
}
  deleteRow(row: RiskItem): void {
    if (!confirm('Delete this risk?')) return;

    this.saving = true;
    this.riskService.deleteRisk(this.projectId, row.id).subscribe({
      next: () => {
        this.saving = false;
        if (this.selectedRisk?.id === row.id) this.closeDrawer();
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
    if (idx !== -1) this.rows[idx] = updated;
    this.applyFilters();
  }

  // ─── Drawer ─────────────────────────────────────────────────

  selectRow(row: RiskItem): void {
    this.selectedRisk = { ...row };
  }

  openDrawer(row: RiskItem): void {
    this.selectedRisk = { ...row };
    this.drawerOpen = true;
    if (!this.approvalRules.length) {
      this.loadApprovalRules();
    }
    if (row.resourceTypeId) {
      const rt = this.resourceTypes.find(r => r.id === row.resourceTypeId) || null;
      if (rt) {
        this.onResourceTypeChange(rt);
      } else {
        this.riskService.getUsersByResourceType(this.projectId, row.resourceTypeId).subscribe({
          next: (users) => { this.usersByResourceType = users ?? []; },
          error: () => { this.usersByResourceType = []; }
        });
      }
    } else {
      this.usersByResourceType = [];
    }
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.selectedRisk = null;
    this.usersByResourceType = [];
  }

  saveSelectedRisk(): void {
    if (!this.selectedRisk) return;
    this.saveRow(this.selectedRisk, true);
  }

  // ─── Resource Type / Owner / WBS ────────────────────────────

  onResourceTypeSelectChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const id = value ? Number(value) : null;
    const rt = id ? this.resourceTypes.find(r => r.id === id) || null : null;
     console.log('RESOURCE TYPE CHANGED:', id, rt);  // ← ADD
    this.onResourceTypeChange(rt);
  }

  onResourceTypeChange(resourceType: ResourceTypeDto | null): void {
    if (!resourceType?.id) {
      this.usersByResourceType = [];
      if (this.selectedRisk) {
        this.selectedRisk.resourceTypeId = null;
        this.selectedRisk.resourceTypeCode = null;
        this.selectedRisk.ownerUserId = null;
        this.selectedRisk.ownerUserName = null;
      }
      return;
    }

    if (this.selectedRisk) {
      this.selectedRisk.resourceTypeId = resourceType.id;
      this.selectedRisk.resourceTypeCode = resourceType.code;
      this.selectedRisk.ownerUserId = null;
      this.selectedRisk.ownerUserName = null;
    }

    this.riskService.getUsersByResourceType(this.projectId, resourceType.id).subscribe({
      next: (users) => { this.usersByResourceType = users ?? []; },
      error: () => { this.usersByResourceType = []; }
    });
  }

  onOwnerUserChange(userId: string): void {
    const id = userId ? Number(userId) : null;
    const user = this.usersByResourceType.find(u => u.id === id);
      console.log('OWNER CHANGED:', id, user);  // ← ADD
    if (this.selectedRisk) {
      this.selectedRisk.ownerUserId = id;
      this.selectedRisk.ownerUserName = user?.fullName || null;
    }
  }

  // ─── Approval Matrix ────────────────────────────────────────

  openApprovalMatrix(): void {
    this.approvalMatrixOpen = true;
    this.loadApprovalRules();
  }

  closeApprovalMatrix(): void {
    this.approvalMatrixOpen = false;
  }

  loadApprovalRules(): void {
    this.approvalRulesLoading = true;
    this.riskService.getApprovalRules(this.projectId).subscribe({
      next: (rules) => {
        this.approvalRules = rules ?? [];
        this.approvalRulesLoading = false;
      },
      error: () => {
        this.approvalRulesLoading = false;
      }
    });
  }

  addApprovalRule(): void {
    if (!this.newRule.riskLevel || !this.newRule.approverRole) return;

    const levelOption = this.riskLevelOptions.find(l => l.value === this.newRule.riskLevel);
    if (levelOption) {
      this.newRule.minRiskValue = levelOption.minRv;
    }

    this.riskService.createApprovalRule(this.projectId, this.newRule).subscribe({
      next: () => {
        this.newRule = {
          riskLevel: 'low',
          minRiskValue: 0,
          approverRole: 'Project Manager',
          approverUserId: null
        };
        this.loadApprovalRules();
      },
      error: () => {
        this.error = 'Failed to add approval rule.';
      }
    });
  }

  deleteApprovalRule(ruleId?: number): void {
    if (!ruleId) return;
    this.riskService.deleteApprovalRule(this.projectId, ruleId).subscribe({
      next: () => this.loadApprovalRules(),
      error: () => { this.error = 'Failed to delete rule.'; }
    });
  }

  getRequiredApprover(row: RiskItem): string {
    if (!this.approvalRules.length) return '—';
    const rv = this.getRiskValue(row);
    const matching = this.approvalRules
      .filter(r => rv >= r.minRiskValue)
      .sort((a, b) => b.minRiskValue - a.minRiskValue);
    return matching[0]?.approverRole || '—';
  }

  // ─── Helpers ────────────────────────────────────────────────

  toggleBell(): void {
    this.bellOpen = !this.bellOpen;
  }

  toggleRiskPosition(): void {
    this.riskPositionCollapsed = !this.riskPositionCollapsed;
  }

  exportRisks(): void {
    const rows = this.filteredRows.map((row) => ({
      id: this.formatRiskId(row),
      description: row.description,
      type: row.riskType,
      state: row.state,
      inputDate: row.inputDate,
      dueDate: row.dueDate,
      resourceType: row.resourceTypeCode,
      owner: row.ownerUserName,
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
    return row.riskCode || `R-${String(row.id).padStart(3, '0')}`;
  }

  getRiskValue(row: RiskItem): number {
  const impactNum = parseInt(row.impact || '1', 10);
  const prob = row.probability || 10;
  if (isNaN(impactNum)) return prob;
  return impactNum * prob;
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
    if (this.summary?.riskExposureItems?.length) {
      return this.summary.riskExposureItems
        .sort((a, b) => b.riskValue - a.riskValue)
        .slice(0, 5)
        .map(item => this.rows.find(r => r.id === item.riskId))
        .filter((r): r is RiskItem => !!r);
    }
    return [...this.rows]
      .filter(r => r.state !== 'closed' && r.riskType !== 'opportunity')
      .sort((a, b) => this.getRiskValue(b) - this.getRiskValue(a))
      .slice(0, 5);
  }

  getTopOpportunities(): RiskItem[] {
    if (this.summary?.opportunityItems?.length) {
      return this.summary.opportunityItems
        .sort((a, b) => b.riskValue - a.riskValue)
        .slice(0, 5)
        .map(item => this.rows.find(r => r.id === item.riskId))
        .filter((r): r is RiskItem => !!r);
    }
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

  getHeatmapClass(level: string): string {
    switch (level) {
      case 'crit': return 'hm-crit';
      case 'hi': return 'hm-hi';
      case 'med': return 'hm-med';
      default: return 'hm-low';
    }
  }

  getRuleLevelClass(level: string): string {
    switch (level) {
      case 'crit': return 'rv-crit';
      case 'hi': return 'rv-hi';
      case 'med': return 'rv-med';
      default: return 'rv-low';
    }
  }

  private buildHeatmap(): { impact: number; prob: number; rv: number; level: string }[] {
    const cells = [];
    for (let p = 5; p >= 1; p--) {
      for (let i = 1; i <= 5; i++) {
        const rv = i * p;
        let level = 'low';
        if (rv >= 17) level = 'crit';
        else if (rv >= 10) level = 'hi';
        else if (rv >= 5) level = 'med';
        cells.push({ impact: i, prob: p, rv, level });
      }
    }
    return cells;
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

  goToProjectum(): void { this.router.navigate(['/gm/projectum']); }
  goToSchedule(): void { this.router.navigate(['/gm/projects', this.projectId, 'schedule']); }
  goToActions(): void { this.router.navigate(['/gm/projects', this.projectId, 'actions']); }
  goToFinance(): void { this.router.navigate(['/gm/projects', this.projectId, 'finance']); }
  goToForecast(): void { this.router.navigate(['/gm/projects', this.projectId, 'forecast']); }
  goToCr(): void { this.router.navigate(['/gm/projects', this.projectId, 'change-requests']); }
}