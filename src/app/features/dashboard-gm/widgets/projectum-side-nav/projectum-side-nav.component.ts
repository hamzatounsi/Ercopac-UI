import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-projectum-side-nav',
  templateUrl: './projectum-side-nav.component.html',
  styleUrls: ['./projectum-side-nav.component.scss']
})
export class ProjectumSideNavComponent {
  @Input() activeItem: 'details' | 'schedule' | 'tasks' | 'action' | 'risk' | 'finance' = 'details';
  @Input() projectId!: number;

  items = [
    { key: 'details', label: 'Details', icon: 'info' },
    { key: 'schedule', label: 'Schedule', icon: 'calendar_month' },
    { key: 'tasks', label: 'Tasks', icon: 'task' },
    { key: 'action', label: 'Action', icon: 'bolt' },
    { key: 'risk', label: 'Risk', icon: 'warning' },
    { key: 'finance', label: 'Finance', icon: 'payments' }
  ];

  getRoute(key: string): any[] | null {
    if (!this.projectId) {
      return null;
    }

    switch (key) {
      case 'details':
        return ['/gm/projects', this.projectId];
      case 'schedule':
        return ['/gm/projects', this.projectId, 'schedule'];
      case 'tasks':
        return ['/gm/projects', this.projectId, 'tasks'];
      case 'action':
      case 'risk':
      case 'finance':
        return null;
      default:
        return null;
    }
  }
}