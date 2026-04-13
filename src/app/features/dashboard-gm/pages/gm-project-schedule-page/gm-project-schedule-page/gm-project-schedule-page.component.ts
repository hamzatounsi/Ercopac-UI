import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GmProjectTimelineService } from '../../../services/gm-project-timeline.service';
import { GmProjectScheduleTask, TaskDependencyDto } from '../../../models/gm-project-schedule-task.model';
import { GmUpdateProjectTaskRequest } from '../../../models/gm-update-project-task-request.model';
import { TaskResourceAssignment } from '../../../models/task-resource-assignment.model';
import { GmProjectBaselineService } from '../../../services/gm-project-baseline.service';
import { ProjectBaseline } from '../../../models/project-baseline.model';
import { GmProjectCalendarService } from '../../../services/gm-project-calendar.service';
import { ProjectCalendar } from '../../../models/project-calendar.model';
import { GmProjectTemplateService } from '../../../services/gm-project-template.service';
import { ProjectTemplate } from '../../../models/project-template.model';

export interface TimelineDay {
  label: string;
  date: Date;
  weekNumber: number;
  isWeekStart: boolean;
}

export interface TimelineWeek {
  weekNumber: number;
  startLabel: string;
  width: number;
}

export interface DependencySegment {
  left: number;
  top: number;
  width: number;
  height: number;
  direction: 'h' | 'v';
}

export interface DependencyArrow {
  segments: DependencySegment[];
  arrowLeft: number;
  arrowTop: number;
}

export interface TimelineMonth {
  label: string;
  width: number;
}

@Component({
  selector: 'app-gm-project-schedule-page',
  templateUrl: './gm-project-schedule-page.component.html',
  styleUrls: ['./gm-project-schedule-page.component.scss']
})
export class GmProjectSchedulePageComponent implements OnInit, AfterViewInit {
  @ViewChild('tableBodyScroll') tableBodyScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('ganttBodyScroll') ganttBodyScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('timelineHeaderScroll') timelineHeaderScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('leftHeaderScroll') leftHeaderScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('monthHeaderScroll') monthHeaderScroll!: ElementRef<HTMLDivElement>;

  projectId!: number;
  loading = false;
  saving = false;

  tasks: GmProjectScheduleTask[] = [];

  selectedTask: GmProjectScheduleTask | null = null;
  drawerOpen = false;
  activeDetailTab: 'general' | 'predecessors' | 'resources' = 'general';
  taskForm!: FormGroup;

  timelineDays: TimelineDay[] = [];
  dayWidth = 40;
  readonly rowHeight = 28;

  readonly activityBarTop = 9;
  readonly activityBarHeight = 12;

  readonly summaryBarTop = 14;
  readonly summaryBarHeight = 4;

  readonly milestoneTop = 10;
  readonly milestoneSize = 10;

  activeMode: 'baseline' | 'actual' = 'baseline';
  activeZoom: '2W' | '1M' | '2M' | 'Day' = '1M';

  private syncingVertical = false;
  private syncingHorizontal = false;

  stats = {
    total: 0,
    milestones: 0,
    summaries: 0,
    avgProgress: 0
  };

  readonly taskTypes = ['ACTIVITY', 'SUMMARY', 'MILESTONE'];
  readonly departmentCodes = ['PM', 'ME', 'CE', 'SW', 'PRC', 'MFC', 'QA', 'HSE', 'INST', 'FIN', 'CS'];
  readonly resourceTypes = ['PM', 'ME', 'EE', 'PC', 'PLC', 'PRC', 'MFC.M', 'MFC.E', 'QA', 'HSE', 'INST', 'FIN', 'CS', 'MEC', 'ELECT', 'CUST'];

  settingsOpen = false;
  settingsTab: 'templates' | 'calendar' | 'baseline' = 'templates';

  history: GmProjectScheduleTask[][] = [];
  future: GmProjectScheduleTask[][] = [];

  templateName = '';
  selectedTemplateScope: 'all' | 'selected' = 'all';
  selectedTemplateTaskIds = new Set<number>();
  templateDescription = '';
  templates: {
    id: number;
    name: string;
    scope: 'all' | 'selected';
    description?: string | null;
    tasks: GmProjectScheduleTask[];
    createdAt: string;
  }[] = [];

  calendars: ProjectCalendar[] = [];

  baselineName = '';
  baselines: {
      id: number;
      name: string;
      createdAt: string;
      tasks: GmProjectScheduleTask[];
      active?: boolean;
    }[] = [];

  dependencyTypes = ['FS', 'SS', 'FF', 'SF'];

  newDependency = {
    predecessorTaskId: null as number | null,
    dependencyType: 'FS',
    lagDays: 0
  };

  resourceOptions: { id: number; fullName: string; departmentCode: string }[] = [];

  levelMenuOpen = false;
  deptMenuOpen = false;
  columnsMenuOpen = false;

  selectedLevelFilter: number | 'ALL' = 'ALL';
  selectedDepartmentFilter = 'ALL';

  columnVisibility = {
    id: true,
    wbs: true,
    customer: true,
    name: true,
    type: true,
    resourceType: true,
    department: true,
    actualStart: true,
    actualFinish: true,
    duration: true,
    predecessors: true,
    progress: true,
    baselineStart: true,
    baselineEnd: true
  };

  leftPaneWidth = 750;
  private isResizing = false;

  readonly minLeftPaneWidth = 520;
  readonly maxLeftPaneWidth = 1300;

  editedRows: Record<number, Partial<GmProjectScheduleTask>> = {};

  collapsedTaskIds = new Set<number>();

  dragState: {
    taskId: number;
    startClientX: number;
    originalPlannedStart: string | null;
    originalPlannedEnd: string | null;
    deltaDays: number;
  } | null = null;

  taskResources: TaskResourceAssignment[] = [];

  newResource: TaskResourceAssignment = {
    resourceType: '',
    assignmentName: '',
    quantity: 1,
    unitsPercent: 100,
    cost: 0,
    assignedUserId: null
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private service: GmProjectTimelineService,
    private baselineService: GmProjectBaselineService,
    private calendarService: GmProjectCalendarService,
    private templateService: GmProjectTemplateService
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.initForm();
    this.loadSchedule();

    const savedWidth = localStorage.getItem('gmScheduleLeftPaneWidth');
    if (savedWidth) {
      this.leftPaneWidth = Number(savedWidth);
    }
  }

  ngAfterViewInit(): void {}

