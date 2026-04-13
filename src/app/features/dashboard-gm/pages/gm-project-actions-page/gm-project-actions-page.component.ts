import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GmActionService } from '../../services/gm-action.service';
import { ActionItem, ActionComment } from '../../models/action-item.model';
import { ActionSummary } from '../../models/action-summary.model';

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
  viewMode: 'list' | 'kanban' = 'list';

  searchTerm = '';
  dueFilter = '';
  selectedTypes = new Set<string>();
  selectedStatuses = new Set<string>();
  selectedAssignees = new Set<string>();

  commentText = '';

  readonly departments = ['PM', 'ME', 'CE', 'SW', 'PRC', 'MFC', 'QA', 'HSE', 'Other'];
  readonly actionTypes = ['action', 'issue'];
  readonly priorities = ['high', 'medium', 'low'];
  readonly statuses = ['todo', 'doing', 'review', 'blocked', 'done'];

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
            this.loading = false;
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

  setView(mode: 'list' | 'kanban'): void {
    this.viewMode = mode;
  }

  toggleType(type: string): void {
    this.selectedTypes.has(type) ? this.selectedTypes.delete(type) : this.selectedTypes.add(type);
    this.applyFilters();
  }

  toggleStatus(status: string): void {
    this.selectedStatuses.has(status) ? this.selectedStatuses.delete(status) : this.selectedStatuses.add(status);
    this.applyFilters();
  }

  toggleAssignee(name: string): void {
    this.selectedAssignees.has(name) ? this.selectedAssignees.delete(name) : this.selectedAssignees.add(name);
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

  applyFilters(): void {
    const search = this.searchTerm.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);

    this.filteredRows = this.rows.filter(row => {
      const typeOk = this.selectedTypes.size === 0 || this.selectedTypes.has(row.actionType);
      const statusOk = this.selectedStatuses.size === 0 || this.selectedStatuses.has(row.status);

      const assigneeOk = this.selectedAssignees.size === 0 ||
        row.assignees.some(a => this.selectedAssignees.has(a));

      let dueOk = true;
      if (this.dueFilter === 'overdue') {
        dueOk = !!row.dueDate && row.dueDate < today && row.status !== 'done';
      } else if (this.dueFilter === 'today') {
        dueOk = row.dueDate === today;
      }

      const searchOk =
        !search ||
        (row.title || '').toLowerCase().includes(search) ||
        (row.description || '').toLowerCase().includes(search) ||
        (row.departmentCode || '').toLowerCase().includes(search) ||
        row.assignees.join(' ').toLowerCase().includes(search);

      return typeOk && statusOk && assigneeOk && dueOk && searchOk;
    });
  }

  addAction(): void {
    const payload = {
      title: 'New Action',
      description: '',
      actionType: 'action',
      departmentCode: '',
      priority: 'medium',
      status: 'todo',
      customerVisible: false,
      insertedDate: new Date().toISOString().slice(0, 10),
      dueDate: null,
      assignees: []
    };

    this.saving = true;
    this.actionService.create(this.projectId, payload).subscribe({
      next: (created) => {
        this.saving = false;
        this.selectedAction = created;
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to add action.';
        this.saving = false;
      }
    });
  }

  saveRow(row: ActionItem): void {
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
      next: () => {
        this.saving = false;
        this.loadData();
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
        if (this.selectedAction?.id === row.id) this.selectedAction = null;
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
    this.selectedAction = row;
    this.commentText = '';
  }

  closeDetail(): void {
    this.selectedAction = null;
    this.commentText = '';
  }

  addComment(): void {
    if (!this.selectedAction || !this.commentText.trim()) return;

    this.actionService.addComment(this.projectId, this.selectedAction.id, this.commentText.trim()).subscribe({
      next: () => {
        this.commentText = '';
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to add comment.';
      }
    });
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

  trackComment(_: number, item: ActionComment): number {
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
}