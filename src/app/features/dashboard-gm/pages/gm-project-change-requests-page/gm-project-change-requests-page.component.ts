import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GmChangeRequestService } from '../../services/gm-change-request.service';
import { ChangeRequest } from '../../models/change-request.model';
import { ChangeRequestSummary } from '../../models/change-request-summary.model';

@Component({
  selector: 'app-gm-project-change-requests-page',
  templateUrl: './gm-project-change-requests-page.component.html',
  styleUrls: ['./gm-project-change-requests-page.component.scss']
})
export class GmProjectChangeRequestsPageComponent implements OnInit {
  projectId!: number;

  loading = false;
  saving = false;
  error: string | null = null;

  rows: ChangeRequest[] = [];
  filteredRows: ChangeRequest[] = [];
  summary: ChangeRequestSummary | null = null;

  selectedCr: ChangeRequest | null = null;

  statusFilter = '';
  searchTerm = '';

  readonly statuses = ['open', 'submitted', 'accepted', 'refused', 'cancelled'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private crService: GmChangeRequestService
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    this.crService.getRows(this.projectId).subscribe({
      next: (rows) => {
        this.rows = rows ?? [];
        this.applyFilters();

        this.crService.getSummary(this.projectId).subscribe({
          next: (summary) => {
            this.summary = summary;
            this.loading = false;
          },
          error: (err) => {
            console.error(err);
            this.error = 'Failed to load CR summary.';
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load change requests.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const search = this.searchTerm.trim().toLowerCase();

    this.filteredRows = this.rows.filter(row => {
      const statusOk = !this.statusFilter || row.status === this.statusFilter;
      const searchOk =
        !search ||
        (row.code || '').toLowerCase().includes(search) ||
        (row.title || '').toLowerCase().includes(search) ||
        (row.owner || '').toLowerCase().includes(search) ||
        (row.note || '').toLowerCase().includes(search);

      return statusOk && searchOk;
    });
  }

  addCr(): void {
    const payload = {
      title: 'New Change Request',
      status: 'open',
      requestDate: new Date().toISOString().slice(0, 10),
      valueAmount: 0,
      costAmount: 0,
      owner: '',
      note: ''
    };

    this.saving = true;
    this.crService.create(this.projectId, payload).subscribe({
      next: (created) => {
        this.saving = false;
        this.selectedCr = created;
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to add change request.';
        this.saving = false;
      }
    });
  }

  saveRow(row: ChangeRequest): void {
    this.saving = true;

    const payload = {
      title: row.title,
      status: row.status,
      requestDate: row.requestDate,
      valueAmount: row.valueAmount,
      costAmount: row.costAmount,
      owner: row.owner,
      note: row.note
    };

    this.crService.update(this.projectId, row.id, payload).subscribe({
      next: () => {
        this.saving = false;
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to save change request.';
        this.saving = false;
      }
    });
  }

  deleteRow(row: ChangeRequest): void {
    if (!confirm('Delete this change request?')) {
      return;
    }

    this.saving = true;
    this.crService.delete(this.projectId, row.id).subscribe({
      next: () => {
        this.saving = false;
        if (this.selectedCr?.id === row.id) {
          this.selectedCr = null;
        }
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to delete change request.';
        this.saving = false;
      }
    });
  }

  openDrawer(row: ChangeRequest): void {
    this.selectedCr = row;
  }

  closeDrawer(): void {
    this.selectedCr = null;
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  formatMoney(value: number | null | undefined): string {
    if (value == null) return '—';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  }

  formatPercent(value: number | null | undefined): string {
    if (value == null) return '—';
    return `${value.toFixed(1)}%`;
  }

  getMarginClass(value: number | null | undefined): string {
    if (value == null) return '';
    return value >= 0 ? 'mg-pos' : 'mg-neg';
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'open': return 'Open';
      case 'submitted': return 'Submitted to Customer';
      case 'accepted': return 'Accepted';
      case 'refused': return 'Refused';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
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

  goToRisks(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'risks']);
  }
}