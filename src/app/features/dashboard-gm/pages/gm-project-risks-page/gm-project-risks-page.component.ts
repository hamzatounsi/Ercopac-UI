import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GmRiskService } from '../../services/gm-risk.service';
import { RiskItem } from '../../models/risk-item.model';
import { RiskSummary } from '../../models/risk-summary.model';

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

  selectedRisk: RiskItem | null = null;
  searchTerm = '';
  typeFilter = '';
  stateFilter = '';
  levelFilter = '';

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
        this.applyFilters();

        this.riskService.getSummary(this.projectId).subscribe({
          next: (summary) => {
            this.summary = summary;
            this.loading = false;
          },
          error: (err) => {
            console.error(err);
            this.error = 'Failed to load risk summary.';
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load risks.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const search = this.searchTerm.trim().toLowerCase();

    this.filteredRows = this.rows.filter(row => {
      const typeOk = !this.typeFilter || row.riskType === this.typeFilter;
      const stateOk = !this.stateFilter || row.state === this.stateFilter;
      const levelOk = !this.levelFilter || row.riskLevel === this.levelFilter;
      const searchOk =
        !search ||
        (row.description || '').toLowerCase().includes(search) ||
        (row.owner || '').toLowerCase().includes(search) ||
        (row.wbsCode || '').toLowerCase().includes(search) ||
        (row.ownerDept || '').toLowerCase().includes(search);

      return typeOk && stateOk && levelOk && searchOk;
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
      approvedBy: null,
      approvedAt: null,
      notes: ''
    };

    this.saving = true;
    this.riskService.createRisk(this.projectId, payload).subscribe({
      next: (created) => {
        this.saving = false;
        this.selectedRisk = created;
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to add risk.';
        this.saving = false;
      }
    });
  }

  saveRow(row: RiskItem): void {
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
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt,
      notes: row.notes
    };

    this.riskService.updateRisk(this.projectId, row.id, payload).subscribe({
      next: () => {
        this.saving = false;
        this.loadData();
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
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to delete risk.';
        this.saving = false;
      }
    });
  }

  selectRow(row: RiskItem): void {
    this.selectedRisk = row;
  }

  clearFilters(): void {
    this.typeFilter = '';
    this.stateFilter = '';
    this.levelFilter = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  getRiskValue(row: RiskItem): number {
    return (row.impact || 1) * (row.probability || 1);
  }

  getRiskLevel(row: RiskItem): string {
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

  getNetExposure(): number {
    if (!this.summary) return 0;
    return this.summary.netExposureScore;
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