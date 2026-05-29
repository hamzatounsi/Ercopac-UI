import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GmChangeRequestService } from '../../services/gm-change-request.service';

import { ChangeRequestSummary } from '../../models/change-request-summary.model';
import { GmDashboardService } from '../../services/gm-dashboard.service';
import { ChangeRequest, ChangeRequestAttachment } from '../../models/change-request.model';
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
projectName = '';
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
    private crService: GmChangeRequestService,
    private dashboardService: GmDashboardService  // ← ADD
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
      this.loadProjectName(); // ← ADD
    this.loadData();
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
uploadCrAttachment(event: Event): void {
  if (!this.selectedCr) return;
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (!files.length) return;

  this.saving = true;
  this.crService.uploadAttachments(this.projectId, this.selectedCr.id, files).subscribe({
    next: (attachments) => {
      this.saving = false;
      if (this.selectedCr) {
        this.selectedCr.attachments = attachments;
      }
      input.value = '';
      this.loadData();
    },
    error: (err) => {
      console.error(err);
      this.error = 'Failed to upload attachment.';
      this.saving = false;
      input.value = '';
    }
  });
}

downloadCrAttachment(att: ChangeRequestAttachment): void {
  if (!this.selectedCr) return;
  this.crService.downloadAttachment(this.projectId, this.selectedCr.id, att.id).subscribe({
    next: (response) => {
      const blob = response.body;
      if (!blob) return;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    error: (err) => {
      console.error(err);
      this.error = 'Failed to download attachment.';
    }
  });
}

deleteCrAttachment(att: ChangeRequestAttachment): void {
  if (!this.selectedCr || !confirm('Delete this attachment?')) return;
  this.saving = true;
  this.crService.deleteAttachment(this.projectId, this.selectedCr.id, att.id).subscribe({
    next: () => {
      this.saving = false;
      if (this.selectedCr) {
        this.selectedCr.attachments = this.selectedCr.attachments.filter(a => a.id !== att.id);
      }
      this.loadData();
    },
    error: (err) => {
      console.error(err);
      this.error = 'Failed to delete attachment.';
      this.saving = false;
    }
  });
}

formatFileSize(bytes: number | null): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size = size / 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
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