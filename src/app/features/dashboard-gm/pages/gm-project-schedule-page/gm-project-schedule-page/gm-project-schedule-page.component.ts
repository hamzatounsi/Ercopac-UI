import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild
} from '@angular/core';
import { forkJoin, of, combineLatest, Observable } from 'rxjs';
import { catchError, finalize, startWith, switchMap } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { GmProjectTimelineService } from '../../../services/gm-project-timeline.service';
import {
  GmProjectScheduleTask,
  TaskDependencyDto
} from '../../../models/gm-project-schedule-task.model';
import { GmUpdateProjectTaskRequest } from '../../../models/gm-update-project-task-request.model';
import { TaskResourceAssignment } from '../../../models/task-resource-assignment.model';
import { GmProjectBaselineService } from '../../../services/gm-project-baseline.service';
import { ProjectBaseline } from '../../../models/project-baseline.model';
import { GmProjectCalendarService } from '../../../services/gm-project-calendar.service';
import { ProjectCalendar } from '../../../models/project-calendar.model';
import { GmProjectTemplateService } from '../../../services/gm-project-template.service';
import { ProjectTemplate } from '../../../models/project-template.model';
import { ProjectTaskHistory } from '../../../models/project-task-history.model';
import { TaskConsoleConfig } from '../../../models/task-console-config.model';
import { TaskConsoleLog } from '../../../models/task-console-log.model';
import { ProjectDashboardRow } from '../../../models/project-dashboard-row.model';
import { GmDashboardService } from '../../../services/gm-dashboard.service';

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
  labelLeft: number;
  labelTop: number;
  labelText: string;
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
  private formAutoSaveTimer: any = null;
  private suppressFormAutoSave = false;

  tasks: GmProjectScheduleTask[] = [];
  selectedTask: GmProjectScheduleTask | null = null;

  drawerOpen = false;
  activeDetailTab: 'general' | 'predecessors' | 'resources' | 'history' | 'console' = 'general';
  taskForm!: FormGroup;

  timelineDays: TimelineDay[] = [];
  dayWidth = 40;

  project: ProjectDashboardRow | null = null;

resourceSearchTerm = '';
filteredResourceOptions: { id: number; fullName: string; departmentCode: string; resourceType: string }[] = [];
 
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
resourceSearchResults: { id: number; fullName: string; resourceType: string; departmentCode: string }[] = [];
showResourceDropdown = false;
  readonly taskTypes = ['ACTIVITY', 'SUMMARY', 'MILESTONE'];
 departmentCodes: string[] = [];
  resourceTypes: string[] = [];

  settingsOpen = false;
  settingsTab: 'templates' | 'calendar' | 'baseline' = 'templates';

  history: GmProjectScheduleTask[][] = [];
  future: GmProjectScheduleTask[][] = [];

  templateName = '';
  selectedTemplateScope: 'all' | 'selected' = 'all';
  selectedTemplateTaskIds = new Set<number>();
  templateDescription = '';
  actionsCount = 0;

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
  baselines: ProjectBaseline[] = [];

  dependencyTypes = ['FS', 'SS', 'FF', 'SF'];

  newDependency = {
    predecessorTaskId: null as number | null,
    dependencyType: 'FS',
    lagDays: 0
  };

  newSupplier: any = {
    resourceType: 'SUPPLIER',
    assignmentName: '',
    quantity: 1,
    unitsPercent: 100,
    cost: 0,
    assignedUserId: null
  };

