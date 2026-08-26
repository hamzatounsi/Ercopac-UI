import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { API_BASE_URL } from 'src/app/core/config/api.config';
import { AuthService } from 'src/app/core/auth/auth.service';

type WorkspacePage = 'home' | 'tasks' | 'actions' | 'schedule' | 'projects' | 'notifications';
type ActionStatus = 'todo' | 'doing' | 'review' | 'blocked' | 'done';

interface EmployeeTask {
  id: number; projectId: number; projectCode?: string; projectName?: string; name: string;
  description?: string; wbsCode?: string; taskType?: string; plannedStart?: string; plannedEnd?: string;
  durationDays?: number; status?: string; percentComplete?: number; priority?: number;
  departmentCode?: string; customerMilestone?: boolean; color?: string;
}

interface EmployeeAction {
  id: number; title: string; description?: string; actionType: string; departmentCode?: string;
  priority: string; status: ActionStatus; dueDate?: string | null; insertedDate?: string | null;
  projectId: number; projectCode?: string; projectName?: string; assignees: string[];
}

interface EmployeeProject {
  id: number; code: string; name: string; projectManagerName?: string; plannedStart?: string;
  plannedEnd?: string; status?: string; progress?: number; health?: string;
  assignedTaskCount: number; openActionCount: number;
}

interface AppNotification {
  id: number; projectId?: number | null; taskId?: number | null; subject: string; message: string;
  severity?: string; createdAt: string; readByUser: boolean; link?: string | null;
}

@Component({
  selector: 'app-dashboard-employee',
  templateUrl: './dashboard-employee.component.html',
  styleUrls: ['./dashboard-employee.component.scss']
})
export class DashboardEmployeeComponent implements OnInit {
  readonly pages: Array<{ key: WorkspacePage; label: string; icon: string; route: string }> = [
    { key: 'tasks', label: 'My Tasks', icon: 'assignment', route: '/employee/tasks' },
    { key: 'actions', label: 'My Actions', icon: 'checklist', route: '/employee/actions' },
    { key: 'schedule', label: 'My Schedule', icon: 'calendar_month', route: '/employee/schedule' },
    { key: 'projects', label: 'My Projects', icon: 'folder_open', route: '/employee/projects' },
    { key: 'notifications', label: 'Notifications', icon: 'notifications', route: '/employee/notifications' }
  ];
  readonly actionColumns: Array<{ status: ActionStatus; label: string }> = [
    { status: 'todo', label: 'To Do' }, { status: 'doing', label: 'In Progress' },
    { status: 'review', label: 'In Review' }, { status: 'blocked', label: 'Blocked' }, { status: 'done', label: 'Done' }
  ];

  page: WorkspacePage = 'home';
  userName = 'Employee';
  loading = false;
  error = '';
  statusMessage = '';
  tasks: EmployeeTask[] = [];
  actions: EmployeeAction[] = [];
  projects: EmployeeProject[] = [];
  notifications: AppNotification[] = [];
  taskSearch = '';
  taskStatus = '';
  taskProject = '';
  actionSearch = '';
  actionProject = '';
  selectedTask: EmployeeTask | null = null;
  selectedAction: EmployeeAction | null = null;
  selectedProject: EmployeeProject | null = null;
  draggedAction: EmployeeAction | null = null;
  dragOverStatus: ActionStatus | null = null;
  weekStart = this.startOfWeek(new Date());

  constructor(private http: HttpClient, private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.userName = this.auth.getCurrentUsername() || 'Employee';
    this.route.data.subscribe(data => {
      this.page = (data['employeePage'] as WorkspacePage) || 'home';
      this.loadPage();
    });
  }