  backToProjectum(): void {
    this.router.navigate(['/gm/projectum']);
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

  goToChangeRequests(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'change-requests']);
  }

  loadSchedule(): void {
    this.loading = true;

    this.service.getProjectSchedule(this.projectId).subscribe({
      next: (res) => {
        this.tasks = (res ?? []).sort(
          (a, b) => ((a.displayOrder ?? 0) - (b.displayOrder ?? 0)) || (a.id - b.id)
        );

        this.computeStats();
        this.buildTimeline();
        this.loading = false;
        this.loadBaselines();
        this.loadCalendars();
        this.loadTemplates();

      if (this.selectedTask) {
        const refreshed = this.tasks.find(t => t.id === this.selectedTask?.id) ?? null;
        this.selectedTask = refreshed;
        if (refreshed) {
          this.taskForm.patchValue(this.toFormValue(refreshed));
          this.loadTaskResources(refreshed.id);
        } else {
          this.taskResources = [];
        }
      }

        setTimeout(() => this.resetScroll(), 0);
      },
      error: (err) => {
        console.error('Failed to load schedule', err);
        this.loading = false;
      }
    });
  }

  initForm(): void {
    this.taskForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      durationDays: [0],
      baselineStart: [''],
      baselineEnd: [''],
      plannedStart: [''],
      plannedEnd: [''],
      actualStart: [''],
      actualEnd: [''],
      percentComplete: [0, [Validators.min(0), Validators.max(100)]],
      allocationPercent: [100, [Validators.min(0), Validators.max(100)]],
      priority: [500],
      taskType: ['ACTIVITY', Validators.required],
      wbsCode: [''],
      departmentCode: [''],
      active: [true],
      displayOrder: [0],
      customerMilestone: [false],
      scheduleMode: ['AUTO'],
      status: [''],
      color: [''],
      assignedUserId: [null],
      resourceType: ['']
    });
  }

saveDependency(dep: TaskDependencyDto): void {
  if (!this.selectedTask || !dep.id) return;

  if (!dep.predecessorTaskId || dep.predecessorTaskId === this.selectedTask.id) {
    console.error('Invalid predecessor.');
    return;
  }

  const payload: TaskDependencyDto = {
    id: dep.id,
    predecessorTaskId: dep.predecessorTaskId,
    successorTaskId: this.selectedTask.id,
    dependencyType: (dep.dependencyType || 'FS').toUpperCase(),
    lagDays: dep.lagDays ?? 0
  };

  this.service.updateDependency(this.projectId, dep.id, payload).subscribe({
    next: () => this.loadSchedule(),
    error: (err) => console.error('Failed to update dependency', err)
  });
}

    private toFormValue(task: GmProjectScheduleTask) {
    return {
      name: task.name ?? '',
      description: task.description ?? '',
      durationDays: task.durationDays ?? 0,
      baselineStart: task.baselineStart ?? '',
      baselineEnd: task.baselineEnd ?? '',
      plannedStart: task.plannedStart ?? '',
      plannedEnd: task.plannedEnd ?? '',
      actualStart: task.actualStart ?? '',
      actualEnd: task.actualEnd ?? '',
      percentComplete: task.percentComplete ?? 0,
      allocationPercent: task.allocationPercent ?? 100,
      priority: task.priority ?? 500,
      taskType: task.taskType ?? 'ACTIVITY',
      wbsCode: task.wbsCode ?? '',
      departmentCode: task.departmentCode ?? '',
      active: task.active ?? true,
      displayOrder: task.displayOrder ?? 0,
      customerMilestone: task.customerMilestone ?? false,
      scheduleMode: task.scheduleMode ?? 'AUTO',
      status: task.status ?? '',
      color: task.color ?? '',
      assignedUserId: task.assignedUserId ?? null,
      resourceType: task.resourceType ?? ''
    };
  }

  loadTaskResources(taskId: number): void {
  this.service.getTaskResources(this.projectId, taskId).subscribe({
    next: (res) => {
      this.taskResources = res ?? [];
    },
    error: (err) => {
      console.error('Failed to load task resources', err);
      this.taskResources = [];
    }
  });
  }

addResource(): void {
  if (!this.selectedTask) return;

  const resourceType = (this.newResource.resourceType ?? '').trim();
  const assignmentName = (this.newResource.assignmentName ?? '').trim();

  if (!resourceType && !assignmentName) {
    console.error('Please provide at least a resource type or assignment name.');
    return;
  }

  const payload: TaskResourceAssignment = {
    resourceType: resourceType || undefined,
    assignmentName: assignmentName || undefined,
    quantity: this.newResource.quantity ?? 1,
    unitsPercent: this.newResource.unitsPercent ?? 100,
    cost: this.newResource.cost ?? 0,
    assignedUserId: this.newResource.assignedUserId ?? null
  };

  this.service.createTaskResource(this.projectId, this.selectedTask.id, payload).subscribe({
    next: () => {
      this.newResource = {
        resourceType: '',
        assignmentName: '',
        quantity: 1,
        unitsPercent: 100,
        cost: 0,
        assignedUserId: null
      };
      this.loadTaskResources(this.selectedTask!.id);
    },
    error: (err) => console.error('Failed to create task resource', err)
  });
}

saveResource(resource: TaskResourceAssignment): void {
  if (!this.selectedTask || !resource.id) return;

  const payload: TaskResourceAssignment = {
    ...resource,
    resourceType: resource.resourceType?.trim() || undefined,
    assignmentName: resource.assignmentName?.trim() || undefined,
    quantity: resource.quantity ?? 1,
    unitsPercent: resource.unitsPercent ?? 100,
    cost: resource.cost ?? 0,
    assignedUserId: resource.assignedUserId ?? null
  };

  this.service.updateTaskResource(this.projectId, this.selectedTask.id, resource.id, payload).subscribe({
    next: () => this.loadTaskResources(this.selectedTask!.id),
    error: (err) => console.error('Failed to update task resource', err)
  });
}

  removeResource(assignmentId?: number): void {
  if (!this.selectedTask || !assignmentId) return;

  this.service.deleteTaskResource(this.projectId, this.selectedTask.id, assignmentId).subscribe({
    next: () => this.loadTaskResources(this.selectedTask!.id),
    error: (err) => console.error('Failed to delete task resource', err)
  });
  }

openTaskDrawer(task: GmProjectScheduleTask): void {
  this.selectedTask = task;
  this.drawerOpen = true;
  this.activeDetailTab = 'general';
  this.taskForm.patchValue(this.toFormValue(task));

  this.newDependency = {
    predecessorTaskId: null,
    dependencyType: 'FS',
    lagDays: 0
  };

  this.newResource = {
    resourceType: '',
    assignmentName: '',
    quantity: 1,
    unitsPercent: 100,
    cost: 0,
    assignedUserId: null
  };

  if (this.selectedTemplateScope === 'selected' && !task) {
  this.selectedTemplateScope = 'all';
  }

  this.loadTaskResources(task.id);
}