resourceOptions: { id: number; fullName: string; departmentCode: string; resourceType: string }[] = [];

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

  exportModalOpen = false;
  exportScope: 'ALL' | 'CUSTOMER_NO' = 'ALL';

  taskHistory: ProjectTaskHistory[] = [];
  historyLoading = false;

  dragState: {
    taskId: number;
    startClientX: number;
    originalStart: string | null;
    originalEnd: string | null;
    mode: 'baseline' | 'actual';
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

  consoleConfig: TaskConsoleConfig | null = null;
  consoleLogs: TaskConsoleLog[] = [];
  consoleLoading = false;

  // Context menu
  contextMenuOpen = false;
  contextMenuX = 0;
  contextMenuY = 0;
  contextMenuTask: GmProjectScheduleTask | null = null;
  projectName = '';


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private service: GmProjectTimelineService,
    private baselineService: GmProjectBaselineService,
    private calendarService: GmProjectCalendarService,
    private projectTimelineService: GmProjectTimelineService,
    private templateService: GmProjectTemplateService,
    private gmDashboardService: GmDashboardService
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.initForm();
    this.setupTaskFormAutoCalculations();
    this.loadSchedule();
    this.loadResourceOptions();
    this.loadProjectName();

    const savedWidth = localStorage.getItem('gmScheduleLeftPaneWidth');
    if (savedWidth) {
      this.leftPaneWidth = Number(savedWidth);
    }
  }

  onNewResourceTypeChange(resourceType: string): void {
    this.newResource.resourceType = resourceType;
    this.newResource.assignedUserId = null;
    this.newResource.assignmentName = '';

    // Only filter if user explicitly selected a type
    if (resourceType && resourceType !== 'ALL') {
      this.filterResources();
    } else {
      this.filteredResourceOptions = [...this.resourceOptions];
    }
  }
  
  onResourceSearch(): void {
    this.filterResources();
  }
 private filterResources(): void {
    let filtered = [...this.resourceOptions];

    // ONLY apply resource type filtering
    // if a resource type was manually selected
    // by the user in the assignment form

    const selectedType = (this.newResource.resourceType ?? '').trim().toUpperCase();

    if (selectedType && selectedType !== 'ALL') {
      filtered = filtered.filter(u =>
        (u.resourceType ?? '').toUpperCase() === selectedType
      );
    }

    // Search term filter
    const term = (this.resourceSearchTerm ?? '').trim().toLowerCase();

    if (term) {
      filtered = filtered.filter(u =>
        (u.fullName ?? '').toLowerCase().includes(term) ||
        (u.resourceType ?? '').toLowerCase().includes(term) ||
        (u.departmentCode ?? '').toLowerCase().includes(term)
      );
    }

    this.filteredResourceOptions = filtered;
  }
 
  ngAfterViewInit(): void {}

  @HostListener('document:keydown', ['$event'])
  handleDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.contextMenuOpen) {
      this.closeContextMenu();
    }
  }

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

        this.tasks.forEach(task => this.normalizeTaskDates(task));
        this.recalculateWbsCodes();
        this.recalculateSummaryDates();
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
            this.patchTaskForm(refreshed);
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

  private toFormValue(task: GmProjectScheduleTask) {
    const baselineStart = task.baselineStart ?? task.plannedStart ?? '';
    const baselineEnd = task.baselineEnd ?? task.plannedEnd ?? '';

    return {
      name: task.name ?? '',
      description: task.description ?? '',
      durationDays: this.calculateDurationDays(baselineStart, baselineEnd, this.isMilestone(task)),
      baselineStart,
      baselineEnd,
      plannedStart: baselineStart,
      plannedEnd: baselineEnd,
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

  private patchTaskForm(task: GmProjectScheduleTask): void {
    this.normalizeTaskDates(task);
    this.suppressFormAutoSave = true;
    this.taskForm.patchValue(this.toFormValue(task), { emitEvent: false });
    this.suppressFormAutoSave = false;
  }

  private calculateDurationDays(
    start?: string | null,
    end?: string | null,
    milestone = false
  ): number {
    if (milestone) return 0;
    if (!start || !end) return 1;

    const startDate = this.toDateOnly(start);
    const endDate = this.toDateOnly(end);

    return Math.max(
      1,
      Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1
    );
  }

  private normalizeTaskDates(task: GmProjectScheduleTask): void {
  task.baselineStart = task.baselineStart ?? task.plannedStart ?? undefined;
  task.baselineEnd = task.baselineEnd ?? task.plannedEnd ?? task.baselineStart ?? undefined;

  task.plannedStart = task.plannedStart ?? task.baselineStart ?? undefined;
  task.plannedEnd = task.plannedEnd ?? task.baselineEnd ?? task.plannedStart ?? undefined;

  if (this.isMilestone(task)) {
    task.durationDays = 0;

    if (task.baselineStart) task.baselineEnd = task.baselineStart;
    if (task.plannedStart) task.plannedEnd = task.plannedStart;
    if (task.actualStart) task.actualEnd = task.actualStart;
  } else {
    task.durationDays = this.calculateDurationDays(
      task.plannedStart ?? task.baselineStart,
      task.plannedEnd ?? task.baselineEnd,
      false
    );
  }
}

openTaskDrawer(task: GmProjectScheduleTask): void {
  this.closeContextMenu();
  this.normalizeTaskDates(task);
  this.selectedTask = task;
  this.drawerOpen = true;
  this.activeDetailTab = 'general';
  this.patchTaskForm(task);
  this.newDependency = { predecessorTaskId: null, dependencyType: 'FS', lagDays: 0 };
  this.newResource = {
    resourceType: task.resourceType || '',
    assignmentName: '',
    quantity: 1,
    unitsPercent: 100,
    cost: 0,
    assignedUserId: null
  };
  this.resourceSearchTerm = '';
  this.filteredResourceOptions = [...this.resourceOptions];

  if (this.selectedTemplateScope === 'selected' && !task) {
    this.selectedTemplateScope = 'all';
  }

  this.loadTaskResources(task.id);
}

  closeDrawer(): void {
    this.drawerOpen = false;
    this.selectedTask = null;
    this.taskResources = [];
    this.newDependency = { predecessorTaskId: null, dependencyType: 'FS', lagDays: 0 };
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

  // ---------------- Context menu ----------------

  openContextMenu(event: MouseEvent, task: GmProjectScheduleTask): void {
    event.preventDefault();
    event.stopPropagation();

    this.selectedTask = task;
    this.contextMenuTask = task;

    const menuWidth = 250;
    const menuHeight = 330;
    const padding = 12;

    let x = event.clientX;
    let y = event.clientY;

    if (x + menuWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuWidth - padding;
    }

    if (y + menuHeight > window.innerHeight - padding) {
      y = window.innerHeight - menuHeight - padding;
    }

    this.contextMenuX = Math.max(padding, x);
    this.contextMenuY = Math.max(padding, y);
    this.contextMenuOpen = true;
  }

  closeContextMenu(): void {
    this.contextMenuOpen = false;
    this.contextMenuTask = null;
  }

  loadActionsSummary(): void {
    if (!this.projectId) return;

    this.projectTimelineService.getActionsSummary(this.projectId).subscribe({
      next: (res: any) => {
        this.actionsCount = res.total || 0;
      },
      error: (err: any) => console.error(err)
    });
  }

  createActionFromTask(): void {
    if (!this.contextMenuTask || !this.projectId) return;

    const task = this.contextMenuTask;

    const payload = {
      title: task.name,
      description: task.description || '',
      actionType: 'action',
      departmentCode: task.departmentCode || '',
      priority: this.mapTaskPriority(task.priority),
      status: 'todo',
      customerVisible: false,
      insertedDate: this.getTodayDateString(),
      dueDate: task.baselineEnd || task.baselineStart || task.plannedEnd || task.plannedStart || null,
      assignees: task.assignedUserName ? [task.assignedUserName] : []
    };

    this.projectTimelineService.createAction(this.projectId, payload).subscribe({
      next: () => {
        this.closeContextMenu();
        this.loadActionsSummary();
        alert('Action created successfully');
      },
      error: (error) => {
        console.error(error);
        alert('Failed to create action');
      }
    });
  }

  private mapTaskPriority(value?: number | null): string {
    if (value == null) return 'medium';
    if (value <= 200) return 'high';
    if (value <= 600) return 'medium';
    return 'low';
  }

  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  editTaskFromContext(): void {
    if (!this.contextMenuTask) return;
    this.openTaskDrawer(this.contextMenuTask);
    this.closeContextMenu();
  }

  indentTask(): void {
  if (!this.selectedTask) return;
  const index = this.tasks.findIndex(t => t.id === this.selectedTask!.id);
  if (index <= 0) return;
 
  const current  = this.tasks[index];
  const previous = this.tasks[index - 1];
 
  const currentLevel  = this.getWbsLevel(current);
  const previousLevel = this.getWbsLevel(previous);
 
  // Can only indent one level under the previous task
  if (currentLevel > previousLevel) return;
 
  this.pushHistory();
 
  // Set real parentId
  current.parentId     = previous.id;
  current.outlineLevel = previousLevel + 1;
 
  // Also move all subtree children
  const subtree = this.getSubtree(current).filter(t => t.id !== current.id);
  subtree.forEach(t => {
    t.outlineLevel = (t.outlineLevel ?? 1) + 1;
  });
 
  this.recalculateWbsCodes();
  this.recalculateDisplayOrders();
  this.recalculateSummaryDates();
  this.persistScheduleStructure();
  this.syncSelectedTaskReference();
}
 
outdentTask(): void {
  if (!this.selectedTask) return;
  const current = this.tasks.find(t => t.id === this.selectedTask!.id);
  if (!current || this.getWbsLevel(current) <= 1) return;
 
  this.pushHistory();
 
  // Find current parent to get grandparent
  const currentParent = current.parentId
    ? this.tasks.find(t => t.id === current.parentId)
    : null;
 
  // Set parentId to grandparent (or null if going to root)
  current.parentId     = currentParent?.parentId ?? null;
  current.outlineLevel = Math.max(1, (current.outlineLevel ?? 1) - 1);
 
  // Move subtree children too
  const subtree = this.getSubtree(current).filter(t => t.id !== current.id);
  subtree.forEach(t => {
    t.outlineLevel = Math.max(1, (t.outlineLevel ?? 1) - 1);
  });
 
  this.recalculateWbsCodes();
  this.recalculateDisplayOrders();
  this.recalculateSummaryDates();
  this.persistScheduleStructure();
  this.syncSelectedTaskReference();
}
 indentTaskFromContext(): void {
  if (!this.contextMenuTask) return;
  this.selectedTask = this.contextMenuTask;
  this.indentTask();
  this.closeContextMenu();
}

  outdentTaskFromContext(): void {
    if (!this.contextMenuTask) return;
    this.selectedTask = this.contextMenuTask;
    this.outdentTask();
    this.closeContextMenu();
  }

  insertTaskBelowContext(): void {
    if (!this.contextMenuTask) return;

    const source = this.contextMenuTask;

    const payload = {
      name: 'New Task',
      description: '',
      durationDays: 1,
      baselineStart: source.baselineStart || source.plannedStart || this.getTodayDateString(),
      baselineEnd: source.baselineStart || source.plannedStart || this.getTodayDateString(),
      plannedStart: source.baselineStart || source.plannedStart || this.getTodayDateString(),
      plannedEnd: source.baselineStart || source.plannedStart || this.getTodayDateString(),
      percentComplete: 0,
      priority: 500,
      scheduleMode: 'AUTO',
      active: true
    };

    this.service.insertTaskBelow(this.projectId, source.id, payload).subscribe({
      next: (created) => {
        this.closeContextMenu();
        this.loadSchedule();
        this.selectedTask = created;
      },
      error: (err) => {
        console.error('Failed to insert task below', err);
      }
    });
  }

copyTaskBelowContext(): void {
  if (!this.contextMenuTask) return;
 
  const source = this.contextMenuTask;
  this.closeContextMenu();
 
  // Call the dedicated copy endpoint — copies full subtree with hierarchy
  this.service.copyTaskBelow(this.projectId, source.id).subscribe({
    next: (created) => {
      this.loadSchedule();
      setTimeout(() => {
        const savedCopy = this.tasks.find(t => t.id === created.id) ?? created;
        this.selectedTask = savedCopy;
        this.openTaskDrawer(savedCopy);
      }, 300);
    },
    error: (err) => {
      console.error('Failed to copy task below', err);
      alert('Failed to copy task below');
    }
  });
}
 



















































































































































































  deleteTaskFromContext(): void {
    if (!this.contextMenuTask) return;

    const confirmed = window.confirm(`Delete task "${this.contextMenuTask.name}"?`);
    if (!confirmed) return;

    const taskId = this.contextMenuTask.id;

    this.service.deleteTask(taskId).subscribe({
      next: () => {
        if (this.selectedTask?.id === taskId) {
          this.closeDrawer();
        }
        this.closeContextMenu();
        this.loadSchedule();
      },
      error: (err) => {
        console.error('Failed to delete task', err);
      }
    });
  }

  private createFrontendTask(partial?: Partial<GmProjectScheduleTask>): GmProjectScheduleTask {
    return {
      id: this.generateFrontendTaskId(),
      name: partial?.name ?? 'New Task',
      description: partial?.description ?? '',
      durationDays: partial?.durationDays ?? 1,
      baselineStart: partial?.baselineStart ?? partial?.plannedStart ?? this.getTodayDateString(),
      baselineEnd: partial?.baselineEnd ?? partial?.plannedEnd ?? partial?.plannedStart ?? this.getTodayDateString(),
      plannedStart: partial?.baselineStart ?? partial?.plannedStart ?? this.getTodayDateString(),
      plannedEnd: partial?.baselineEnd ?? partial?.plannedEnd ?? partial?.plannedStart ?? this.getTodayDateString(),
      actualStart: partial?.actualStart ?? undefined,
      actualEnd: partial?.actualEnd ?? undefined,
      percentComplete: partial?.percentComplete ?? 0,
      allocationPercent: partial?.allocationPercent ?? 100,
      priority: partial?.priority ?? 500,
      taskType: partial?.taskType ?? 'ACTIVITY',
      wbsCode: partial?.wbsCode ?? '',
      departmentCode: partial?.departmentCode ?? '',
      resourceType: partial?.resourceType ?? '',
      active: partial?.active ?? true,
      displayOrder: partial?.displayOrder ?? this.tasks.length + 1,
      customerMilestone: partial?.customerMilestone ?? false,
      scheduleMode: partial?.scheduleMode ?? 'AUTO',
      status: partial?.status ?? '',
      color: partial?.color ?? '',
      assignedUserId: partial?.assignedUserId ?? null,
      assignedUserName: partial?.assignedUserName ?? '',
      dependencies: partial?.dependencies ?? []
    } as GmProjectScheduleTask;
  }

  private generateFrontendTaskId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  private cloneTask(task: GmProjectScheduleTask): GmProjectScheduleTask {
    return JSON.parse(JSON.stringify(task));
  }

  // ---------------- Menu / filters ----------------

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
    const order: Array<'2W' | '2M' | '1M' | 'Day'> = ['2W', '2M', '1M', 'Day'];
    const index = order.indexOf(this.activeZoom as '2W' | '2M' | '1M' | 'Day');
    if (index > 0) {
      this.setZoom(order[index - 1]);
    }
  }

  zoomIn(): void {
    const order: Array<'2W' | '2M' | '1M' | 'Day'> = ['2W', '2M', '1M', 'Day'];
    const index = order.indexOf(this.activeZoom as '2W' | '2M' | '1M' | 'Day');
    if (index < order.length - 1) {
      this.setZoom(order[index + 1]);
    }
  }

  setMode(mode: 'baseline' | 'actual'): void {
    this.activeMode = mode;

    if (this.selectedTask) {
      this.patchTaskForm(this.selectedTask);
    }

    this.buildTimeline();
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

  // ---------------- Inline edit ----------------

  updateLocalTaskField(task: GmProjectScheduleTask, field: keyof GmProjectScheduleTask, value: any): void {
    (task as any)[field] = value;

    if (field === 'taskType' && String(value).toUpperCase() === 'MILESTONE') {
      task.durationDays = 0;
      if (task.baselineStart) task.baselineEnd = task.baselineStart;
      if (task.actualStart) task.actualEnd = task.actualStart;
    }

    if (field === 'baselineStart' || field === 'baselineEnd' || field === 'durationDays' || field === 'taskType') {
      if (field === 'durationDays' && task.baselineStart && !this.isMilestone(task)) {
        const duration = Math.max(1, Number(value || 1));
        task.baselineEnd = this.addDaysToDateString(task.baselineStart, duration - 1);
      }

      this.normalizeTaskDates(task);
    }

    if (field === 'actualStart' && this.isMilestone(task)) {
      task.actualEnd = task.actualStart;
    }

    this.computeStats();
    this.buildTimeline();

    if (this.selectedTask?.id === task.id) {
      this.selectedTask = task;
      this.patchTaskForm(task);
    }

    this.queueTaskAutoSave(task);
  }

  private queueTaskAutoSave(task: GmProjectScheduleTask): void {
    clearTimeout(this.formAutoSaveTimer);
    this.formAutoSaveTimer = setTimeout(() => this.saveInlineTask(task), 600);
  }

  getPredecessorText(task: GmProjectScheduleTask): string {
    if (!task.dependencies?.length) return '—';

    return task.dependencies
      .map(dep => {
        const type = dep.dependencyType || 'FS';
        const lag = dep.lagDays ?? 0;
        const lagText = lag === 0 ? '' : lag > 0 ? `+${lag}d` : `${lag}d`;

        return `${dep.predecessorTaskId}${type}${lagText}`;
      })
      .join(', ');
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

  saveTask(): void {
    if (!this.selectedTask || this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const value = this.taskForm.value;

    if (value.baselineStart && value.baselineEnd && value.baselineEnd < value.baselineStart) return;
    if (value.actualStart && value.actualEnd && value.actualEnd < value.actualStart) return;

    Object.assign(this.selectedTask, value);
    this.normalizeTaskDates(this.selectedTask);

    this.pushHistory();
    this.saving = true;

    const payload = this.buildTaskUpdatePayload(this.selectedTask);

    this.service.updateTask(this.projectId, this.selectedTask.id, payload).subscribe({
      next: (updated) => {
        const index = this.tasks.findIndex(t => t.id === this.selectedTask!.id);

        if (index !== -1) {
          this.tasks[index] = { ...this.tasks[index], ...updated };
          this.normalizeTaskDates(this.tasks[index]);
          this.selectedTask = this.tasks[index];
        }

        this.saving = false;
        this.computeStats();
        this.buildTimeline();
        this.syncSelectedTaskReference();
      },
      error: (err) => {
        console.error('Failed to update task', err);
        this.saving = false;
        this.loadSchedule();
      }
    });
  }

  saveInlineTask(task: GmProjectScheduleTask): void {
    this.normalizeTaskDates(task);

    const payload = this.buildTaskUpdatePayload(task);

    this.service.updateTask(this.projectId, task.id, payload).subscribe({
      next: (updated) => {
        const index = this.tasks.findIndex(t => t.id === task.id);

        if (index !== -1) {
          this.tasks[index] = { ...this.tasks[index], ...updated };
          this.normalizeTaskDates(this.tasks[index]);
        }

        this.refreshScheduleUi();
        this.editedRows[task.id] = {};
      },
      error: err => {
        console.error('Failed to autosave task', err);
        this.loadSchedule();
      }
    });
  }

  private saveDraggedTask(task: GmProjectScheduleTask): void {
    if (this.activeMode === 'baseline') {
      this.normalizeTaskDates(task);
    } else if (this.isMilestone(task) && task.actualStart) {
      task.actualEnd = task.actualStart;
    }

    const payload = this.buildTaskUpdatePayload(task);

    this.service.updateTask(this.projectId, task.id, payload).subscribe({
      next: () => this.loadSchedule(),
      error: err => {
        console.error('Failed to save dragged task', err);
        this.loadSchedule();
      }
    });
  }
  
  
 
  // ---------------- History ----------------

  private pushHistory(): void {
    this.history.push(this.cloneTasks(this.tasks));
    if (this.history.length > 50) {
      this.history.shift();
    }
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
      this.patchTaskForm(refreshed);
    }
  }

  // ---------------- Import / export ----------------

  exportScheduleJson(): void {
    const payload = {
      projectId: this.projectId,
      exportedAt: new Date().toISOString(),
      tasks: this.tasks
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });

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

        const importedTasks: GmProjectScheduleTask[] = Array.isArray(parsed)
          ? parsed
          : parsed.tasks;

        if (!Array.isArray(importedTasks) || importedTasks.length === 0) {
          alert('Invalid schedule file');
          return;
        }

        this.saving = true;

        const payload = importedTasks.map((task, index) => {
          const baselineStart = task.baselineStart ?? task.plannedStart;
          const baselineEnd = task.baselineEnd ?? task.plannedEnd ?? baselineStart;

          return this.buildTaskUpdatePayload({
            ...task,
            id: task.id ?? 0,
            projectId: this.projectId,
            displayOrder: task.displayOrder ?? index + 1,
            baselineStart,
            baselineEnd,
            plannedStart: baselineStart,
            plannedEnd: baselineEnd
          });
        });

        this.service.importSchedule(this.projectId, payload).subscribe({
          next: () => {
            this.saving = false;
            this.loadSchedule();
          },
          error: err => {
            this.saving = false;
            console.error('Import failed', err);
            alert('Import failed');
          }
        });
      } catch (error) {
        this.saving = false;
        console.error('Invalid JSON', error);
        alert('Invalid JSON file');
      } finally {
        input.value = '';
      }
    };

    reader.readAsText(file);
  }


  private refreshScheduleUi(): void {
    this.tasks.forEach(task => this.normalizeTaskDates(task));
    this.computeStats();
    this.buildTimeline();
    this.syncSelectedTaskReference();
  }

  // ---------------- WBS / indent ----------------

// ---------------- WBS / indent ----------------

  private getTaskLevel(task: GmProjectScheduleTask): number {
    return Math.max(1, (task.wbsCode || '1').split('.').length);
  }

  private isDescendantOf(task: GmProjectScheduleTask, parent: GmProjectScheduleTask): boolean {
    if (!task.wbsCode || !parent.wbsCode) return false;
    return task.wbsCode.startsWith(parent.wbsCode + '.');
  }

  private getSubtree(task: GmProjectScheduleTask): GmProjectScheduleTask[] {
    return this.tasks.filter(t => t.id === task.id || this.isDescendantOf(t, task));
  }


   
private recalculateWbsCodes(): void {
  // Use parentId tree — much more reliable than string parsing
  const counters = new Map<string, number>();
 
  for (const task of this.tasks) {
    const parentKey = task.parentId != null ? String(task.parentId) : 'root';
    const count = (counters.get(parentKey) ?? 0) + 1;
    counters.set(parentKey, count);
 
    if (task.parentId == null) {
      task.wbsCode     = String(count);
      task.outlineLevel = 1;
    } else {
      const parent = this.tasks.find(t => t.id === task.parentId);
      task.wbsCode     = parent?.wbsCode ? `${parent.wbsCode}.${count}` : String(count);
      task.outlineLevel = (task.wbsCode?.split('.').length) ?? 1;
    }
  }
}

  private recalculateDisplayOrders(): void {
    this.tasks.forEach((task, index) => {
      task.displayOrder = index + 1;
    });
  }

  private recalculateSummaryDates(): void {
  const summaries = [...this.tasks]
    .filter(t => this.isSummary(t))
    .sort((a, b) => this.getTaskLevel(b) - this.getTaskLevel(a));

  summaries.forEach(summary => {
    const children = this.tasks.filter(t =>
      this.isDescendantOf(t, summary) && !this.isSummary(t)
    );

    if (!children.length) return;

    const baselineStarts = children
      .map(t => t.baselineStart ?? t.plannedStart)
      .filter((d): d is string => !!d);

    const baselineEnds = children
      .map(t => t.baselineEnd ?? t.plannedEnd)
      .filter((d): d is string => !!d);

    const actualStarts = children
      .map(t => t.actualStart)
      .filter((d): d is string => !!d);

    const actualEnds = children
      .map(t => t.actualEnd)
      .filter((d): d is string => !!d);

    if (baselineStarts.length) summary.baselineStart = baselineStarts.sort()[0];
    if (baselineEnds.length) summary.baselineEnd = baselineEnds.sort()[baselineEnds.length - 1];
    if (actualStarts.length) summary.actualStart = actualStarts.sort()[0];
    if (actualEnds.length) summary.actualEnd = actualEnds.sort()[actualEnds.length - 1];

    this.normalizeTaskDates(summary);
  });
}

private persistScheduleStructure(): void {
  const requests = this.tasks.map(task =>
    this.service.updateTask(this.projectId, task.id, this.buildTaskUpdatePayload(task))
  );

  forkJoin(requests).subscribe({
    next: () => {
      this.computeStats();
      this.buildTimeline();
      this.syncSelectedTaskReference();
    },
    error: err => {
      console.error('Failed to persist WBS structure', err);
      this.loadSchedule();
    }
  });
}

getRowId(task?: GmProjectScheduleTask | null): string {
  if (!task) return '—';
  return String(task.displayOrder ?? task.id);
}
  // ---------------- Settings ----------------

  toggleSettings(): void {
    this.settingsOpen = !this.settingsOpen;
  }

  closeSettingsOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('settings-overlay')) {
      this.settingsOpen = false;
    }
  }

  // ---------------- Resize ----------------

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

  // ---------------- Templates ----------------

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

  // ---------------- Calendars ----------------

  createDefaultCalendar(): void {
    const payload = {
      name: 'Standard 5-day Week',
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
    const map: Record<number, string> = {
      1: 'Mon',
      2: 'Tue',
      3: 'Wed',
      4: 'Thu',
      5: 'Fri',
      6: 'Sat',
      0: 'Sun'
    };

    return days.map(d => map[d]).join('-');
  }

  // ---------------- Baselines ----------------



  

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

  openBaselineTab(): void {
    this.settingsTab = 'baseline';
    this.loadBaselines();
  }

  // ---------------- Task type helpers ----------------

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

  // ---------------- Timeline ----------------

  private buildTimeline(): void {
    const dates: Date[] = [];

    this.tasks.forEach(task => {
      const baselineStart = task.baselineStart ?? task.plannedStart;
      const baselineEnd = task.baselineEnd ?? task.plannedEnd;

      if (baselineStart) dates.push(this.toDateOnly(baselineStart));
      if (baselineEnd) dates.push(this.toDateOnly(baselineEnd));
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
      const label = day.date.toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric'
      });

      if (key !== currentKey) {
        if (currentCount > 0) {
          months.push({
            label: currentLabel,
            width: currentCount * this.dayWidth
          });
        }
        currentKey = key;
        currentLabel = label;
        currentCount = 1;
      } else {
        currentCount++;
      }

      if (index === this.timelineDays.length - 1) {
        months.push({
          label: currentLabel,
          width: currentCount * this.dayWidth
        });
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


  getTodayLineLeft(): number {
    return this.getLeftFromDate(this.getTodayDateString());
  }


  getBarLeft(task: GmProjectScheduleTask): number {
    if (this.activeMode === 'actual') {
      return this.getLeftFromDate(task.actualStart ?? task.plannedStart);
    }

    return this.getLeftFromDate(task.plannedStart);
  }

  getBarWidth(task: GmProjectScheduleTask): number {
    if (this.activeMode === 'actual') {
      return this.getWidthFromDates(
        task.actualStart ?? task.plannedStart,
        task.actualEnd ?? task.plannedEnd,
        task.taskType
      );
    }

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
    return !!(task.baselineStart ?? task.plannedStart) && !!(task.baselineEnd ?? task.plannedEnd);
  }

  hasActualDates(task: GmProjectScheduleTask): boolean {
    return !!task.actualStart && !!task.actualEnd;
  }

  // ---------------- Drag ----------------

  canDragTask(task: GmProjectScheduleTask): boolean {
    return !this.isSummary(task) && !this.isMilestone(task) && !!task.plannedStart && !!task.plannedEnd;
  }

  startBarDrag(event: MouseEvent, task: GmProjectScheduleTask): void {
    if (event.button !== 0) return;
    if (!this.canDragTask(task)) return;

    event.stopPropagation();
    event.preventDefault();

    const startField = this.activeMode === 'actual' ? 'actualStart' : 'baselineStart';
    const endField = this.activeMode === 'actual' ? 'actualEnd' : 'baselineEnd';

    this.dragState = {
      taskId: task.id,
      startClientX: event.clientX,
      originalStart: (task as any)[startField] ?? null,
      originalEnd: (task as any)[endField] ?? null,
      deltaDays: 0,
      mode: this.activeMode
    };

    if (!this.dragState.originalStart || !this.dragState.originalEnd) return;

    document.body.classList.add('resizing-pane');

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.dragState || this.dragState.taskId !== task.id) return;

      const deltaX = moveEvent.clientX - this.dragState.startClientX;
      const deltaDays = Math.round(deltaX / this.dayWidth);

      if (deltaDays === this.dragState.deltaDays) return;

      this.dragState.deltaDays = deltaDays;

      if (!this.dragState.originalStart || !this.dragState.originalEnd) {
        return;
      }

      const newStart = this.addDaysToDateString(this.dragState.originalStart, deltaDays);
      const newEnd = this.addDaysToDateString(this.dragState.originalEnd, deltaDays);
      const clamped = this.clampDragDates(task, newStart, newEnd);

      (task as any)[startField] = clamped.start;
      (task as any)[endField] = clamped.end;

      if (this.activeMode === 'baseline') {
        this.normalizeTaskDates(task);
      }

      if (this.selectedTask?.id === task.id) {
        this.selectedTask = task;
        this.patchTaskForm(task);
      }

      this.buildTimeline();
    };

    const onMouseUp = () => {
      document.body.classList.remove('resizing-pane');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (!this.dragState) return;

      const changed =
        (task as any)[startField] !== this.dragState.originalStart ||
        (task as any)[endField] !== this.dragState.originalEnd;

      this.dragState = null;

      if (changed) {
        this.pushHistory();
        this.saveDraggedTask(task);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
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

  // ---------------- Dependencies ----------------

  saveDependency(dep: TaskDependencyDto): void {
    if (!dep.id || !this.selectedTask) return;

    const payload: TaskDependencyDto = {
      id: dep.id,
      predecessorTaskId: dep.predecessorTaskId,
      successorTaskId: this.selectedTask.id,
      dependencyType: dep.dependencyType || 'FS',
      lagDays: Number(dep.lagDays ?? 0)
    };

    this.service.updateDependency(this.projectId, dep.id, payload).subscribe({
      next: () => {
        this.loadSchedule();
      },
      error: err => {
        console.error('Failed to update dependency', err);
        this.loadSchedule();
      }
    });
  }
getDependencyArrows(): DependencyArrow[] {
  const arrows: DependencyArrow[] = [];
  if (!this.tasks.length || !this.timelineDays.length) return arrows;
 
  const visible = this.visibleTasks;
  const indexMap = new Map<number, number>();
  visible.forEach((t, i) => indexMap.set(t.id, i));
  const timelineWidth = this.getTimelineWidth();
 
  for (const successor of visible) {
    const si = indexMap.get(successor.id);
    if (si == null || !successor.dependencies?.length) continue;
 
    if (!(successor.baselineStart ?? successor.plannedStart) && !(successor.baselineEnd ?? successor.plannedEnd)) continue;
 
    for (const dep of successor.dependencies) {
      const pi = indexMap.get(dep.predecessorTaskId);
      if (pi == null) continue;
 
      const predecessor = visible[pi];
      if (!(predecessor.baselineStart ?? predecessor.plannedStart) && !(predecessor.baselineEnd ?? predecessor.plannedEnd)) continue;
 
      const type = (dep.dependencyType || 'FS').toUpperCase();
 
      const startX = (type === 'SS' || type === 'SF')
        ? this.getTaskStartX(predecessor)
        : this.getTaskEndX(predecessor);
 
      const endX = (type === 'FF' || type === 'SF')
        ? this.getTaskEndX(successor)
        : this.getTaskStartX(successor);
 
      // Skip off-screen
      if (startX > timelineWidth && endX > timelineWidth) continue;
      if (startX <= 0 && endX <= 0) continue;
 
      const startY = this.getTaskAnchorY(predecessor, pi);
      const endY   = this.getTaskAnchorY(successor, si);
      const rawElbow = startX + 18;
      const elbowX   = Math.min(rawElbow, timelineWidth - 4);
      const vertH    = Math.abs(endY - startY);
 
      const segs: DependencySegment[] = [];
 
      // H1: horizontal predecessor → elbow
      segs.push({
        direction: 'h',
        left:   Math.min(startX, elbowX),
        top:    startY,
        width:  Math.max(4, Math.abs(elbowX - startX)),
        height: 2                           // ← KEY FIX: was 0
      });
 
      // V: vertical
      if (vertH > 1) {
        segs.push({
          direction: 'v',
          left:   elbowX,
          top:    Math.min(startY, endY),
          width:  2,                        // ← KEY FIX: was 0
          height: vertH
        });
      }
 
      // H2: horizontal elbow → successor
      segs.push({
        direction: 'h',
        left:   Math.min(elbowX, endX),
        top:    endY,
        width:  Math.max(4, Math.abs(endX - elbowX)),
        height: 2                           // ← KEY FIX: was 0
      });
 
      const lag = Number(dep.lagDays ?? 0);
      const lagText = lag === 0 ? '' : lag > 0 ? ` +${lag}d` : ` ${lag}d`;

      arrows.push({
        segments: segs,
        arrowLeft: endX - 5,
        arrowTop: endY - 5,
        labelLeft: Math.min(startX, endX) + Math.abs(endX - startX) / 2,
        labelTop: Math.min(startY, endY) - 16,
        labelText: `${type}${lagText}`
      });
    }
  }
  return arrows;
}

  private getTaskVisualTop(task: GmProjectScheduleTask): number {
  if (this.isMilestone(task)) return 11;
  if (this.isSummary(task)) return 14;
  return 10;
}

  private getTaskVisualHeight(task: GmProjectScheduleTask): number {
    if (this.isMilestone(task)) return 14;
    if (this.isSummary(task)) return 7;
    return 18;
  }

  private getTaskAnchorY(task: GmProjectScheduleTask, index: number): number {
    return (index * this.rowHeight)
      + this.getTaskVisualTop(task)
      + (this.getTaskVisualHeight(task) / 2);
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
    return (type === 'SS' || type === 'SF') ? this.getTaskStartX(task) : this.getTaskEndX(task);
  }

  private getDependencyEndX(task: GmProjectScheduleTask, type: string): number {
    return (type === 'FF' || type === 'SF') ? this.getTaskEndX(task) : this.getTaskStartX(task);
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

        this.newDependency = { predecessorTaskId: null, dependencyType: 'FS', lagDays: 0 };
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

  // ---------------- Resources ----------------

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

    console.log('NEW RESOURCE BEFORE ADD', this.newResource);

    if (!this.newResource.assignedUserId) {
      console.error('Please select a real resource from the dropdown.');
      return;
    }

    const selectedUser = this.resourceOptions.find(
      r => r.id === Number(this.newResource.assignedUserId)
    );

    const payload: TaskResourceAssignment = {
      resourceType: selectedUser?.resourceType || this.newResource.resourceType || undefined,
      assignmentName: selectedUser?.fullName || this.newResource.assignmentName || undefined,
      quantity: this.newResource.quantity ?? 1,
      unitsPercent: this.newResource.unitsPercent ?? 100,
      cost: this.newResource.cost ?? 0,
      assignedUserId: Number(this.newResource.assignedUserId)
    };

    console.log('RESOURCE PAYLOAD SENT', payload);

    this.service.createTaskResource(this.projectId, this.selectedTask.id, payload).subscribe({
      next: () => {
        if (this.selectedTask && selectedUser) {
          this.selectedTask.assignedUserId = selectedUser.id;
          this.selectedTask.assignedUserName = selectedUser.fullName;
          this.selectedTask.resourceType = selectedUser.resourceType;
          this.selectedTask.departmentCode = selectedUser.departmentCode;

          this.taskForm.patchValue({
            assignedUserId: selectedUser.id,
            resourceType: selectedUser.resourceType,
            departmentCode: selectedUser.departmentCode
          }, { emitEvent: false });

          this.saveInlineTask(this.selectedTask);
        }

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
      next: () => {
        this.loadTaskResources(this.selectedTask!.id);
        this.loadSchedule();
      },
      error: (err) => console.error('Failed to update task resource', err)
    });
  }

  removeResource(assignmentId?: number): void {
    if (!this.selectedTask || !assignmentId) return;

    this.service.deleteTaskResource(this.projectId, this.selectedTask.id, assignmentId).subscribe({
      next: () => {
        this.loadTaskResources(this.selectedTask!.id);
        this.loadSchedule();
      },
      error: (err) => console.error('Failed to delete task resource', err)
    });
  }

  getSelectedAssignedUserName(): string {
    return this.selectedTask?.assignedUserName || 'No user assigned';
  }

  // ---------------- Scroll sync ----------------

  private syncScroll(source: HTMLElement, target: HTMLElement, axis: 'vertical' | 'horizontal'): void {
    if (axis === 'vertical') {
      target.scrollTop = source.scrollTop;
    } else {
      target.scrollLeft = source.scrollLeft;
    }
  }

  onTableScroll(): void {
    if (!this.tableBodyScroll) return;

    const tableBodyEl = this.tableBodyScroll.nativeElement;

    if (this.ganttBodyScroll && !this.syncingVertical) {
      this.syncingVertical = true;
      this.syncScroll(tableBodyEl, this.ganttBodyScroll.nativeElement, 'vertical');
      requestAnimationFrame(() => {
        this.syncingVertical = false;
      });
    }

    if (this.leftHeaderScroll && !this.syncingHorizontal) {
      this.syncingHorizontal = true;
      this.syncScroll(tableBodyEl, this.leftHeaderScroll.nativeElement, 'horizontal');
      requestAnimationFrame(() => {
        this.syncingHorizontal = false;
      });
    }

    if (this.contextMenuOpen) {
      this.closeContextMenu();
    }
  }

  onGanttScroll(): void {
    if (!this.ganttBodyScroll) return;

    const ganttBodyEl = this.ganttBodyScroll.nativeElement;

    if (this.tableBodyScroll && !this.syncingVertical) {
      this.syncingVertical = true;
      this.syncScroll(ganttBodyEl, this.tableBodyScroll.nativeElement, 'vertical');
      requestAnimationFrame(() => {
        this.syncingVertical = false;
      });
    }

    if (!this.syncingHorizontal) {
      this.syncingHorizontal = true;

      if (this.monthHeaderScroll) {
        this.syncScroll(ganttBodyEl, this.monthHeaderScroll.nativeElement, 'horizontal');
      }

      if (this.timelineHeaderScroll) {
        this.syncScroll(ganttBodyEl, this.timelineHeaderScroll.nativeElement, 'horizontal');
      }

      requestAnimationFrame(() => {
        this.syncingHorizontal = false;
      });
    }

    if (this.contextMenuOpen) {
      this.closeContextMenu();
    }
  }

  private resetScroll(): void {
    this.leftHeaderScroll?.nativeElement.scrollTo(0, 0);
    this.tableBodyScroll?.nativeElement.scrollTo(0, 0);
    this.monthHeaderScroll?.nativeElement.scrollTo(0, 0);
    this.timelineHeaderScroll?.nativeElement.scrollTo(0, 0);
    this.ganttBodyScroll?.nativeElement.scrollTo(0, 0);
  }

  // ---------------- Column sizing ----------------

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
  

  // ---------------- Stats / date helpers ----------------

  private computeStats(): void {
    this.stats.total = this.tasks.length;
    this.stats.milestones = this.tasks.filter(t => this.isMilestone(t)).length;
    this.stats.summaries = this.tasks.filter(t => this.isSummary(t)).length;

    const normalTasks = this.tasks.filter(t => !this.isSummary(t));
    const totalProgress = normalTasks.reduce((sum, t) => sum + (t.percentComplete ?? 0), 0);

    this.stats.avgProgress = normalTasks.length
      ? Math.round(totalProgress / normalTasks.length)
      : 0;
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

  // ---------------- Loading settings data ----------------


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

  // ---------------- Customer flag ----------------

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

  // ---------------- Dependency cascade ----------------

  private normalizeDateString(value?: string | null): string | null {
    if (!value) return null;

    const d = this.toDateOnly(value);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }

  private compareDateStrings(a?: string | null, b?: string | null): number {
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;

    return this.toDateOnly(a).getTime() - this.toDateOnly(b).getTime();
  }

  private maxDateString(a?: string | null, b?: string | null): string | null {
    if (!a) return b ?? null;
    if (!b) return a ?? null;
    return this.compareDateStrings(a, b) >= 0 ? a : b;
  }

  private getTaskDurationDays(task: GmProjectScheduleTask): number {
    return this.calculateDurationDays(
      task.baselineStart ?? task.plannedStart,
      task.baselineEnd ?? task.plannedEnd,
      this.isMilestone(task)
    );
  }

 
private buildTaskUpdatePayload(task: GmProjectScheduleTask): GmUpdateProjectTaskRequest {
    this.normalizeTaskDates(task);

    return {
      parentId: task.parentId ?? null,
      name: task.name ?? '',
      description: task.description ?? '',
      durationDays: task.durationDays ?? 0,

      baselineStart: task.baselineStart ?? undefined,
      baselineEnd: task.baselineEnd ?? undefined,

      plannedStart: task.plannedStart ?? task.baselineStart ?? undefined,
      plannedEnd: task.plannedEnd ?? task.baselineEnd ?? undefined,

      actualStart: task.actualStart ?? undefined,
      actualEnd: task.actualEnd ?? undefined,

      percentComplete: task.percentComplete ?? 0,
      allocationPercent: task.allocationPercent ?? undefined,
      priority: task.priority ?? 0,
      taskType: task.taskType ?? 'ACTIVITY',
      wbsCode: task.wbsCode ?? '',
      departmentCode: task.departmentCode ?? '',
      resourceType: task.resourceType ?? '',
      active: task.active ?? true,
      displayOrder: task.displayOrder ?? 0,
      outlineLevel: task.outlineLevel ?? 1,
      customerMilestone: task.customerMilestone ?? false,
      scheduleMode: task.scheduleMode ?? 'AUTO',
      status: task.status ?? '',
      color: task.color ?? '',
      assignedUserId: task.assignedUserId ?? undefined
    };
  }

  private recalculateTaskFromPredecessors(task: GmProjectScheduleTask): boolean {
    const deps = (task.dependencies ?? []).filter(dep => !!dep.predecessorTaskId);
    if (!deps.length) return false;

    if ((task.scheduleMode || 'AUTO').toUpperCase() === 'MANUAL') return false;

    this.normalizeTaskDates(task);

    const oldStart = task.baselineStart ?? null;
    const oldEnd = task.baselineEnd ?? null;
    const duration = this.getTaskDurationDays(task);

    let requiredStart: string | null = null;
    let requiredEnd: string | null = null;

    for (const dep of deps) {
      const predecessor = this.tasks.find(t => t.id === dep.predecessorTaskId);
      if (!predecessor) continue;

      this.normalizeTaskDates(predecessor);

      const lag = dep.lagDays ?? 0;
      const type = (dep.dependencyType || 'FS').toUpperCase();

      const predStart = predecessor.baselineStart ? this.normalizeDateString(predecessor.baselineStart) : null;
      const predEnd = predecessor.baselineEnd ? this.normalizeDateString(predecessor.baselineEnd) : predStart;

      if (!predStart && !predEnd) continue;

      switch (type) {
        case 'SS':
          if (predStart) requiredStart = this.maxDateString(requiredStart, this.addDaysToDateString(predStart, lag));
          break;
        case 'FF':
          if (predEnd) requiredEnd = this.maxDateString(requiredEnd, this.addDaysToDateString(predEnd, lag));
          break;
        case 'SF':
          if (predStart) requiredEnd = this.maxDateString(requiredEnd, this.addDaysToDateString(predStart, lag));
          break;
        case 'FS':
        default:
          if (predEnd) requiredStart = this.maxDateString(requiredStart, this.addDaysToDateString(predEnd, lag));
          break;
      }
    }

    let newStart = oldStart;
    let newEnd = oldEnd;

    if (this.isMilestone(task)) {
      const milestoneDate = requiredStart || requiredEnd || oldStart || oldEnd;
      if (!milestoneDate) return false;
      newStart = milestoneDate;
      newEnd = milestoneDate;
    } else if (requiredStart && requiredEnd) {
      const startFromEnd = this.addDaysToDateString(requiredEnd, -(duration - 1));
      newStart = this.maxDateString(requiredStart, startFromEnd);
      newEnd = this.addDaysToDateString(newStart!, duration - 1);

      if (this.compareDateStrings(newEnd, requiredEnd) < 0) {
        newEnd = requiredEnd;
        newStart = this.addDaysToDateString(newEnd, -(duration - 1));
      }
    } else if (requiredStart) {
      newStart = requiredStart;
      newEnd = this.addDaysToDateString(newStart, duration - 1);
    } else if (requiredEnd) {
      newEnd = requiredEnd;
      newStart = this.addDaysToDateString(newEnd, -(duration - 1));
    }

    newStart = this.normalizeDateString(newStart);
    newEnd = this.normalizeDateString(newEnd);

    const changed = newStart !== oldStart || newEnd !== oldEnd;
    if (!changed) return false;

    task.baselineStart = newStart ?? undefined;
    task.baselineEnd = newEnd ?? undefined;
    this.normalizeTaskDates(task);
    return true;
  }

  private applyDependencyCascadeFromTask(changedTaskId: number): number[] {
    const changedIds = new Set<number>();
    const queue: number[] = [changedTaskId];
    const visitedEdges = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      const successors = this.tasks.filter(task =>
        (task.dependencies ?? []).some(dep => dep.predecessorTaskId === currentId)
      );

      for (const successor of successors) {
        const edgeKey = `${currentId}->${successor.id}`;
        if (visitedEdges.has(edgeKey)) continue;
        visitedEdges.add(edgeKey);

        const changed = this.recalculateTaskFromPredecessors(successor);
        if (changed) {
          changedIds.add(successor.id);
          queue.push(successor.id);
        }
      }
    }

    this.computeStats();
    this.buildTimeline();
    this.syncSelectedTaskReference();

    return Array.from(changedIds);
  }

  private persistShiftedTasks(taskIds: number[]) {
    const uniqueIds = Array.from(new Set(taskIds));

    if (!uniqueIds.length) {
      return of([]);
    }

    const requests = uniqueIds
      .map(id => this.tasks.find(t => t.id === id))
      .filter((task): task is GmProjectScheduleTask => !!task)
      .map(task =>
        this.service.updateTask(this.projectId, task.id, this.buildTaskUpdatePayload(task))
      );

    return requests.length ? forkJoin(requests) : of([]);
  }

  private setupTaskFormAutoCalculations(): void {
  const baselineStartCtrl = this.taskForm.get('baselineStart');
  const baselineEndCtrl = this.taskForm.get('baselineEnd');
  const plannedStartCtrl = this.taskForm.get('plannedStart');
  const plannedEndCtrl = this.taskForm.get('plannedEnd');
  const taskTypeCtrl = this.taskForm.get('taskType');
  const durationCtrl = this.taskForm.get('durationDays');

  if (!baselineStartCtrl || !baselineEndCtrl || !taskTypeCtrl || !durationCtrl) return;

  combineLatest([
    baselineStartCtrl.valueChanges.pipe(startWith(baselineStartCtrl.value)),
    baselineEndCtrl.valueChanges.pipe(startWith(baselineEndCtrl.value)),
    taskTypeCtrl.valueChanges.pipe(startWith(taskTypeCtrl.value))
  ]).subscribe(([baselineStart, baselineEnd, taskType]) => {
    const normalizedType = String(taskType || 'ACTIVITY').toUpperCase();

    if (normalizedType === 'MILESTONE') {
      if (baselineStart && baselineEnd !== baselineStart) {
        baselineEndCtrl.patchValue(baselineStart, { emitEvent: false });
      }
      durationCtrl.patchValue(0, { emitEvent: false });
      plannedStartCtrl?.patchValue(baselineStart || '', { emitEvent: false });
      plannedEndCtrl?.patchValue(baselineStart || '', { emitEvent: false });
      return;
    }

    const duration = this.calculateDurationDays(baselineStart, baselineEnd, false);
    durationCtrl.patchValue(duration, { emitEvent: false });
    plannedStartCtrl?.patchValue(baselineStart || '', { emitEvent: false });
    plannedEndCtrl?.patchValue(baselineEnd || '', { emitEvent: false });
  });

  durationCtrl.valueChanges.subscribe((durationValue) => {
    if (!this.selectedTask) return;

    const baselineStart = baselineStartCtrl.value;
    const taskType = String(taskTypeCtrl.value || 'ACTIVITY').toUpperCase();

    if (!baselineStart) return;

    if (taskType === 'MILESTONE') {
      durationCtrl.patchValue(0, { emitEvent: false });
      baselineEndCtrl.patchValue(baselineStart, { emitEvent: false });
      plannedStartCtrl?.patchValue(baselineStart, { emitEvent: false });
      plannedEndCtrl?.patchValue(baselineStart, { emitEvent: false });
      return;
    }

    const duration = Math.max(1, Number(durationValue || 1));
    const newEnd = this.addDaysToDateString(baselineStart, duration - 1);

    baselineEndCtrl.patchValue(newEnd, { emitEvent: false });
    plannedStartCtrl?.patchValue(baselineStart, { emitEvent: false });
    plannedEndCtrl?.patchValue(newEnd, { emitEvent: false });
  });

  this.taskForm.valueChanges.subscribe(() => {
    if (!this.selectedTask || this.suppressFormAutoSave) return;

    clearTimeout(this.formAutoSaveTimer);
    this.formAutoSaveTimer = setTimeout(() => {
      if (!this.selectedTask || this.taskForm.invalid) return;
      Object.assign(this.selectedTask, this.taskForm.value);
      this.normalizeTaskDates(this.selectedTask);
      this.saveInlineTask(this.selectedTask);
    }, 900);
  });
}

onProgressSliderCommit(): void {
  if (!this.selectedTask || this.taskForm.invalid) return;

  const percent = Number(this.taskForm.get('percentComplete')?.value ?? 0);

  this.taskForm.patchValue(
    { percentComplete: Math.max(0, Math.min(100, percent)) },
    { emitEvent: false }
  );

  this.saveTask();
}

onProgressSliderInput(): void {
  if (!this.selectedTask) return;

  const percent = Number(this.taskForm.get('percentComplete')?.value ?? 0);
  const safePercent = Math.max(0, Math.min(100, percent));

  this.taskForm.patchValue(
    { percentComplete: safePercent },
    { emitEvent: false }
  );

  if (this.selectedTask) {
    this.selectedTask.percentComplete = safePercent;
  }
}

openExportModal(): void {
  this.exportModalOpen = true;
}

closeExportModal(): void {
  this.exportModalOpen = false;
}

closeExportModalOnBackdrop(event: MouseEvent): void {
  if ((event.target as HTMLElement).classList.contains('export-overlay')) {
    this.closeExportModal();
  }
}

private getExportTasks(): GmProjectScheduleTask[] {
  if (this.exportScope === 'ALL') {
    return [...this.tasks];
  }
  if (this.exportScope === 'CUSTOMER_NO') {
    return this.tasks.filter(task => task.customerMilestone === false);
  }

  return [...this.tasks];
}

private downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

private escapeXml(value: any): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

private formatDateForExport(value?: string | null): string {
  return value ?? '';
}

exportAsMsProjectXml(): void {
  const exportTasks = this.getExportTasks();

  const xmlTasks = exportTasks.map((task, index) => `
    <Task>
      <UID>${task.id}</UID>
      <ID>${index + 1}</ID>
      <Name>${this.escapeXml(task.name)}</Name>
      <OutlineNumber>${this.escapeXml(task.wbsCode || '')}</OutlineNumber>
      <Start>${this.escapeXml(this.formatDateForExport(task.baselineStart ?? task.plannedStart))}</Start>
      <Finish>${this.escapeXml(this.formatDateForExport(task.baselineEnd ?? task.plannedEnd))}</Finish>
      <Duration>${this.escapeXml(task.durationDays ?? 0)}</Duration>
      <PercentComplete>${this.escapeXml(task.percentComplete ?? 0)}</PercentComplete>
      <Priority>${this.escapeXml(task.priority ?? 500)}</Priority>
      <Notes>${this.escapeXml(task.description || '')}</Notes>
    </Task>
  `).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Project>
  <Name>Project ${this.projectId} Schedule</Name>
  <Tasks>
    ${xmlTasks}
  </Tasks>
</Project>`;

  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  this.downloadBlob(blob, `project-${this.projectId}-schedule.xml`);
  this.closeExportModal();
}

exportAsPdfReport(): void {
  const exportTasks = this.getExportTasks();

  const rowsHtml = exportTasks.map(task => `
    <tr>
      <td>${task.id ?? ''}</td>
      <td>${task.wbsCode ?? ''}</td>
      <td>${this.escapeXml(task.name ?? '')}</td>
      <td>${task.taskType ?? ''}</td>
      <td>${task.departmentCode ?? ''}</td>
      <td>${task.baselineStart ?? task.plannedStart ?? ''}</td>
      <td>${task.baselineEnd ?? task.plannedEnd ?? ''}</td>
      <td>${task.durationDays ?? ''}</td>
      <td>${task.percentComplete ?? 0}%</td>
    </tr>
  `).join('');

  const html = `
    <html>
      <head>
        <title>Project ${this.projectId} Schedule Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
          h1 { font-size: 22px; margin-bottom: 8px; }
          p { color: #64748b; margin-bottom: 18px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>Project ${this.projectId} Schedule Report</h1>
        <p>Scope: ${this.exportScope}</p>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>WBS</th>
              <th>Name</th>
              <th>Type</th>
              <th>Department</th>
              <th>Start</th>
              <th>Finish</th>
              <th>Duration</th>
              <th>% Done</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();

  this.closeExportModal();
}

exportAsExcelCsv(): void {
  const exportTasks = this.getExportTasks();

  const headers = [
    'ID',
    'WBS',
    'Name',
    'Type',
    'Department',
    'Resource Type',
    'Customer Milestone',
    'Baseline Start',
    'Baseline End',
    'Baseline Start',
    'Baseline End',
    'Actual Start',
    'Actual End',
    'Duration',
    'Percent Complete',
    'Priority',
    'Status',
    'Schedule Mode'
  ];

  const rows = exportTasks.map(task => [
    task.id ?? '',
    task.wbsCode ?? '',
    task.name ?? '',
    task.taskType ?? '',
    task.departmentCode ?? '',
    task.resourceType ?? '',
    task.customerMilestone ? 'Yes' : 'No',
    task.baselineStart ?? task.plannedStart ?? '',
    task.baselineEnd ?? task.plannedEnd ?? '',
    task.baselineStart ?? task.plannedStart ?? '',
    task.baselineEnd ?? task.plannedEnd ?? '',
    task.actualStart ?? '',
    task.actualEnd ?? '',
    task.durationDays ?? '',
    task.percentComplete ?? '',
    task.priority ?? '',
    task.status ?? '',
    task.scheduleMode ?? ''
  ]);

  const csv = [headers, ...rows]
    .map(row =>
      row
        .map(value => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  this.downloadBlob(blob, `project-${this.projectId}-schedule.csv`);
  this.closeExportModal();
}

getAssignableResources(projectId: number): Observable<{ id: number; fullName: string; departmentCode: string }[]> {
  return new Observable(observer => {
    observer.next([]);
    observer.complete();
  });
}
loadResourceOptions(): void {
  this.service.getResourceUsers(this.projectId).subscribe({
    next: (users) => {
      this.resourceOptions = users.map(u => ({
        id: u.id,
        fullName: u.fullName,
        resourceType: u.resourceType || '',
        departmentCode: u.departmentCode || ''
      }));
      this.filteredResourceOptions = [...this.resourceOptions];

      // Dynamic resource types from users
      this.resourceTypes = [...new Set(
        this.resourceOptions.map(u => u.resourceType).filter(rt => !!rt)
      )].sort();

      // Dynamic department codes from users
      this.departmentCodes = [...new Set(
        this.resourceOptions.map(u => u.departmentCode).filter(d => !!d)
      )].sort();
    },
    error: (err) => {
      console.error('Could not load resource users', err);
      this.resourceOptions = [];
      this.filteredResourceOptions = [];
    }
  });
}
onResourceSearchInput(): void {
  const term = (this.resourceSearchTerm ?? '').trim().toLowerCase();
  if (!term) {
    this.resourceSearchResults = [];
    this.showResourceDropdown = false;
    return;
  }

  let filtered = [...this.resourceOptions];

  // Filter by selected resource type if any
  const selectedType = (this.newResource.resourceType ?? '').trim().toUpperCase();
  if (selectedType) {
    filtered = filtered.filter(u =>
      (u.resourceType ?? '').toUpperCase() === selectedType
    );
  }

  // Filter by search term
  this.resourceSearchResults = filtered.filter(u =>
    (u.fullName ?? '').toLowerCase().includes(term) ||
    (u.resourceType ?? '').toLowerCase().includes(term)
  );

  this.showResourceDropdown = this.resourceSearchResults.length > 0;
}

selectResourceFromSearch(user: { id: number; fullName: string; resourceType: string; departmentCode: string }): void {
  this.newResource.assignedUserId = user.id;
  this.newResource.assignmentName = user.fullName;
  if (!this.newResource.resourceType) {
    this.newResource.resourceType = user.resourceType;
  }
  this.resourceSearchTerm = user.fullName;
  this.showResourceDropdown = false;
  this.resourceSearchResults = [];
}

loadSelectedTaskHistory(): void {
  if (!this.selectedTask) return;

  this.historyLoading = true;

  this.service.getTaskHistory(this.projectId, this.selectedTask.id).subscribe({
    next: (res) => {
      this.taskHistory = res ?? [];
      this.historyLoading = false;
    },
    error: (err) => {
      console.error('Failed to load task history', err);
      this.taskHistory = [];
      this.historyLoading = false;
    }
  });
}

  loadTaskConsole(): void {
    if (!this.selectedTask) return;

    this.consoleLoading = true;

    forkJoin({
      config: this.service.getTaskConsoleConfig(this.projectId, this.selectedTask.id),
      logs: this.service.getTaskConsoleLogs(this.projectId, this.selectedTask.id)
    }).subscribe({
      next: ({ config, logs }) => {
        this.consoleConfig = config;
        this.consoleLogs = logs ?? [];
        this.consoleLoading = false;
      },
      error: (err) => {
        console.error('Failed to load task console', err);
        this.consoleConfig = null;
        this.consoleLogs = [];
        this.consoleLoading = false;
      }
    });
  }

setDetailTab(tab: 'general' | 'predecessors' | 'resources' | 'history' | 'console'): void {
  this.activeDetailTab = tab;

  if (tab === 'console') {
    this.loadTaskConsole();
  }

  if (tab === 'history') {
    this.loadSelectedTaskHistory();
  }
}

formatHistoryDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
  
}

toggleConsoleCheckpoint(field: 'checkpoint25' | 'checkpoint50' | 'checkpoint75'): void {
  if (!this.consoleConfig) return;
  this.consoleConfig[field] = !this.consoleConfig[field];
}

setConsoleChannel(channel: 'APP_ALERT' | 'EMAIL' | 'BOTH'): void {
  if (!this.consoleConfig) return;
  this.consoleConfig.channel = channel;
}

toggleConsoleNotify(
  field: 'notifyPm' | 'notifyOwner' | 'notifyDeptManager' | 'notifyEveryone'
): void {
  if (!this.consoleConfig) return;
  this.consoleConfig[field] = !this.consoleConfig[field];
}

saveConsoleConfig(): void {
  if (!this.selectedTask || !this.consoleConfig) return;

  this.service
    .saveTaskConsoleConfig(this.projectId, this.selectedTask.id, this.consoleConfig)
    .subscribe({
      next: (saved) => {
        this.consoleConfig = saved;
        this.loadTaskConsole();
      },
      error: (err) => console.error('Failed to save console config', err)
    });
}

clearConsoleLogs(): void {
  if (!this.selectedTask) return;

  this.service.clearTaskConsoleLogs(this.projectId, this.selectedTask.id).subscribe({
    next: () => {
      this.consoleLogs = [];
    },
    error: (err) => console.error('Failed to clear console logs', err)
  });
}

onNewResourceUserChange(userId: number | null): void {
  const user = this.resourceOptions.find(r => r.id === Number(userId));

  this.newResource.assignedUserId = userId ? Number(userId) : null;

  if (!user) return;

  this.newResource.assignmentName = user.fullName;
  this.newResource.resourceType = user.resourceType;

  if (this.selectedTask) {
    this.selectedTask.assignedUserId = user.id;
    this.selectedTask.assignedUserName = user.fullName;
    this.selectedTask.resourceType = user.resourceType;
    this.selectedTask.departmentCode = user.departmentCode;

    this.taskForm.patchValue({
      assignedUserId: user.id,
      resourceType: user.resourceType,
      departmentCode: user.departmentCode
    }, { emitEvent: false });
  }
}

loadProjectName(): void {
  this.gmDashboardService.getProjects().subscribe({
    next: (projects) => {
      this.project = (projects ?? []).find(p => p.id === this.projectId) ?? null;
      this.projectName = this.project?.name || `Project ${this.projectId}`;
    },
    error: () => {
      this.projectName = `Project ${this.projectId}`;
    }
  });
}

addSupplierAssignment(): void {

  if (!this.selectedTask) {
    return;
  }

  const supplierName =
    this.newSupplier.assignmentName?.trim();

  if (!supplierName) {
    return;
  }

  const payload = {
    resourceType: 'SUPPLIER',
    assignmentName: supplierName,
    quantity: this.newSupplier.quantity ?? 1,
    unitsPercent: this.newSupplier.unitsPercent ?? 100,
    cost: this.newSupplier.cost ?? 0,
    assignedUserId: null
  };

  this.service.createTaskResource(
    this.projectId,
    this.selectedTask.id,
    payload
  ).subscribe({
    next: () => {

      this.newSupplier = {
        resourceType: 'SUPPLIER',
        assignmentName: '',
        quantity: 1,
        unitsPercent: 100,
        cost: 0,
        assignedUserId: null
      };

      this.loadTaskResources(this.selectedTask!.id);

      this.loadSchedule();
    },
    error: err => {
      console.error(
        'Failed to create supplier assignment',
        err
      );
    }
  });
}

activeBaselineId: number | null = null;

private enrichBaseline(baseline: ProjectBaseline): ProjectBaseline {
  let tasks: GmProjectScheduleTask[] = [];

  try {
    tasks = JSON.parse(baseline.snapshotJson || '[]');
  } catch {
    tasks = [];
  }

  const taskCount = tasks.length;
  const avgProgress = taskCount
    ? Math.round(tasks.reduce((sum, t) => sum + Number(t.percentComplete || 0), 0) / taskCount)
    : 0;

  const completedCount = tasks.filter(t => Number(t.percentComplete || 0) >= 100).length;

  return {
    ...baseline,
    taskCount,
    avgProgress,
    completedCount,
    active: baseline.id === this.activeBaselineId
  };
}

loadBaselines(): void {
  this.baselineService.getBaselines(this.projectId).subscribe({
    next: res => {
      this.baselines  = (res || []).map(b => this.enrichBaseline(b));
    },
    error: err => console.error('Failed to load baselines', err)
  });
}

saveBaselineWithName(): void {
  const name = this.baselineName?.trim();

  if (!name) {
    alert('Please enter a baseline name');
    return;
  }

  const snapshotTasks = this.tasks.map(task => ({
    ...task,
    baselineStart: task.plannedStart ?? task.baselineStart,
    baselineEnd: task.plannedEnd ?? task.baselineEnd
  }));

  this.saving = true;

  this.baselineService.createBaseline(this.projectId, {
    name,
    snapshotJson: JSON.stringify(snapshotTasks)
  }).subscribe({
    next: saved => {
      this.baselineName = '';
      this.activeBaselineId = saved.id;
      this.saving = false;
      this.loadBaselines();
    },
    error: err => {
      this.saving = false;
      console.error('Failed to save baseline', err);
    }
  });
}

applyBaselineToSchedule(baseline: ProjectBaseline): void {
  let baselineTasks: GmProjectScheduleTask[] = [];

  try {
    baselineTasks = JSON.parse(baseline.snapshotJson || '[]');
  } catch {
    alert('Invalid baseline snapshot');
    return;
  }

  if (!baselineTasks.length) return;

  this.saving = true;
  this.pushHistory();

  const currentById = new Map(this.tasks.map(t => [t.id, t]));

  const requests = baselineTasks
    .filter(bt => currentById.has(bt.id))
    .map(bt => {
      const current = currentById.get(bt.id)!;

      const updated: GmProjectScheduleTask = {
        ...current,
        baselineStart: bt.baselineStart,
        baselineEnd: bt.baselineEnd,
        plannedStart: bt.plannedStart ?? bt.baselineStart,
        plannedEnd: bt.plannedEnd ?? bt.baselineEnd,
        percentComplete: bt.percentComplete ?? current.percentComplete
      };

      return this.service.updateTask(
        this.projectId,
        updated.id,
        this.buildTaskUpdatePayload(updated)
      );
    });

  forkJoin(requests)
    .pipe(finalize(() => this.saving = false))
    .subscribe({
      next: () => {
        this.activeBaselineId = baseline.id;
        this.loadSchedule();
        this.loadBaselines();
      },
      error: err => {
        console.error('Failed to apply baseline', err);
        this.loadSchedule();
      }
    });
}

renameBaseline(baseline: ProjectBaseline): void {
  const name = prompt('New baseline name:', baseline.name);
  if (!name?.trim()) return;

  this.baselineService.renameBaseline(this.projectId, baseline.id, name.trim()).subscribe({
    next: () => this.loadBaselines(),
    error: err => console.error('Failed to rename baseline', err)
  });
}

toggleBaselineDetails(baseline: ProjectBaseline): void {
  baseline.expanded = !baseline.expanded;
}

trackBaseline(_: number, baseline: ProjectBaseline): number {
  return baseline.id;
}
}