  loadPage(): void {
    this.loading = true;
    this.error = '';
    this.statusMessage = '';
    const requests: { [key: string]: any } = {};
    if (this.page === 'home' || this.page === 'tasks' || this.page === 'schedule') requests['tasks'] = this.http.get<EmployeeTask[]>(`${API_BASE_URL}/employee/tasks`);
    if (this.page === 'home' || this.page === 'actions') requests['actions'] = this.http.get<EmployeeAction[]>(`${API_BASE_URL}/employee/actions`);
    if (this.page === 'home' || this.page === 'projects') requests['projects'] = this.http.get<EmployeeProject[]>(`${API_BASE_URL}/employee/projects`);
    if (this.page === 'home' || this.page === 'notifications') requests['notifications'] = this.http.get<AppNotification[]>(`${API_BASE_URL}/notifications/mine`);

    const keys = Object.keys(requests);
    if (!keys.length) { this.loading = false; return; }
    let remaining = keys.length;
    keys.forEach(key => requests[key].subscribe({
      next: (result: any) => { (this as any)[key] = result || []; this.completeLoad(--remaining); },
      error: (err: any) => { this.error = err?.error?.message || 'Unable to load your workspace.'; this.completeLoad(--remaining); }
    }));
  }

  private completeLoad(remaining: number): void { if (remaining === 0) this.loading = false; }

  get filteredTasks(): EmployeeTask[] {
    const search = this.taskSearch.trim().toLowerCase();
    return this.tasks.filter(task => (!this.taskProject || String(task.projectId) === this.taskProject)
      && (!this.taskStatus || (task.status || '').toLowerCase() === this.taskStatus)
      && (!search || [task.name, task.projectName, task.projectCode, task.wbsCode, task.departmentCode]
        .some(value => (value || '').toLowerCase().includes(search))));
  }

  get filteredActions(): EmployeeAction[] {
    const search = this.actionSearch.trim().toLowerCase();
    return this.actions.filter(action => (!this.actionProject || String(action.projectId) === this.actionProject)
      && (!search || [action.title, action.description, action.projectName, action.projectCode, action.departmentCode]
        .some(value => (value || '').toLowerCase().includes(search))));
  }

  get taskProjects(): Array<{ id: number; name: string }> { return this.projectOptions(this.tasks); }
  get actionProjects(): Array<{ id: number; name: string }> { return this.projectOptions(this.actions); }
  get openTaskCount(): number { return this.tasks.filter(t => !this.isDoneTask(t)).length; }
  get openActionCount(): number { return this.actions.filter(a => a.status !== 'done').length; }
  get unreadCount(): number { return this.notifications.filter(n => !n.readByUser).length; }
  get dueSoonTasks(): number { return this.tasks.filter(t => this.isDueSoon(t.plannedEnd) && !this.isDoneTask(t)).length; }
  get dueSoonActions(): number { return this.actions.filter(a => this.isDueSoon(a.dueDate) && a.status !== 'done').length; }
  get upcomingTasks(): EmployeeTask[] { return [...this.tasks].filter(t => !!t.plannedStart).sort((a, b) => (a.plannedStart || '').localeCompare(b.plannedStart || '')).slice(0, 5); }
  get recentNotifications(): AppNotification[] { return this.notifications.slice(0, 4); }