closeDrawer(): void {
  this.drawerOpen = false;
  this.selectedTask = null;
  this.taskResources = [];
  this.newDependency = {
    predecessorTaskId: null,
    dependencyType: 'FS',
    lagDays: 0
  };
  this.newResource = {
    resourceType: '',
    assignmentName: '',
    quantity: 1,
    unitsPercent: 100,
    cost: 0,
    assignedUserId: null
  };

  if (this.selectedTemplateScope === 'selected') {
  this.selectedTemplateScope = 'all';
  }
}

  toggleLevelMenu(): void {
    this.levelMenuOpen = !this.levelMenuOpen;
    this.deptMenuOpen = false;
    this.columnsMenuOpen = false;
  }

  toggleDeptMenu(): void {
    this.deptMenuOpen = !this.deptMenuOpen;
    this.levelMenuOpen = false;
    this.columnsMenuOpen = false;
  }

  toggleColumnsMenu(): void {
    this.columnsMenuOpen = !this.columnsMenuOpen;
    this.levelMenuOpen = false;
    this.deptMenuOpen = false;
  }

  setLevelFilter(level: number | 'ALL'): void {
    this.selectedLevelFilter = level;
    this.levelMenuOpen = false;
  }

  setDepartmentFilter(dept: string): void {
    this.selectedDepartmentFilter = dept;
    this.deptMenuOpen = false;
  }

  toggleColumn(columnKey: keyof typeof this.columnVisibility): void {
    this.columnVisibility[columnKey] = !this.columnVisibility[columnKey];
  }

  getWbsLevel(task: GmProjectScheduleTask): number {
    if (!task.wbsCode) return 1;
    return task.wbsCode.split('.').length;
  }

  matchesLevelFilter(task: GmProjectScheduleTask): boolean {
    if (this.selectedLevelFilter === 'ALL') return true;
    return this.getWbsLevel(task) <= this.selectedLevelFilter;
  }

  matchesDepartmentFilter(task: GmProjectScheduleTask): boolean {
    if (this.selectedDepartmentFilter === 'ALL') return true;
    return (task.departmentCode || '').toUpperCase() === this.selectedDepartmentFilter.toUpperCase();
  }

  getLevelButtonLabel(): string {
    if (this.selectedLevelFilter === 'ALL') return 'L';
    return `L${this.selectedLevelFilter}`;
  }

  zoomOut(): void {
    const order: Array<'2W' | '1M' | '2M' | 'Day'> = ['2W', '2M', '1M', 'Day'];
    const index = order.indexOf(this.activeZoom);
    if (index > 0) {
      this.setZoom(order[index - 1]);
    }
  }

  zoomIn(): void {
    const order: Array<'2W' | '1M' | '2M' | 'Day'> = ['2W', '2M', '1M', 'Day'];
    const index = order.indexOf(this.activeZoom);
    if (index < order.length - 1) {
      this.setZoom(order[index + 1]);
    }
  }

  getTaskTypeShort(type?: string): string {
    const value = (type || '').toUpperCase();
    if (value === 'SUMMARY') return 'Sum';
    if (value === 'MILESTONE') return 'Mile';
    return 'Acti';
  }

  toNumber(value: string): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  updateLocalTaskField(task: GmProjectScheduleTask, field: keyof GmProjectScheduleTask, value: any): void {
    (task as any)[field] = value;

    this.computeStats();
    this.buildTimeline();

    if (this.selectedTask?.id === task.id) {
      this.selectedTask = task;
      this.taskForm.patchValue(this.toFormValue(task), { emitEvent: false });
    }
  }

  getPredecessorText(task: GmProjectScheduleTask): string {
    if (!task.dependencies?.length) return '—';

    return task.dependencies
      .map(dep => `${dep.predecessorTaskId}:${dep.dependencyType || 'FS'}`)
      .join(', ');
  }

  saveTask(): void {
    if (!this.selectedTask || this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const value = this.taskForm.value;

    if (value.plannedStart && value.plannedEnd && value.plannedEnd < value.plannedStart) return;
    if (value.baselineStart && value.baselineEnd && value.baselineEnd < value.baselineStart) return;
    if (value.actualStart && value.actualEnd && value.actualEnd < value.actualStart) return;

    this.pushHistory();
    this.saving = true;

    const payload: GmUpdateProjectTaskRequest = {
      name: value.name ?? '',
      description: value.description ?? '',
      durationDays: value.durationDays ?? 0,
      baselineStart: value.baselineStart || undefined,
      baselineEnd: value.baselineEnd || undefined,
      plannedStart: value.plannedStart || undefined,
      plannedEnd: value.plannedEnd || undefined,
      actualStart: value.actualStart || undefined,
      actualEnd: value.actualEnd || undefined,
      percentComplete: value.percentComplete ?? 0,
      allocationPercent: value.allocationPercent ?? undefined,
      priority: value.priority ?? 0,
      taskType: value.taskType ?? 'ACTIVITY',
      wbsCode: value.wbsCode ?? '',
      departmentCode: value.departmentCode ?? '',
      resourceType: value.resourceType ?? undefined,
      active: value.active ?? true,
      displayOrder: value.displayOrder ?? 0,
      customerMilestone: value.customerMilestone ?? false,
      scheduleMode: value.scheduleMode ?? 'AUTO',
      status: value.status || undefined,
      color: value.color || undefined,
      assignedUserId: value.assignedUserId ?? undefined
    };

    this.service.updateTask(this.selectedTask.id, payload).subscribe({
      next: () => {
        this.saving = false;
        this.loadSchedule();
      },
      error: (err) => {
        console.error('Failed to update task', err);
        this.saving = false;
      }
    });
  }

  private pushHistory(): void {
    this.history.push(this.cloneTasks(this.tasks));
    if (this.history.length > 50) this.history.shift();
    this.future = [];
  }

  undo(): void {
    if (!this.history.length) return;
    this.future.push(this.cloneTasks(this.tasks));
    const previous = this.history.pop();
    if (previous) {
      this.tasks = this.cloneTasks(previous);
      this.computeStats();
      this.buildTimeline();
      this.syncSelectedTaskReference();
    }
  }

  redo(): void {
    if (!this.future.length) return;
    this.history.push(this.cloneTasks(this.tasks));
    const next = this.future.pop();
    if (next) {
      this.tasks = this.cloneTasks(next);
      this.computeStats();
      this.buildTimeline();
      this.syncSelectedTaskReference();
    }
  }

  private syncSelectedTaskReference(): void {
    if (!this.selectedTask) return;
    const refreshed = this.tasks.find(t => t.id === this.selectedTask?.id) ?? null;
    this.selectedTask = refreshed;
    if (refreshed && this.taskForm) {
      this.taskForm.patchValue(this.toFormValue(refreshed));
    }
  }

  exportScheduleJson(): void {
    const payload = {
      projectId: this.projectId,
      exportedAt: new Date().toISOString(),
      tasks: this.tasks
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${this.projectId}-schedule.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importScheduleJson(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed || !Array.isArray(parsed.tasks)) return;

        this.pushHistory();
        this.tasks = this.cloneTasks(parsed.tasks);
        this.computeStats();
        this.buildTimeline();
        this.syncSelectedTaskReference();
        this.closeDrawer();
      } catch (error) {
        console.error('Import failed', error);
      } finally {
        input.value = '';
      }
    };

    reader.readAsText(file);
  }

  indentTask(): void {
    if (!this.selectedTask) return;

    const index = this.tasks.findIndex(t => t.id === this.selectedTask?.id);
    if (index <= 0) return;

    const current = this.tasks[index];
    const previous = this.tasks[index - 1];

    const previousLevel = previous.wbsCode ? previous.wbsCode.split('.').length : 1;
    const currentLevel = current.wbsCode ? current.wbsCode.split('.').length : 1;

    if (currentLevel > previousLevel + 1) return;

    this.pushHistory();
    current.wbsCode = `${previous.wbsCode || '1'}.1`;
    this.recalculateWbsCodes();
    this.syncSelectedTaskReference();
  }

  outdentTask(): void {
    if (!this.selectedTask?.wbsCode) return;

    const task = this.tasks.find(t => t.id === this.selectedTask?.id);
    if (!task?.wbsCode) return;

    const parts = task.wbsCode.split('.');
    if (parts.length <= 1) return;

    this.pushHistory();
    parts.pop();
    task.wbsCode = parts.join('.');
    this.recalculateWbsCodes();
    this.syncSelectedTaskReference();
  }

  private recalculateWbsCodes(): void {
    const counters: number[] = [];

    this.tasks.forEach((task) => {
      const rawLevel = task.wbsCode ? task.wbsCode.split('.').length : 1;
      const level = Math.max(1, rawLevel);

      counters[level - 1] = (counters[level - 1] || 0) + 1;
      counters.length = level;

      task.wbsCode = counters.join('.');
    });
  }

  toggleSettings(): void {
    this.settingsOpen = !this.settingsOpen;
  }

  closeSettingsOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('settings-overlay')) {
      this.settingsOpen = false;
    }
  }

  startResize(event: MouseEvent): void {
    event.preventDefault();
    this.isResizing = true;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isResizing) return;

      const newWidth = moveEvent.clientX;
      this.leftPaneWidth = Math.min(
        this.maxLeftPaneWidth,
        Math.max(this.minLeftPaneWidth, newWidth)
      );

      localStorage.setItem('gmScheduleLeftPaneWidth', String(this.leftPaneWidth));
    };

    const onMouseUp = () => {
      this.isResizing = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.classList.remove('resizing-pane');
    };

    document.body.classList.add('resizing-pane');
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  saveTemplateWithName(scope?: 'all' | 'selected'): void {
    const finalScope = scope ?? this.selectedTemplateScope;
    const name = this.templateName?.trim() || (finalScope === 'all' ? 'Full Schedule' : 'Selected Tasks');

    const tasksToSave = finalScope === 'all'
      ? this.cloneTasks(this.tasks)
      : this.cloneTasks(this.getSelectedTemplateTasks());

    if (!tasksToSave.length) {
      console.error('No tasks selected for template');
      return;
    }

    this.templateService.createTemplate(this.projectId, {
      name,
      scope: finalScope,
      description: this.templateDescription?.trim() || '',
      snapshotJson: JSON.stringify(tasksToSave)
    }).subscribe({
      next: () => {
        this.templateName = '';
        this.templateDescription = '';
        this.selectedTemplateScope = 'all';
        this.selectedTemplateTaskIds.clear();
        this.loadTemplates();
      },
      error: (err) => {
        console.error('Failed to save template', err);
      }
    });
  }

  applyTemplate(templateId: number): void {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;

    this.pushHistory();

    if (template.scope === 'all') {
      this.tasks = this.cloneTasks(template.tasks);
    } else {
      const copied = this.cloneTasks(template.tasks).map((task, index) => ({
        ...task,
        id: Date.now() + index
      }));
      this.tasks = [...this.tasks, ...copied];
    }

    this.computeStats();
    this.buildTimeline();
    this.syncSelectedTaskReference();
    this.closeDrawer();
  }

  deleteTemplate(templateId: number): void {
  this.templateService.deleteTemplate(this.projectId, templateId).subscribe({
    next: () => {
      this.templates = this.templates.filter(t => t.id !== templateId);
    },
    error: (err) => {
      console.error('Failed to delete template', err);
    }
    });
  }

  openTemplateTab(): void {
  this.settingsTab = 'templates';
  this.loadTemplates();
  }
  
  getTemplateTaskTypeLabel(task: GmProjectScheduleTask): string {
  if (this.isSummary(task)) return 'summary';
  if (this.isMilestone(task)) return 'milestone';
  return 'activity';
  }

  createDefaultCalendar(): void {
    const payload = {
      name: `Standard 5-day Week`,
      workingDays: [1, 2, 3, 4, 5],
      hoursPerDay: 8,
      startTime: '08:00',
      isDefault: this.calendars.length === 0
    };

    this.calendarService.createCalendar(this.projectId, payload).subscribe({
      next: () => this.loadCalendars(),
      error: (err) => console.error('Failed to create calendar', err)
    });
  }

  makeCalendarDefault(calendarId: number): void {
  this.calendarService.makeDefault(this.projectId, calendarId).subscribe({
    next: () => this.loadCalendars(),
    error: (err) => console.error('Failed to make calendar default', err)
    });
  }

  deleteCalendar(calendarId: number): void {
  this.calendarService.deleteCalendar(this.projectId, calendarId).subscribe({
    next: () => this.loadCalendars(),
    error: (err) => console.error('Failed to delete calendar', err)
    });
  }

  getCalendarDaysLabel(days: number[]): string {
    const map: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' };
    return days.map(d => map[d]).join('-');
  }

    saveBaselineWithName(): void {
      const name = this.baselineName?.trim() || `Baseline ${this.baselines.length + 1}`;

      const snapshotTasks = this.tasks.map(task => ({
        ...task,
        baselineStart: task.plannedStart,
        baselineEnd: task.plannedEnd
      }));

      this.baselineService.createBaseline(this.projectId, {
        name,
        snapshotJson: JSON.stringify(snapshotTasks)
      }).subscribe({
        next: () => {
          this.baselineName = '';
          this.loadBaselines();
        },
        error: (err) => {
          console.error('Failed to save baseline', err);
        }
      });
    }

  restoreBaseline(baselineId: number): void {
    const baseline = this.baselines.find(b => b.id === baselineId);
    if (!baseline) return;

    this.pushHistory();

    const baselineMap = new Map<number, GmProjectScheduleTask>();
    baseline.tasks.forEach(task => baselineMap.set(task.id, task));

    this.tasks = this.tasks.map(task => {
      const bt = baselineMap.get(task.id);
      if (!bt) return task;

      return {
        ...task,
        baselineStart: bt.baselineStart ?? bt.plannedStart ?? task.baselineStart,
        baselineEnd: bt.baselineEnd ?? bt.plannedEnd ?? task.baselineEnd
      };
    });

    this.baselines.forEach(b => (b.active = b.id === baselineId));
    this.computeStats();
    this.buildTimeline();
    this.syncSelectedTaskReference();
  }

  deleteBaseline(baselineId: number): void {
    this.baselineService.deleteBaseline(this.projectId, baselineId).subscribe({
      next: () => {
        this.baselines = this.baselines.filter(b => b.id !== baselineId);
      },
      error: (err) => {
        console.error('Failed to delete baseline', err);
      }
    });
  }

  setMode(mode: 'baseline' | 'actual'): void {
    this.activeMode = mode;
  }

  setZoom(zoom: '2W' | '1M' | '2M' | 'Day'): void {
    this.activeZoom = zoom;

    switch (zoom) {
      case '2W':
        this.dayWidth = 22;
        break;
      case '1M':
        this.dayWidth = 40;
        break;
      case '2M':
        this.dayWidth = 28;
        break;
      case 'Day':
        this.dayWidth = 54;
        break;
    }

    this.buildTimeline();
  }

  isMilestone(task?: GmProjectScheduleTask | null): boolean {
    return ((task?.taskType) || '').toUpperCase() === 'MILESTONE';
  }

  isSummary(task?: GmProjectScheduleTask | null): boolean {
    return ((task?.taskType) || '').toUpperCase() === 'SUMMARY';
  }

  isCustomerMilestone(task: GmProjectScheduleTask): boolean {
    return this.isMilestone(task) && !!task.customerMilestone;
  }

  getIndent(task: GmProjectScheduleTask): number {
    const level = task.wbsCode ? task.wbsCode.split('.').length - 1 : 0;
    return Math.max(0, level) * 16;
  }

  getResourceType(task: GmProjectScheduleTask): string {
    if ((task as any).resourceType) return (task as any).resourceType;
    if (task.assignedUserName) return 'USR';
    return task.departmentCode || '—';
  }

  getTaskLabel(task: GmProjectScheduleTask): string {
    if (this.isSummary(task)) return '';
    return task.name ?? '';
  }

  getSelectedTaskResourceType(): string {
    return this.selectedTask ? this.getResourceType(this.selectedTask) : '—';
  }

  toggleSummary(task: GmProjectScheduleTask, event?: MouseEvent): void {
    event?.stopPropagation();
    if (!this.isSummary(task)) return;

    if (this.collapsedTaskIds.has(task.id)) {
      this.collapsedTaskIds.delete(task.id);
    } else {
      this.collapsedTaskIds.add(task.id);
    }
  }

  get visibleTasks(): GmProjectScheduleTask[] {
    return this.tasks.filter(task =>
      !this.isHiddenByCollapsedParent(task) &&
      this.matchesLevelFilter(task) &&
      this.matchesDepartmentFilter(task)
    );
  }

  private isHiddenByCollapsedParent(task: GmProjectScheduleTask): boolean {
    if (!task.wbsCode) return false;

    const parts = task.wbsCode.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentWbs = parts.slice(0, i).join('.');
      const parent = this.tasks.find(t => t.wbsCode === parentWbs && this.isSummary(t));
      if (parent && this.collapsedTaskIds.has(parent.id)) {
        return true;
      }
    }

    return false;
  }

  private buildTimeline(): void {
    const dates: Date[] = [];

    this.tasks.forEach(task => {
      if (task.baselineStart) dates.push(this.toDateOnly(task.baselineStart));
      if (task.baselineEnd) dates.push(this.toDateOnly(task.baselineEnd));
      if (task.plannedStart) dates.push(this.toDateOnly(task.plannedStart));
      if (task.plannedEnd) dates.push(this.toDateOnly(task.plannedEnd));
      if (task.actualStart) dates.push(this.toDateOnly(task.actualStart));
        if (task.actualEnd) dates.push(this.toDateOnly(task.actualEnd));
    });

    if (!dates.length) {
      this.timelineDays = [];
      return;
    }

    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));

    min.setDate(min.getDate() - 7);
    max.setDate(max.getDate() + 7);

    const days: TimelineDay[] = [];
    const cursor = new Date(min);

    while (cursor <= max) {
      days.push({
        date: new Date(cursor),
        label: cursor.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase(),
        weekNumber: this.getWeekNumber(cursor),
        isWeekStart: cursor.getDay() === 1 || days.length === 0
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    this.timelineDays = days;
  }

  getTimelineWidth(): number {
    return this.timelineDays.length * this.dayWidth;
  }

  getTimelineMonths(): TimelineMonth[] {
    if (!this.timelineDays.length) return [];

    const months: TimelineMonth[] = [];
    let currentKey = '';
    let currentLabel = '';
    let currentCount = 0;

    this.timelineDays.forEach((day, index) => {
      const key = `${day.date.getFullYear()}-${day.date.getMonth()}`;
      const label = day.date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

      if (key !== currentKey) {
        if (currentCount > 0) months.push({ label: currentLabel, width: currentCount * this.dayWidth });
        currentKey = key;
        currentLabel = label;
        currentCount = 1;
      } else {
        currentCount++;
      }

      if (index === this.timelineDays.length - 1) {
        months.push({ label: currentLabel, width: currentCount * this.dayWidth });
      }
    });

    return months;
  }

  getTimelineWeeks(): TimelineWeek[] {
    if (!this.timelineDays.length) return [];

    const weeks: TimelineWeek[] = [];
    let currentWeekKey = '';
    let currentWeekNumber = 0;
    let currentStartLabel = '';
    let currentCount = 0;

    this.timelineDays.forEach((day, index) => {
      const key = `${day.date.getFullYear()}-${day.weekNumber}`;

      if (key !== currentWeekKey) {
        if (currentCount > 0) {
          weeks.push({
            weekNumber: currentWeekNumber,
            startLabel: currentStartLabel,
            width: currentCount * this.dayWidth
          });
        }

        currentWeekKey = key;
        currentWeekNumber = day.weekNumber;
        currentStartLabel = day.date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short'
        }).toUpperCase();
        currentCount = 1;
      } else {
        currentCount++;
      }

      if (index === this.timelineDays.length - 1) {
        weeks.push({
          weekNumber: currentWeekNumber,
          startLabel: currentStartLabel,
          width: currentCount * this.dayWidth
        });
      }
    });

    return weeks;
  }

  trackTimelineDay(index: number): number {
    return index;
  }

  trackBaseline(index: number, baseline: { id: number }): number {
  return baseline.id;
  }

  getTodayLineLeft(): number {
    return this.getLeftFromDate(this.getTodayDateString());
  }

  getTodayDateString(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  getBarLeft(task: GmProjectScheduleTask): number {
    return this.getLeftFromDate(task.plannedStart);
  }

  getBarWidth(task: GmProjectScheduleTask): number {
    return this.getWidthFromDates(task.plannedStart, task.plannedEnd, task.taskType);
  }

  getBaselineLeft(task: GmProjectScheduleTask): number {
    return this.getLeftFromDate(task.baselineStart ?? task.plannedStart);
  }

  getBaselineWidth(task: GmProjectScheduleTask): number {
    return this.getWidthFromDates(
      task.baselineStart ?? task.plannedStart,
      task.baselineEnd ?? task.plannedEnd,
      task.taskType
    );
  }

  getActualLeft(task: GmProjectScheduleTask): number {
    return this.getLeftFromDate(task.actualStart);
  }

  getActualWidth(task: GmProjectScheduleTask): number {
    return this.getWidthFromDates(task.actualStart, task.actualEnd, task.taskType);
  }

  hasBaseline(task: GmProjectScheduleTask): boolean {
    return !!task.baselineStart && !!task.baselineEnd;
  }

  hasActualDates(task: GmProjectScheduleTask): boolean {
    return !!task.actualStart && !!task.actualEnd;
  }

  getEditableValue(task: GmProjectScheduleTask, field: keyof GmProjectScheduleTask): any {
    const edited = this.editedRows[task.id];
    const value = edited && field in edited ? edited[field] : task[field];
    return value ?? '';
  }

  updateInlineField(task: GmProjectScheduleTask, field: keyof GmProjectScheduleTask, value: any): void {
    if (!this.editedRows[task.id]) {
      this.editedRows[task.id] = {};
    }

    this.editedRows[task.id][field] = value;
    (task as any)[field] = value;
  }

  saveInlineTask(task: GmProjectScheduleTask): void {
    const payload: GmUpdateProjectTaskRequest = {
      name: task.name ?? '',
      description: task.description ?? '',
      durationDays: task.durationDays ?? 0,
      baselineStart: task.baselineStart ?? undefined,
      baselineEnd: task.baselineEnd ?? undefined,
      plannedStart: task.plannedStart ?? undefined,
      plannedEnd: task.plannedEnd ?? undefined,
      actualStart: task.actualStart ?? undefined,
      actualEnd: task.actualEnd ?? undefined,
      percentComplete: task.percentComplete ?? 0,
      allocationPercent: task.allocationPercent ?? undefined,
      priority: task.priority ?? 0,
      scheduleMode: task.scheduleMode ?? 'AUTO',
      status: task.status ?? undefined,
      color: task.color ?? undefined,
      taskType: task.taskType ?? 'ACTIVITY',
      wbsCode: task.wbsCode ?? '',
      departmentCode: task.departmentCode ?? '',
      resourceType: task.resourceType ?? undefined,
      active: task.active ?? true,
      displayOrder: task.displayOrder ?? 0,
      customerMilestone: task.customerMilestone ?? false,
      assignedUserId: task.assignedUserId ?? undefined
    };

    this.service.updateTask(task.id, payload).subscribe({
      next: (updated) => {
        const index = this.tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
          this.tasks[index] = {
            ...this.tasks[index],
            ...updated
          };
          this.computeStats();
          this.buildTimeline();
          this.syncSelectedTaskReference();
        }
      },
      error: err => console.error('Failed to update inline task', err)
    });
  }

  canDragTask(task: GmProjectScheduleTask): boolean {
    return !this.isSummary(task) && !this.isMilestone(task) && !!task.plannedStart && !!task.plannedEnd;
  }

  startBarDrag(event: MouseEvent, task: GmProjectScheduleTask): void {
    if (event.button !== 0) return;
    if (!this.canDragTask(task)) return;

    event.stopPropagation();
    event.preventDefault();

    this.dragState = {
      taskId: task.id,
      startClientX: event.clientX,
      originalPlannedStart: task.plannedStart ?? null,
      originalPlannedEnd: task.plannedEnd ?? null,
      deltaDays: 0
    };

    document.body.classList.add('resizing-pane');

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.dragState || this.dragState.taskId !== task.id) return;

      const deltaX = moveEvent.clientX - this.dragState.startClientX;
      const deltaDays = Math.round(deltaX / this.dayWidth);

      if (deltaDays === this.dragState.deltaDays) return;

      this.dragState.deltaDays = deltaDays;

      const newStart = this.addDaysToDateString(this.dragState.originalPlannedStart!, deltaDays);
      const newEnd = this.addDaysToDateString(this.dragState.originalPlannedEnd!, deltaDays);
      const clamped = this.clampDragDates(task, newStart, newEnd);

      task.plannedStart = clamped.start;
      task.plannedEnd = clamped.end;

      if (this.selectedTask?.id === task.id) {
        this.selectedTask = task;
        this.taskForm.patchValue({
          plannedStart: task.plannedStart,
          plannedEnd: task.plannedEnd
        }, { emitEvent: false });
      }

      this.buildTimeline();
    };

    const onMouseUp = () => {
      document.body.classList.remove('resizing-pane');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (!this.dragState) return;

      const changed =
        task.plannedStart !== this.dragState.originalPlannedStart ||
        task.plannedEnd !== this.dragState.originalPlannedEnd;

      this.dragState = null;

      if (changed) {
        this.pushHistory();
        this.saveDraggedTask(task);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  private saveDraggedTask(task: GmProjectScheduleTask): void {
    const payload: GmUpdateProjectTaskRequest = {
      name: task.name ?? '',
      description: task.description ?? '',
      durationDays: task.durationDays ?? 0,
      baselineStart: task.baselineStart ?? undefined,
      baselineEnd: task.baselineEnd ?? undefined,
      plannedStart: task.plannedStart ?? undefined,
      plannedEnd: task.plannedEnd ?? undefined,
      actualStart: task.actualStart ?? undefined,
      actualEnd: task.actualEnd ?? undefined,
      percentComplete: task.percentComplete ?? 0,
      allocationPercent: task.allocationPercent ?? undefined,
      priority: task.priority ?? 0,
      taskType: task.taskType ?? 'ACTIVITY',
      wbsCode: task.wbsCode ?? '',
      departmentCode: task.departmentCode ?? '',
      resourceType: task.resourceType ?? undefined,
      active: task.active ?? true,
      displayOrder: task.displayOrder ?? 0,
      customerMilestone: task.customerMilestone ?? false,
      scheduleMode: task.scheduleMode ?? 'AUTO',
      status: task.status ?? undefined,
      color: task.color ?? undefined,
      assignedUserId: task.assignedUserId ?? undefined
    };

    this.service.updateTask(task.id, payload).subscribe({
      next: (updated) => {
        const index = this.tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
          this.tasks[index] = {
            ...this.tasks[index],
            ...updated
          };
          this.computeStats();
          this.buildTimeline();
          this.syncSelectedTaskReference();
        }
      },
      error: (err) => {
        console.error('Failed to save dragged task', err);
        this.loadSchedule();
      }
    });
  }

  private addDaysToDateString(dateStr: string, days: number): string {
    const d = this.toDateOnly(dateStr);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private clampDragDates(task: GmProjectScheduleTask, start: string, end: string): { start: string; end: string } {
    if (this.isMilestone(task)) {
      return { start, end: start };
    }

    const startDate = this.toDateOnly(start);
    const endDate = this.toDateOnly(end);

    if (endDate < startDate) {
      return { start, end: start };
    }

    return { start, end };
  }

  getDependencyArrows(): DependencyArrow[] {
    const arrows: DependencyArrow[] = [];
    if (!this.tasks.length) return arrows;

    const taskIndexMap = new Map<number, number>();
    const visible = this.visibleTasks;
    visible.forEach((task, index) => taskIndexMap.set(task.id, index));

    for (const successor of visible) {
      const successorIndex = taskIndexMap.get(successor.id);
      if (successorIndex == null || !successor.dependencies?.length) continue;

      for (const dep of successor.dependencies) {
        const predecessorIndex = taskIndexMap.get(dep.predecessorTaskId);
        if (predecessorIndex == null) continue;

        const predecessor = visible[predecessorIndex];
        const depType = (dep.dependencyType || 'FS').toUpperCase();

        const startX = this.getDependencyStartX(predecessor, depType);
        const endX = this.getDependencyEndX(successor, depType);
        const startY = this.getTaskAnchorY(predecessor, predecessorIndex);
        const endY = this.getTaskAnchorY(successor, successorIndex);

        const goingRight = endX >= startX;
        const elbowOffset = goingRight ? 18 : 26;
        const elbowX = goingRight ? startX + elbowOffset : startX + 18;

        const segments: DependencySegment[] = [];

        segments.push({
          direction: 'h',
          left: Math.min(startX, elbowX),
          top: startY,
          width: Math.max(8, Math.abs(elbowX - startX)),
          height: 0
        });

        if (Math.abs(endY - startY) > 0) {
          segments.push({
            direction: 'v',
            left: elbowX,
            top: Math.min(startY, endY),
            width: 0,
            height: Math.abs(endY - startY)
          });
        }

        segments.push({
          direction: 'h',
          left: Math.min(elbowX, endX),
          top: endY,
          width: Math.max(8, Math.abs(endX - elbowX)),
          height: 0
        });

        arrows.push({ segments, arrowLeft: endX - 5, arrowTop: endY - 4 });
      }
    }

    return arrows;
  }

  private getRowTop(index: number): number {
    return index * this.rowHeight;
  }

  private getTaskVisualTop(task: GmProjectScheduleTask): number {
    if (this.isMilestone(task)) return 10;
    if (this.isSummary(task)) return 14;
    return 9;
  }

  private getTaskVisualHeight(task: GmProjectScheduleTask): number {
    if (this.isMilestone(task)) return 10;
    if (this.isSummary(task)) return 4;
    return 12;
  }

  private getTaskAnchorY(task: GmProjectScheduleTask, index: number): number {
    return (index * 28) + this.getTaskVisualTop(task) + (this.getTaskVisualHeight(task) / 2);
  }

  private getTaskStartX(task: GmProjectScheduleTask): number {
    if (this.isMilestone(task)) {
      return this.getBarLeft(task) + (this.milestoneSize / 2);
    }
    return this.getBarLeft(task);
  }

  private getTaskEndX(task: GmProjectScheduleTask): number {
    if (this.isMilestone(task)) {
      return this.getBarLeft(task) + (this.milestoneSize / 2);
    }
    return this.getBarLeft(task) + this.getBarWidth(task);
  }

  private getDependencyStartX(task: GmProjectScheduleTask, type: string): number {
    return (type === 'SS' || type === 'SF')
      ? this.getTaskStartX(task)
      : this.getTaskEndX(task);
  }

  private getDependencyEndX(task: GmProjectScheduleTask, type: string): number {
    return (type === 'FF' || type === 'SF')
      ? this.getTaskEndX(task)
      : this.getTaskStartX(task);
  }

  get availablePredecessorTasks(): GmProjectScheduleTask[] {
    if (!this.selectedTask) return [];
    return this.tasks.filter(task => task.id !== this.selectedTask?.id);
  }

addDependency(): void {
  if (!this.selectedTask) return;

  const predecessorTaskId = this.newDependency.predecessorTaskId;
  if (!predecessorTaskId) return;

  if (predecessorTaskId === this.selectedTask.id) {
    console.error('A task cannot depend on itself.');
    return;
  }

  const alreadyExists = (this.selectedTask.dependencies ?? []).some(dep =>
    dep.predecessorTaskId === predecessorTaskId &&
    (dep.dependencyType || 'FS') === (this.newDependency.dependencyType || 'FS')
  );

  if (alreadyExists) {
    console.error('Dependency already exists.');
    return;
  }

  const payload: TaskDependencyDto = {
    predecessorTaskId,
    successorTaskId: this.selectedTask.id,
    dependencyType: this.newDependency.dependencyType || 'FS',
    lagDays: this.newDependency.lagDays ?? 0
  };

  this.service.createDependency(this.projectId, payload).subscribe({
    next: (created) => {
      if (this.selectedTask) {
        this.selectedTask = {
          ...this.selectedTask,
          dependencies: [...(this.selectedTask.dependencies ?? []), created]
        };
      }

      this.newDependency = {
        predecessorTaskId: null,
        dependencyType: 'FS',
        lagDays: 0
      };

      this.loadSchedule();
    },
    error: (err) => {
      console.error('Failed to create dependency', err);
    }
  });
}

  removeDependency(dependencyId?: number): void {
    if (!dependencyId) return;

    this.service.deleteDependency(this.projectId, dependencyId).subscribe({
      next: () => this.loadSchedule(),
      error: (err) => {
        console.error('Failed to delete dependency', err);
      }
    });
  }

  getSelectedAssignedUserName(): string {
    return this.selectedTask?.assignedUserName || 'No user assigned';
  }

  private syncScroll(
    source: HTMLElement,
    target: HTMLElement,
    axis: 'vertical' | 'horizontal'
  ): void {
    if (axis === 'vertical') {
      target.scrollTop = source.scrollTop;
    } else {
      target.scrollLeft = source.scrollLeft;
    }
  }

  onTableScroll(): void {
    if (!this.tableBodyScroll) return;

    const tableBodyEl = this.tableBodyScroll.nativeElement;

    // vertical sync: left body -> gantt body
    if (this.ganttBodyScroll && !this.syncingVertical) {
      this.syncingVertical = true;

      this.syncScroll(
        tableBodyEl,
        this.ganttBodyScroll.nativeElement,
        'vertical'
      );

      requestAnimationFrame(() => {
        this.syncingVertical = false;
      });
    }

    // horizontal sync: left body -> left header
    if (this.leftHeaderScroll && !this.syncingHorizontal) {
      this.syncingHorizontal = true;

      this.syncScroll(
        tableBodyEl,
        this.leftHeaderScroll.nativeElement,
        'horizontal'
      );

      requestAnimationFrame(() => {
        this.syncingHorizontal = false;
      });
    }
  }

  onGanttScroll(): void {
    if (!this.ganttBodyScroll) return;

    const ganttBodyEl = this.ganttBodyScroll.nativeElement;

    // vertical sync: gantt body -> left body
    if (this.tableBodyScroll && !this.syncingVertical) {
      this.syncingVertical = true;

      this.syncScroll(
        ganttBodyEl,
        this.tableBodyScroll.nativeElement,
        'vertical'
      );

      requestAnimationFrame(() => {
        this.syncingVertical = false;
      });
    }

    // horizontal sync: gantt body -> month header + weeks header
    if (!this.syncingHorizontal) {
      this.syncingHorizontal = true;

      if (this.monthHeaderScroll) {
        this.syncScroll(
          ganttBodyEl,
          this.monthHeaderScroll.nativeElement,
          'horizontal'
        );
      }

      if (this.timelineHeaderScroll) {
        this.syncScroll(
          ganttBodyEl,
          this.timelineHeaderScroll.nativeElement,
          'horizontal'
        );
      }

      requestAnimationFrame(() => {
        this.syncingHorizontal = false;
      });
    }
  }

  private resetScroll(): void {
    this.leftHeaderScroll?.nativeElement.scrollTo(0, 0);
    this.tableBodyScroll?.nativeElement.scrollTo(0, 0);
    this.monthHeaderScroll?.nativeElement.scrollTo(0, 0);
    this.timelineHeaderScroll?.nativeElement.scrollTo(0, 0);
    this.ganttBodyScroll?.nativeElement.scrollTo(0, 0);
  }

  get visibleColumnTemplate(): string {
    const cols: string[] = [];

    if (this.columnVisibility.id) cols.push('52px');
    if (this.columnVisibility.wbs) cols.push('70px');
    if (this.columnVisibility.customer) cols.push('56px');
    if (this.columnVisibility.name) cols.push('minmax(260px, 1.6fr)');
    if (this.columnVisibility.type) cols.push('82px');
    if (this.columnVisibility.resourceType) cols.push('95px');
    if (this.columnVisibility.department) cols.push('110px');
    if (this.columnVisibility.actualStart) cols.push('95px');
    if (this.columnVisibility.actualFinish) cols.push('95px');
    if (this.columnVisibility.duration) cols.push('70px');
    if (this.columnVisibility.progress) cols.push('80px');
    if (this.columnVisibility.predecessors) cols.push('110px');

    return cols.join(' ');
  }

  get visibleColumnMinWidth(): number {
    let total = 0;

    if (this.columnVisibility.id) total += 52;
    if (this.columnVisibility.wbs) total += 70;
    if (this.columnVisibility.customer) total += 56;
    if (this.columnVisibility.name) total += 260;
    if (this.columnVisibility.type) total += 82;
    if (this.columnVisibility.resourceType) total += 95;
    if (this.columnVisibility.department) total += 110;
    if (this.columnVisibility.actualStart) total += 95;
    if (this.columnVisibility.actualFinish) total += 95;
    if (this.columnVisibility.duration) total += 70;
    if (this.columnVisibility.progress) total += 80;
    if (this.columnVisibility.predecessors) total += 110;

    return total;
  }

  private computeStats(): void {
    this.stats.total = this.tasks.length;
    this.stats.milestones = this.tasks.filter(t => this.isMilestone(t)).length;
    this.stats.summaries = this.tasks.filter(t => this.isSummary(t)).length;

    const normalTasks = this.tasks.filter(t => !this.isSummary(t));
    const totalProgress = normalTasks.reduce((sum, t) => sum + (t.percentComplete ?? 0), 0);
    this.stats.avgProgress = normalTasks.length ? Math.round(totalProgress / normalTasks.length) : 0;
  }

  private getLeftFromDate(value?: string | null): number {
    if (!value || !this.timelineDays.length) return 0;
    const start = this.toDateOnly(value).getTime();
    const min = this.timelineDays[0].date.getTime();
    const dayDiff = Math.floor((start - min) / 86400000);
    return Math.max(0, dayDiff * this.dayWidth);
  }

  private getWidthFromDates(startValue?: string | null, endValue?: string | null, type?: string | null): number {
    if ((type || '').toUpperCase() === 'MILESTONE') return 12;
    if (!startValue || !endValue) return this.dayWidth;
    const start = this.toDateOnly(startValue).getTime();
    const end = this.toDateOnly(endValue).getTime();
    const diffDays = Math.max(1, Math.floor((end - start) / 86400000) + 1);
    return diffDays * this.dayWidth;
  }

  private toDateOnly(value: string): Date {
    const d = new Date(value);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private cloneTasks(tasks: GmProjectScheduleTask[]): GmProjectScheduleTask[] {
    return JSON.parse(JSON.stringify(tasks));
  }

  normalizeTaskType(value?: string | null): string {
    const normalized = (value ?? 'ACTIVITY').toUpperCase();
    if (normalized === 'SUMMARY') return 'SUMMARY';
    if (normalized === 'MILESTONE') return 'MILESTONE';
    return 'ACTIVITY';
  }

  formatDateForInput(value?: string | null): string {
    return value ?? '';
  }

  getTaskNameById(taskId?: number | null): string {
  if (!taskId) return '—';
  const task = this.tasks.find(t => t.id === taskId);
  return task?.name || `Task ${taskId}`;
  } 

  loadBaselines(): void {
    this.baselineService.getBaselines(this.projectId).subscribe({
      next: (res: any) => {
        console.log('RAW BASELINES RESPONSE:', res);

        const baselineArray: ProjectBaseline[] = Array.isArray(res)
          ? res
          : Array.isArray(res?.content)
            ? res.content
            : [];

        this.baselines = baselineArray.map((b: ProjectBaseline) => ({
          id: b.id,
          name: b.name,
          createdAt: b.createdAt ? new Date(b.createdAt).toLocaleString() : '',
          tasks: this.parseBaselineTasks(b.snapshotJson),
          active: false
        }));

        console.log('BASELINES AFTER MAP:', this.baselines);
      },
      error: (err) => {
        console.error('Failed to load baselines', err);
        this.baselines = [];
      }
    });
  }

  openBaselineTab(): void {
  this.settingsTab = 'baseline';
  this.loadBaselines();
  }

  private parseBaselineTasks(snapshotJson: string): GmProjectScheduleTask[] {
  try {
    const parsed = JSON.parse(snapshotJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse baseline snapshot', e);
    return [];
  }
  }

  loadCalendars(): void {
  this.calendarService.getCalendars(this.projectId).subscribe({
    next: (res) => {
      this.calendars = res ?? [];
    },
    error: (err) => {
      console.error('Failed to load calendars', err);
      this.calendars = [];
    }
  });
  }

  loadTemplates(): void {
  this.templateService.getTemplates(this.projectId).subscribe({
    next: (res: ProjectTemplate[]) => {
      this.templates = (res ?? []).map(t => ({
        id: t.id,
        name: t.name,
        scope: t.scope,
        description: t.description ?? null,
        createdAt: new Date(t.createdAt).toLocaleString(),
        tasks: this.parseTemplateTasks(t.snapshotJson)
      }));
    },
    error: (err) => {
      console.error('Failed to load templates', err);
      this.templates = [];
    }
  });
  }
  private parseTemplateTasks(snapshotJson: string): GmProjectScheduleTask[] {
  try {
    const parsed = JSON.parse(snapshotJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse template snapshot', e);
    return [];
  }
  }

  getNormalizedResourceType(task: any): string {
  return (task?.resourceType || '').toUpperCase();
  }

  getNormalizedDepartment(task: any): string {
    return (task?.departmentCode || '').toUpperCase();
  }

  getNormalizedTaskType(task: any): string {
  const raw = task?.taskType || '';
  const value = String(raw).toUpperCase();

  if (value === 'ACTIVITY' || value === 'SUMMARY' || value === 'MILESTONE') {
    return value;
  }

  return 'ACTIVITY';
  }


  getTemplateScopeLabel(): string {
    if (this.selectedTemplateScope === 'selected' && this.selectedTask) {
      return `Selected task: ${this.selectedTask.name || this.selectedTask.id}`;
    }

    return 'All tasks in project';
  }

  setTemplateScope(scope: 'all' | 'selected'): void {
  this.selectedTemplateScope = scope;

  if (scope === 'all') {
    this.selectedTemplateTaskIds.clear();
  }
}

isTemplateTaskSelected(taskId: number): boolean {
  return this.selectedTemplateTaskIds.has(taskId);
}

toggleTemplateTask(taskId: number, checked: boolean): void {
  if (checked) {
    this.selectedTemplateTaskIds.add(taskId);
  } else {
    this.selectedTemplateTaskIds.delete(taskId);
  }
}

toggleAllTemplateTasks(checked: boolean): void {
  this.selectedTemplateTaskIds.clear();

  if (checked) {
    this.visibleTasks.forEach(task => this.selectedTemplateTaskIds.add(task.id));
  }
  }

  getSelectedTemplateTasks(): GmProjectScheduleTask[] {
    return this.visibleTasks.filter(task => this.selectedTemplateTaskIds.has(task.id));
  }

  getSelectedTemplateCount(): number {
    return this.selectedTemplateTaskIds.size;
  }

  areAllVisibleTemplateTasksSelected(): boolean {
    return this.visibleTasks.length > 0 && this.visibleTasks.every(task => this.selectedTemplateTaskIds.has(task.id));
  }

  clearTemplateSelection(): void {
    this.selectedTemplateTaskIds.clear();
  }

  getCustomerFlag(task: GmProjectScheduleTask): 'Y' | 'N' {
  return task.customerMilestone ? 'Y' : 'N';
  }

  isCustomerChecked(task: GmProjectScheduleTask): boolean {
    return !!task.customerMilestone;
  }

  onCustomerFlagChange(task: GmProjectScheduleTask, checked: boolean): void {
    this.updateLocalTaskField(task, 'customerMilestone', checked);
    this.saveInlineTask(task);
  }
}