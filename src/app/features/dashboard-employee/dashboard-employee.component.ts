import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
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

@Component({
  selector: 'app-dashboard-employee',
  templateUrl: './dashboard-employee.component.html',
  styleUrls: ['./dashboard-employee.component.scss']
})
export class DashboardEmployeeComponent implements OnInit {
  userName = 'Employee';
  role = 'EMPLOYEE';
  tasks: EmployeeTask[] = [];
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
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading = true;
    this.error = '';

    this.http.get<EmployeeTask[]>(`${API_BASE_URL}/employee/tasks/mine`).subscribe({
      next: tasks => {
        this.tasks = tasks;
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.message || 'Failed to load your assigned tasks.';
        this.loading = false;
      }
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  get upcomingTasks(): EmployeeTask[] {
    return this.tasks
      .filter(task => !!task.plannedStart)
      .slice(0, 5);
  }
}