  projectOptions(rows: Array<{ projectId: number; projectName?: string; projectCode?: string }>): Array<{ id: number; name: string }> {
    const values = new Map<number, string>();
    rows.forEach(row => values.set(row.projectId, row.projectName || row.projectCode || `Project #${row.projectId}`));
    return [...values.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }

  getKanbanActions(status: ActionStatus): EmployeeAction[] { return this.filteredActions.filter(action => action.status === status); }

  onDragStart(event: DragEvent, action: EmployeeAction): void {
    this.draggedAction = action;
    event.dataTransfer?.setData('text/plain', String(action.id));
  }
  onDragOver(event: DragEvent, status: ActionStatus): void { event.preventDefault(); this.dragOverStatus = status; }
  onDragEnd(): void { this.draggedAction = null; this.dragOverStatus = null; }
  dropAction(event: DragEvent, status: ActionStatus): void {
    event.preventDefault();
    const action = this.draggedAction;
    this.onDragEnd();
    if (!action || action.status === status) return;
    const previous = action.status;
    action.status = status;
    this.statusMessage = 'Saving action status…';
    this.http.patch<EmployeeAction>(`${API_BASE_URL}/employee/actions/${action.id}/status`, { status }).subscribe({
      next: updated => {
        const index = this.actions.findIndex(item => item.id === updated.id);
        if (index >= 0) this.actions[index] = updated;
        if (this.selectedAction?.id === updated.id) this.selectedAction = updated;
        this.statusMessage = 'Action status saved.';
      },
      error: err => {
        action.status = previous;
        this.statusMessage = '';
        this.error = err?.error?.message || 'The action status could not be saved. The card was restored.';
      }
    });
  }

  get weekDays(): Date[] { return Array.from({ length: 7 }, (_, index) => this.addDays(this.weekStart, index)); }
  get weekLabel(): string { const end = this.addDays(this.weekStart, 6); return `${this.weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`; }
  tasksForDay(day: Date): EmployeeTask[] { return this.tasks.filter(task => this.overlaps(task, day)); }
  previousWeek(): void { this.weekStart = this.addDays(this.weekStart, -7); }
  nextWeek(): void { this.weekStart = this.addDays(this.weekStart, 7); }
  goToday(): void { this.weekStart = this.startOfWeek(new Date()); }
  isToday(day: Date): boolean { return this.toIso(day) === this.toIso(new Date()); }

  markRead(notification: AppNotification): void {
    if (!notification.readByUser) {
      this.http.post<void>(`${API_BASE_URL}/notifications/${notification.id}/read`, {}).subscribe({
        next: () => notification.readByUser = true,
        error: () => this.error = 'Notification could not be marked as read.'
      });
    }
    if (notification.link) this.router.navigateByUrl(notification.link);
  }
  markAllRead(): void {
    this.http.post<void>(`${API_BASE_URL}/notifications/read-all`, {}).subscribe({
      next: () => this.notifications.forEach(notification => notification.readByUser = true),
      error: () => this.error = 'Notifications could not be updated.'
    });
  }

  navigate(route: string): void { this.router.navigateByUrl(route); }
  logout(): void { this.auth.logout(); this.router.navigate(['/login']); }
  closeDetails(): void { this.selectedTask = null; this.selectedAction = null; this.selectedProject = null; }
  taskStatusLabel(status?: string): string { return (status || 'Not started').replace(/_/g, ' '); }
  actionStatusLabel(status: string): string { return ({ todo: 'To Do', doing: 'In Progress', review: 'In Review', blocked: 'Blocked', done: 'Done' } as any)[status] || status; }
  priorityLabel(priority?: string | number): string { return priority === null || priority === undefined || priority === '' ? 'Normal' : String(priority); }
  isDoneTask(task: EmployeeTask): boolean { return ['done', 'completed', 'complete'].includes((task.status || '').toLowerCase()) || task.percentComplete === 100; }
  isDueSoon(date?: string | null): boolean { if (!date) return false; const delta = (new Date(`${date}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000; return delta >= 0 && delta <= 7; }
  private overlaps(task: EmployeeTask, day: Date): boolean { if (!task.plannedStart) return false; const start = new Date(`${task.plannedStart}T00:00:00`); const end = new Date(`${task.plannedEnd || task.plannedStart}T23:59:59`); return start <= day && end >= day; }
  private startOfWeek(date: Date): Date { const value = new Date(date); const offset = (value.getDay() + 6) % 7; value.setDate(value.getDate() - offset); value.setHours(0, 0, 0, 0); return value; }
  private addDays(date: Date, days: number): Date { const value = new Date(date); value.setDate(value.getDate() + days); return value; }
  private toIso(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
}
