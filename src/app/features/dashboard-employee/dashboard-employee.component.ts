import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/config/api.config';
import { AuthService } from 'src/app/core/auth/auth.service';

interface EmployeeTask {
  id: number;
  name: string;
  projectId: number;
  wbsCode?: string;
  plannedStart?: string;
  plannedEnd?: string;
  status?: string;
  percentComplete?: number;
  priority?: number;
}

interface EmployeeAction {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  projectId: number;
  projectCode: string;
}

@Component({
  selector: 'app-dashboard-employee',
  templateUrl: './dashboard-employee.component.html',
  styleUrls: ['./dashboard-employee.component.scss']
})
export class DashboardEmployeeComponent implements OnInit {
  userName = 'Employee';
  role = 'EMPLOYEE';
  
  tasks: EmployeeTask[] = [];
  actions: EmployeeAction[] = [];
  
  loading = false;
  error = '';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userName = this.auth.getCurrentUsername() || 'Employee';
    this.role = this.auth.getCurrentRole() || 'EMPLOYEE';
    this.loadWorkspaceData();
  }

  loadWorkspaceData(): void {
    this.loading = true;
    this.error = '';

    // Charge les tâches et les actions en parallèle
    this.http.get<EmployeeTask[]>(`${API_BASE_URL}/employee/tasks/mine`).subscribe({
      next: (tasks) => {
        this.tasks = tasks || [];
        this.loading = false;
        
        // Charge les actions séparément pour ne pas bloquer si ça échoue
        this.http.get<EmployeeAction[]>(`${API_BASE_URL}/actions/my`).pipe(
          catchError(() => {
            console.warn('Failed to load actions');
            return of([]);
          })
        ).subscribe({
          next: (actions) => {
            this.actions = actions || [];
          }
        });
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load your tasks.';
        this.loading = false;
      }
    });
  }

  loadTasks(): void {
    this.loadWorkspaceData();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  get upcomingTasks(): EmployeeTask[] {
    return this.tasks
      .filter(task => !!task.plannedStart)
      .sort((a, b) => new Date(a.plannedStart!).getTime() - new Date(b.plannedStart!).getTime())
      .slice(0, 5);
  }

  getPriorityClass(priority: string): string {
    if (!priority) return 'priority-low';
    const p = priority.toLowerCase();
    if (p === 'high') return 'priority-high';
    if (p === 'medium') return 'priority-medium';
    return 'priority-low';
  }

  getStatusClass(status: string): string {
    if (!status) return 'status-todo';
    const s = status.toLowerCase();
    if (s === 'blocked') return 'status-blocked';
    if (s === 'review') return 'status-review';
    if (s === 'doing') return 'status-doing';
    return 'status-todo';
  }
}