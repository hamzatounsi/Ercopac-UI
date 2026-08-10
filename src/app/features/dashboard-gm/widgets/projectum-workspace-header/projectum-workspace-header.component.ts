import { Component, Input } from '@angular/core';

interface ProjectumModuleLink {
  label: string;
  icon: string;
  path: string;
  exact?: boolean;
}

/**
 * Project-level context and navigation for the Projectum workspace only.
 * Page actions are intentionally projected so feature pages retain their own
 * permissions, handlers, loading states and button labels.
 */
@Component({
  selector: 'app-projectum-workspace-header',
  templateUrl: './projectum-workspace-header.component.html',
  styleUrls: ['./projectum-workspace-header.component.scss']
})
export class ProjectumWorkspaceHeaderComponent {
  @Input() title = 'Projectum';
  @Input() subtitle = '';
  @Input() projectId: number | null = null;
  @Input() projectName = '';
  @Input() showBack = true;
  @Input() showProjectModules = true;

  readonly modules: readonly ProjectumModuleLink[] = [
    { label: 'Schedule', icon: 'timeline', path: 'schedule', exact: true },
    { label: 'Finance', icon: 'payments', path: 'finance', exact: true },
    { label: 'Forecast', icon: 'trending_up', path: 'forecast', exact: true },
    { label: 'Risks', icon: 'warning', path: 'risks', exact: true },
    { label: 'Change Requests', icon: 'contract_edit', path: 'change-requests', exact: true },
    { label: 'Actions', icon: 'assignment_turned_in', path: 'actions', exact: true }
  ];

  get hasProjectContext(): boolean {
    return Number.isFinite(Number(this.projectId)) && Number(this.projectId) > 0;
  }

  projectRoute(module: ProjectumModuleLink): (string | number)[] {
    return ['/gm', 'projects', Number(this.projectId), module.path];
  }

  get projectContextLabel(): string {
    return this.projectName || `Project #${this.projectId}`;
  }
}
