import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GmActionService } from '../../services/gm-action.service';
import { ActionAttachment, ActionComment, ActionItem } from '../../models/action-item.model';
import { ActionSummary } from '../../models/action-summary.model';

type DetailTab = 'details' | 'comments' | 'attachments';
type ViewMode = 'list' | 'kanban';

@Component({
  selector: 'app-gm-project-actions-page',
  templateUrl: './gm-project-actions-page.component.html',
  styleUrls: ['./gm-project-actions-page.component.scss']
})
export class GmProjectActionsPageComponent implements OnInit {
  projectId!: number;

  loading = false;
  saving = false;
  error: string | null = null;

  rows: ActionItem[] = [];
  filteredRows: ActionItem[] = [];
  summary: ActionSummary | null = null;

  selectedAction: ActionItem | null = null;
  detailTab: DetailTab = 'details';
  viewMode: ViewMode = 'list';

  searchTerm = '';
  dueFilter = '';

  selectedTypes = new Set<string>();
  selectedStatuses = new Set<string>();
  selectedAssignees = new Set<string>();

  commentText = '';
  exportMenuOpen = false;

  isNewAction = false;

  availableAssignees: string[] = [];

  readonly departments = ['PM', 'ME', 'CE', 'SW', 'PRC', 'MFC', 'QA', 'HSE', 'Other'];
  readonly actionTypes: Array<'action' | 'issue'> = ['action', 'issue'];
  readonly priorities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
  readonly statuses: Array<'todo' | 'doing' | 'review' | 'blocked' | 'done'> = ['todo', 'doing', 'review', 'blocked', 'done'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private actionService: GmActionService
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    this.actionService.getRows(this.projectId).subscribe({
      next: (rows) => {
        this.rows = rows ?? [];
        this.applyFilters();

        this.actionService.getSummary(this.projectId).subscribe({
          next: (summary) => {
            this.summary = summary;

            this.actionService.getAvailableAssignees(this.projectId).subscribe({
              next: (assignees) => {
                this.availableAssignees = assignees ?? [];
                this.refreshSelectedAction();
                this.loading = false;
              },
              error: (err) => {
                console.error(err);
                this.error = 'Failed to load available assignees.';
                this.loading = false;
              }
            });
          },
          error: (err) => {
            console.error(err);
            this.error = 'Failed to load action summary.';
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load actions.';
        this.loading = false;
      }
    });
  }

  refreshSelectedAction(): void {
    if (!this.selectedAction) return;
    const fresh = this.rows.find(r => r.id === this.selectedAction!.id);
    if (fresh) {
      this.selectedAction = this.cloneAction(fresh);
    }
  }

  setView(mode: ViewMode): void {
    this.viewMode = mode;
  }

  setDetailTab(tab: DetailTab): void {
    this.detailTab = tab;
  }

  toggleType(type: string): void {
    if (this.selectedTypes.has(type)) {
      this.selectedTypes.delete(type);
    } else {
      this.selectedTypes.add(type);
    }
    this.applyFilters();
  }

  toggleStatus(status: string): void {
    if (this.selectedStatuses.has(status)) {
      this.selectedStatuses.delete(status);
    } else {
      this.selectedStatuses.add(status);
    }
    this.applyFilters();
  }

  toggleAssignee(name: string): void {
    if (!name) return;
    if (this.selectedAssignees.has(name)) {
      this.selectedAssignees.delete(name);
    } else {
      this.selectedAssignees.add(name);
    }
    this.applyFilters();
  }

  removeAssigneeFilter(name: string): void {
    this.selectedAssignees.delete(name);
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.dueFilter = '';
    this.selectedTypes.clear();
    this.selectedStatuses.clear();
    this.selectedAssignees.clear();
    this.applyFilters();
  }

  getActiveFilterCount(): number {
    return this.selectedTypes.size +
      this.selectedStatuses.size +
      this.selectedAssignees.size +
      (this.dueFilter ? 1 : 0) +
      (this.searchTerm.trim() ? 1 : 0);
  }

  applyFilters(): void {
    const search = this.searchTerm.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + (7 - now.getDay()));
    const weekEndIso = weekEnd.toISOString().slice(0, 10);

    const monthEndIso = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);

    this.filteredRows = this.rows.filter(row => {
      const typeOk = this.selectedTypes.size === 0 || this.selectedTypes.has(row.actionType);
      const statusOk = this.selectedStatuses.size === 0 || this.selectedStatuses.has(row.status);

      const assigneeOk =
        this.selectedAssignees.size === 0 ||
        row.assignees.some(a => this.selectedAssignees.has(a));

      let dueOk = true;
      if (this.dueFilter === 'overdue') {
        dueOk = !!row.dueDate && row.dueDate < today && row.status !== 'done';
      } else if (this.dueFilter === 'today') {
        dueOk = row.dueDate === today;
      } else if (this.dueFilter === 'week') {
        dueOk = !!row.dueDate && row.dueDate >= today && row.dueDate <= weekEndIso;
      } else if (this.dueFilter === 'month') {
        dueOk = !!row.dueDate && row.dueDate >= today && row.dueDate <= monthEndIso;
      }

      const searchOk =
        !search ||
        `#${String(row.id).padStart(3, '0')}`.toLowerCase().includes(search) ||
        (row.title || '').toLowerCase().includes(search) ||
        (row.description || '').toLowerCase().includes(search) ||
        (row.departmentCode || '').toLowerCase().includes(search) ||
        row.assignees.join(' ').toLowerCase().includes(search);

      return typeOk && statusOk && assigneeOk && dueOk && searchOk;
    });
  }

  addAction(status: ActionItem['status'] = 'todo'): void {
    this.isNewAction = true;
    this.selectedAction = {
      id: 0,
      title: '',
      description: '',
      actionType: 'action',
      departmentCode: '',
      priority: 'medium',
      status,
      customerVisible: false,
      insertedDate: new Date().toISOString().slice(0, 10),
      dueDate: null,
      assignees: [],
      comments: [],
      attachments: []
    };
    this.detailTab = 'details';
    this.commentText = '';
  }

  saveRow(row: ActionItem): void {
    if (this.saving) return;

    this.saving = true;

    const payload = {
      title: row.title,
      description: row.description,
      actionType: row.actionType,
      departmentCode: row.departmentCode,
      priority: row.priority,
      status: row.status,
      customerVisible: row.customerVisible,
      insertedDate: row.insertedDate,
      dueDate: row.dueDate,
      assignees: row.assignees
    };

    this.actionService.update(this.projectId, row.id, payload).subscribe({
      next: (updated) => {
        this.saving = false;
        const index = this.rows.findIndex(r => r.id === updated.id);
        if (index !== -1) this.rows[index] = updated;
        this.applyFilters();

        if (this.selectedAction?.id === updated.id) {
          this.selectedAction = this.cloneAction(updated);
        }

        this.actionService.getSummary(this.projectId).subscribe({
          next: (summary) => this.summary = summary
        });
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to save action.';
        this.saving = false;
      }
    });
  }

  deleteRow(row: ActionItem): void {
    if (!confirm('Delete this action?')) return;

    this.saving = true;
    this.actionService.delete(this.projectId, row.id).subscribe({
      next: () => {
        this.saving = false;
        if (this.selectedAction?.id === row.id) {
          this.selectedAction = null;
        }
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to delete action.';
        this.saving = false;
      }
    });
  }

  openDetail(row: ActionItem): void {
    this.isNewAction = false;
    this.selectedAction = this.cloneAction(row);
    this.detailTab = 'details';
    this.commentText = '';
  }

  closeDetail(): void {
    this.selectedAction = null;
    this.commentText = '';
    this.detailTab = 'details';
    this.isNewAction = false;
  }

  addComment(): void {
    if (!this.selectedAction || this.isNewAction) return;
    if (!this.commentText.trim()) return;

    this.actionService.addComment(this.projectId, this.selectedAction.id, this.commentText.trim()).subscribe({
      next: () => {
        this.commentText = '';
        this.loadData();
        this.detailTab = 'comments';
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to add comment.';
      }
    });
  }

addAssigneeToSelected(name: string): void {
  if (!this.selectedAction) return;

  const trimmed = name.trim();
  if (!trimmed) return;

  if (!this.availableAssignees.includes(trimmed)) return;

  if (!this.selectedAction.assignees.includes(trimmed)) {
    this.selectedAction.assignees = [...this.selectedAction.assignees, trimmed];
  }

  if (!this.isNewAction) {
    this.saveRow(this.selectedAction);
  }
}

  removeAssigneeFromSelected(name: string): void {
    if (!this.selectedAction) return;

    this.selectedAction.assignees = this.selectedAction.assignees.filter(a => a !== name);

    if (!this.isNewAction) {
      this.saveRow(this.selectedAction);
    }
  }

  getAssigneesUniverse(): string[] {
    const set = new Set<string>();
    this.rows.forEach(r => r.assignees.forEach(a => set.add(a)));
    return [...set].sort();
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'todo': return 'To Do';
      case 'doing': return 'In Progress';
      case 'review': return 'In Review';
      case 'blocked': return 'Blocked';
      case 'done': return 'Done';
      default: return status;
    }
  }

  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return priority;
    }
  }

  getStatusClass(status: string): string {
    return 'st-' + status;
  }

  getPriorityClass(priority: string): string {
    return 'pr-' + priority;
  }

  getTypeClass(type: string): string {
    return type === 'issue' ? 'tp-issue' : 'tp-action';
  }

  getKanbanRows(status: string): ActionItem[] {
    return this.filteredRows.filter(r => r.status === status);
  }

  getTotalCount(): number {
    return this.rows.length;
  }

  getDoingCount(): number {
    return this.rows.filter(r => r.status === 'doing').length;
  }

  getDoneCount(): number {
    return this.rows.filter(r => r.status === 'done').length;
  }

  getOverdueCount(): number {
    const today = new Date().toISOString().slice(0, 10);
    return this.rows.filter(r => !!r.dueDate && r.dueDate < today && r.status !== 'done').length;
  }

  getDueClass(row: ActionItem): string {
    if (!row.dueDate || row.status === 'done') return '';

    const todayIso = new Date().toISOString().slice(0, 10);

    if (row.dueDate < todayIso) {
      return 'overdue';
    }

    const today = new Date(todayIso);
    const due = new Date(row.dueDate);
    const diff = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff <= 3) return 'soon';
    return '';
  }

  formatDate(date: string | null): string {
    if (!date) return '—';
    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y}`;
  }

  formatActionId(row: ActionItem): string {
    return `#${String(row.id).padStart(3, '0')}`;
  }

  getInitials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .map(w => w[0]?.toUpperCase() || '')
      .slice(0, 2)
      .join('');
  }

  getPersonColor(name: string): string {
    const colors = ['#1565c0', '#7c3aed', '#15803d', '#b45309', '#be185d', '#0e7490', '#9a3412'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) % colors.length;
    }
    return colors[Math.abs(hash) % colors.length];
  }

  toggleExportMenu(): void {
    this.exportMenuOpen = !this.exportMenuOpen;
  }

  exportJson(mode: 'internal' | 'customer' | 'all'): void {
    const rows = this.getExportRows(mode);
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `actions-${mode}-project-${this.projectId}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.exportMenuOpen = false;
  }

  exportCsv(mode: 'internal' | 'customer' | 'all'): void {
    const rows = this.getExportRows(mode);
    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const value = row[h as keyof typeof row];
          const text = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
          return `"${text.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `actions-${mode}-project-${this.projectId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.exportMenuOpen = false;
  }

  getExportRows(mode: 'internal' | 'customer' | 'all'): any[] {
    let rows = [...this.rows];

    if (mode === 'customer') {
      rows = rows.filter(r => r.customerVisible);
    }

    return rows.map(r => ({
      id: this.formatActionId(r),
      type: r.actionType,
      department: r.departmentCode || '',
      priority: this.getPriorityLabel(r.priority),
      status: this.getStatusLabel(r.status),
      customerVisible: r.customerVisible ? 'Yes' : 'No',
      title: r.title,
      description: r.description || '',
      insertedDate: r.insertedDate || '',
      dueDate: r.dueDate || '',
      assignees: r.assignees,
      commentsCount: r.comments.length,
      attachmentsCount: r.attachments.length
    }));
  }

  cloneAction(row: ActionItem): ActionItem {
    return {
      ...row,
      assignees: [...row.assignees],
      comments: [...row.comments],
      attachments: [...row.attachments]
    };
  }

  trackComment(_: number, item: ActionComment): number {
    return item.id;
  }

  trackAttachment(_: number, item: ActionAttachment): number {
    return item.id;
  }

  goToProjectum(): void {
    this.router.navigate(['/gm/projectum']);
  }

  goToSchedule(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'schedule']);
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

  goToCr(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'change-requests']);
  }

  saveSelectedAction(): void {
    if (!this.selectedAction) return;

    const payload = {
      title: (this.selectedAction.title || '').trim(),
      description: this.selectedAction.description,
      actionType: this.selectedAction.actionType,
      departmentCode: this.selectedAction.departmentCode,
      priority: this.selectedAction.priority,
      status: this.selectedAction.status,
      customerVisible: this.selectedAction.customerVisible,
      insertedDate: this.selectedAction.insertedDate,
      dueDate: this.selectedAction.dueDate,
      assignees: this.selectedAction.assignees
    };

    if (!payload.title) {
      this.error = 'Action title is required.';
      return;
    }

    this.saving = true;
    this.error = null;

    if (this.isNewAction) {
      this.actionService.create(this.projectId, payload).subscribe({
        next: (created) => {
          this.saving = false;
          this.isNewAction = false;
          this.selectedAction = this.cloneAction(created);
          this.loadData();
        },
        error: (err) => {
          console.error(err);
          this.error = 'Failed to create action.';
          this.saving = false;
        }
      });
    } else {
      this.actionService.update(this.projectId, this.selectedAction.id, payload).subscribe({
        next: (updated) => {
          this.saving = false;
          this.selectedAction = this.cloneAction(updated);
          this.loadData();
        },
        error: (err) => {
          console.error(err);
          this.error = 'Failed to save action.';
          this.saving = false;
        }
      });
    }
  }
}