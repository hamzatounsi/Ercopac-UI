import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { forkJoin, of, Observable, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, finalize, map, switchMap, takeUntil } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MilestoneService } from '../../../services/milestone.service';
import { MilestoneType } from '../../../models/milestone-type.model';
import { GmProjectTimelineService } from '../../../services/gm-project-timeline.service';
import {
  GmProjectScheduleTask,
  TaskDependencyDto
} from '../../../models/gm-project-schedule-task.model';
import { GmUpdateProjectTaskRequest } from '../../../models/gm-update-project-task-request.model';
import { TaskResourceAssignment } from '../../../models/task-resource-assignment.model';
import { GmProjectBaselineService } from '../../../services/gm-project-baseline.service';
import { ProjectBaseline, ProjectBaselineTaskSnapshot } from '../../../models/project-baseline.model';
import { GmProjectCalendarService } from '../../../services/gm-project-calendar.service';
import { ProjectCalendar } from '../../../models/project-calendar.model';
import { GmProjectTemplateService } from '../../../services/gm-project-template.service';
import { ProjectTemplate } from '../../../models/project-template.model';
import { ProjectTaskHistory } from '../../../models/project-task-history.model';
import { TaskConsoleConfig } from '../../../models/task-console-config.model';
import { TaskConsoleLog } from '../../../models/task-console-log.model';
import { ProjectDashboardRow } from '../../../models/project-dashboard-row.model';
import { GmDashboardService } from '../../../services/gm-dashboard.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { ResourceConfigService } from '../../../services/resource-config.service';
import * as XLSX from 'xlsx';
import { assertSpreadsheetFile, assertSpreadsheetRowLimit, assertValidWorkbook } from 'src/app/core/utils/spreadsheet-import.utils';

export interface TimelineDay {
  label: string;
  date: Date;
  isMonthStart: boolean;
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
  arrowDirection: 'left' | 'right';
  labelLeft: number;
  labelTop: number;
  labelText: string;
}

export interface TimelineMonth {
  label: string;
  width: number;
}

type GanttColumnVisibility = {
  id: boolean;
  wbs: boolean;
  customer: boolean;
  name: boolean;
  type: boolean;
  resourceType: boolean;
  department: boolean;
  actualStart: boolean;
  actualFinish: boolean;
  duration: boolean;
  predecessors: boolean;
  progress: boolean;
  baselineStart: boolean;
  baselineEnd: boolean;
  milestone: boolean;
};

interface GanttDisplayPreferences {
  version: 1;
  columnVisibility?: Partial<GanttColumnVisibility>;
  activeZoom?: '2W' | '1M' | '2M' | 'Day';
  activeMode?: 'baseline' | 'actual';
  leftPaneWidth?: number;
}

@Component({
  selector: 'app-gm-project-schedule-page',
  templateUrl: './gm-project-schedule-page.component.html',
  styleUrls: ['./gm-project-schedule-page.component.scss']
})
export class GmProjectSchedulePageComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('tableBodyScroll') tableBodyScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('ganttBodyScroll') ganttBodyScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('timelineHeaderScroll') timelineHeaderScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('leftHeaderScroll') leftHeaderScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('monthHeaderScroll') monthHeaderScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('plannerMain') plannerMain?: ElementRef<HTMLElement>;

  projectId!: number;
  loading = false;
  saving = false;
  importStatus = '';
  importMenuOpen = false;
  private formAutoSaveTimer: any = null;
  private suppressFormAutoSave = false;
  private readonly pendingCascadeSaveIds = new Set<number>();

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
  readonly milestoneSize = 12;
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
  settingsTab: 'templates' | 'calendar' | 'baseline' | 'milestones' = 'templates';
  milestoneTypes: any[] = [];
  newMilestoneType = { code: '', label: '', color: '#cccccc', letterCode: '' };
  editingMilestoneType: any | null = null;

  history: GmProjectScheduleTask[][] = [];
  future: GmProjectScheduleTask[][] = [];
  templateName = '';
  selectedTemplateScope: 'all' | 'selected' = 'all';
  selectedTemplateTaskIds = new Set<number>();
  templateDescription = '';
  applyingTemplate = false;
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
  activeWorkingDays: number[] = [1, 2, 3, 4, 5];
  calendarEditorOpen = false;
  editingCalendarId: number | null = null;
  calendarName = '';
  calendarWorkingDays: number[] = [1, 2, 3, 4, 5];
  baselineName = '';
  baselines: ProjectBaseline[] = [];
  dependencyTypes = ['FS', 'SS', 'FF', 'SF'];
  newDependency = {
    predecessorTaskId: null as number | null,
    dependencyType: 'FS',
    lagDays: 0
  };
  newSupplier: TaskResourceAssignment = {
    resourceType: '',
    assignmentName: '',
    quantity: 1,
    unitsPercent: 100,
    cost: 0,
    assignedUserId: null,
    supplierId: null
  };
  resourceOptions: { id: number; fullName: string; departmentCode: string; resourceType: string }[] = [];
  levelMenuOpen = false;
  deptMenuOpen = false;
  columnsMenuOpen = false;
  selectedLevelFilter: number | 'ALL' = 'ALL';
  selectedDepartmentFilter = 'ALL';
  columnVisibility: GanttColumnVisibility = {
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
    baselineEnd: true,
    milestone: true
  };
  leftPaneWidth = 750;
  private isResizing = false;
  structureSaving = false;
  readonly minLeftPaneWidth = 120;
  readonly minTimelineWidth = 120;
  readonly plannerResizerWidth = 4;
  editedRows: Record<number, Partial<GmProjectScheduleTask>> = {};
  private readonly inlineNameEdits = new Map<number, { original: string; value: string; committed: boolean }>();
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
  private supplierAssignmentIds = new Set<number>();
  supplierOptions: { id: number; code: string | null; name: string; resourceTypeCodes: string[] }[] = [];
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
  contextMenuOpen = false;
  contextMenuX = 0;
  contextMenuY = 0;
  contextMenuTask: GmProjectScheduleTask | null = null;
  projectName = '';
  activeBaselineId: number | null = null;
  private activeBaselineTasks = new Map<number, ProjectBaselineTaskSnapshot>();
  private scheduleLoadInFlight = false;
  private readonly destroy$ = new Subject<void>();
  isMyCsSchedule = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private service: GmProjectTimelineService,
    private baselineService: GmProjectBaselineService,
    private calendarService: GmProjectCalendarService,
    private projectTimelineService: GmProjectTimelineService,
    private templateService: GmProjectTemplateService,
    private gmDashboardService: GmDashboardService,
    private authService: AuthService,
    private resourceConfigService: ResourceConfigService,
    private milestoneService: MilestoneService,
    private readonly changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupTaskFormAutoCalculations();
    this.route.paramMap.pipe(
      map(params => Number(params.get('id'))),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(projectId => {
      if (!Number.isSafeInteger(projectId) || projectId <= 0) return;
      this.projectId = projectId;
      this.isMyCsSchedule = this.router.url.includes('/my-cs/');
      this.restoreGanttDisplayPreferences();
      this.loadSchedule();
      this.loadResourceOptions();
      this.loadConfiguredResourceTypes();
      this.loadProjectName();
      this.loadMilestoneTypes();
    });
  }

  ngAfterViewInit(): void { this.clampLeftPaneWidth(); }

  @HostListener('document:keydown', ['$event'])
  handleDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.contextMenuOpen) {
      this.closeContextMenu();
    }
  }

  // ---------------- Navigation ----------------
  backToProjectum(): void { this.router.navigate(['/gm/projectum']); }
  goToActions(): void { this.router.navigate(['/gm/projects', this.projectId, 'actions']); }
  goToFinance(): void { this.router.navigate(['/gm/projects', this.projectId, 'finance']); }
  goToForecast(): void { this.router.navigate(['/gm/projects', this.projectId, 'forecast']); }
  goToRisks(): void { this.router.navigate(['/gm/projects', this.projectId, 'risks']); }
  goToChangeRequests(): void { this.router.navigate(['/gm/projects', this.projectId, 'change-requests']); }

  // ---------------- Project name ----------------
  loadProjectName(): void {
    this.gmDashboardService.getProjects().pipe(takeUntil(this.destroy$)).subscribe({
      next: (projects) => {
        this.project = (projects ?? []).find(p => p.id === this.projectId) ?? null;
        this.projectName = this.project?.name || `Project ${this.projectId}`;
      },
      error: () => {
        this.projectName = `Project ${this.projectId}`;
      }
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    const previousWidth = this.leftPaneWidth;
    this.clampLeftPaneWidth();
    if (this.leftPaneWidth !== previousWidth) this.persistGanttDisplayPreferences();
  }

  // ---------------- Display preferences ----------------
  private getGanttDisplayPreferencesKey(): string | null {
    const userId = this.authService.getCurrentUserId();
    if (userId === null || !Number.isSafeInteger(userId) || userId <= 0 || !Number.isSafeInteger(this.projectId) || this.projectId <= 0) {
      return null;
    }
    return `projectum:gantt:preferences:${userId}:${this.projectId}`;
  }

  private restoreGanttDisplayPreferences(): void {
    const key = this.getGanttDisplayPreferencesKey();
    if (!key) return;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null') as GanttDisplayPreferences | null;
      if (!saved || typeof saved !== 'object' || saved.version !== 1) return;
      if (saved.columnVisibility && typeof saved.columnVisibility === 'object') {
        (Object.keys(this.columnVisibility) as Array<keyof GanttColumnVisibility>).forEach(column => {
          const visible = saved.columnVisibility?.[column];
          if (typeof visible === 'boolean') this.columnVisibility[column] = visible;
        });
      }
      if (saved.activeMode === 'baseline' || saved.activeMode === 'actual') this.activeMode = saved.activeMode;
      if (saved.activeZoom === '2W' || saved.activeZoom === '1M' || saved.activeZoom === '2M' || saved.activeZoom === 'Day') {
        this.activeZoom = saved.activeZoom;
        this.dayWidth = this.getDayWidth(saved.activeZoom);
      }
      if (typeof saved.leftPaneWidth === 'number' && Number.isFinite(saved.leftPaneWidth)) this.leftPaneWidth = saved.leftPaneWidth;
    } catch {
      // Invalid local display preferences are ignored so the schedule uses defaults.
    }
  }

  private persistGanttDisplayPreferences(): void {
    const key = this.getGanttDisplayPreferencesKey();
    if (!key) return;
    const preferences: GanttDisplayPreferences = {
      version: 1,
      columnVisibility: { ...this.columnVisibility },
      activeZoom: this.activeZoom,
      activeMode: this.activeMode,
      leftPaneWidth: this.leftPaneWidth
    };
    try {
      localStorage.setItem(key, JSON.stringify(preferences));
    } catch {
      // Storage can be unavailable or full; display changes still work for this session.
    }
  }

  private getDayWidth(zoom: '2W' | '1M' | '2M' | 'Day'): number {
    switch (zoom) {
      case '2W': return 22;
      case '1M': return 40;
      case '2M': return 28;
      case 'Day': return 54;
    }
  }

  // ---------------- Schedule loading ----------------
  loadSchedule(): void {
    if (this.scheduleLoadInFlight || !Number.isSafeInteger(this.projectId) || this.projectId <= 0) return;
    this.scheduleLoadInFlight = true;
    this.loading = true;
    this.service.getProjectSchedule(this.projectId).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.scheduleLoadInFlight = false)
    ).subscribe({
      next: (res) => {
        try {
          this.tasks = (res ?? []).map(task => ({
            ...task,
            milestoneTypeId: task.milestoneTypeId == null ? null : Number(task.milestoneTypeId)
          })).sort(
            (a, b) => ((a.displayOrder ?? 0) - (b.displayOrder ?? 0)) || (a.id - b.id)
          );
          this.tasks.forEach(task => this.normalizeTaskDates(task));
          this.recalculateWbsCodes();
          this.recalculateSummaryDates();
          this.computeStats();
          this.buildTimeline();
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
          console.log('Tasks with milestoneTypeId:', this.tasks.filter(t => this.isMilestone(t)).map(t => ({ id: t.id, name: t.name, milestoneTypeId: t.milestoneTypeId })));
          setTimeout(() => {
            this.clampLeftPaneWidth();
            this.resetScroll();
          }, 0);
        } catch (err) {
          console.error('Failed to initialize project schedule', err);
        } finally {
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('Failed to load schedule', err);
        this.loading = false;
      }
    });
  }

  // ---------------- Form ----------------
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
      durationDays: task.durationDays ?? this.calculateDurationDays(baselineStart, baselineEnd, this.isMilestone(task)),
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
    return this.calculateScheduledDurationDays(start, end);
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
    }
  }

  private recalculateDurationFromDates(task: GmProjectScheduleTask): void {
    if (!this.isMilestone(task)) {
      task.durationDays = this.calculateDurationDays(
        task.plannedStart ?? task.baselineStart,
        task.plannedEnd ?? task.baselineEnd,
        false
      );
    }
  }

  setTaskFormDate(field: 'baselineStart' | 'baselineEnd' | 'actualStart' | 'actualEnd', value: string): void {
    if (!this.selectedTask) return;
    this.applyPickerDateChange(this.selectedTask, field, value);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private synchronizeTaskDates(
    task: GmProjectScheduleTask,
    changed: 'baselineStart' | 'baselineEnd' | 'actualStart' | 'actualEnd' | 'duration'
  ): boolean {
    if (this.isMilestone(task)) {
      task.durationDays = 0;
      if (task.baselineStart) task.baselineEnd = task.baselineStart;
      if (task.baselineStart) task.plannedStart = task.baselineStart;
      if (task.baselineStart) task.plannedEnd = task.baselineStart;
      if (task.actualStart) task.actualEnd = task.actualStart;
      return true;
    }
    if (this.isSummary(task)) return true;
    if (changed === 'baselineStart') {
      const duration = this.normalizeDuration(task.durationDays);
      task.durationDays = duration;
      if (task.baselineStart) {
        task.baselineEnd = this.addScheduledDaysToDateString(task.baselineStart, duration - 1);
      }
      task.plannedStart = task.baselineStart ?? undefined;
      task.plannedEnd = task.baselineEnd ?? undefined;
      return true;
    }
    if (changed === 'baselineEnd') {
      if (this.hasInvalidDateRange(task.baselineStart, task.baselineEnd)) return false;
      if (task.baselineStart && task.baselineEnd) {
        task.durationDays = this.calculateScheduledDurationDays(task.baselineStart, task.baselineEnd);
      }
      task.plannedStart = task.baselineStart ?? undefined;
      task.plannedEnd = task.baselineEnd ?? undefined;
      return true;
    }
    if (changed === 'actualStart') {
      const duration = this.normalizeDuration(task.durationDays);
      task.durationDays = duration;
      if (task.actualStart) {
        task.actualEnd = this.addScheduledDaysToDateString(task.actualStart, duration - 1);
      }
      return true;
    }
    if (changed === 'actualEnd') {
      if (this.hasInvalidDateRange(task.actualStart, task.actualEnd)) return false;
      if (task.actualStart && task.actualEnd) {
        task.durationDays = this.calculateScheduledDurationDays(task.actualStart, task.actualEnd);
      }
      return true;
    }
    const duration = this.normalizeDuration(task.durationDays);
    task.durationDays = duration;
    if (task.baselineStart) {
      task.baselineEnd = this.addScheduledDaysToDateString(task.baselineStart, duration - 1);
      task.plannedStart = task.baselineStart;
      task.plannedEnd = task.baselineEnd;
    }
    if (task.actualStart) task.actualEnd = this.addScheduledDaysToDateString(task.actualStart, duration - 1);
    return true;
  }

  private normalizeDuration(value: unknown): number {
    const duration = Number(value);
    return Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : 1;
  }

  private getWorkingDays(): Set<number> {
    return new Set(this.activeWorkingDays);
  }

  private isWorkingDate(date: Date): boolean {
    return this.getWorkingDays().has(date.getDay() || 7);
  }

  private calculateScheduledDurationDays(start: string, end: string): number {
    const cursor = this.toDateOnly(start);
    const last = this.toDateOnly(end);
    let duration = 0;
    while (cursor <= last) {
      if (this.isWorkingDate(cursor)) duration++;
      cursor.setDate(cursor.getDate() + 1);
    }
    return Math.max(1, duration);
  }

  private addScheduledDaysToDateString(dateStr: string, days: number): string {
    const cursor = this.toDateOnly(dateStr);
    const direction = days < 0 ? -1 : 1;
    let remaining = Math.abs(days);
    while (remaining > 0) {
      cursor.setDate(cursor.getDate() + direction);
      if (this.isWorkingDate(cursor)) remaining--;
    }
    return `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
  }

  private hasInvalidDateRange(start?: string | null, end?: string | null): boolean {
    if (!start || !end) return false;
    const normalizedStart = this.normalizeDateString(start);
    const normalizedEnd = this.normalizeDateString(end);
    return normalizedStart !== null && normalizedEnd !== null && normalizedEnd < normalizedStart;
  }

  private syncSelectedTaskFromForm(changed: 'baselineStart' | 'baselineEnd' | 'actualStart' | 'actualEnd' | 'duration'): void {
    if (!this.selectedTask || this.suppressFormAutoSave) return;
    const updated = { ...this.selectedTask, ...this.taskForm.getRawValue() };
    this.clearNonActivityAssignments(updated);
    if (!this.synchronizeTaskDates(updated, changed)) {
      this.taskForm.setErrors({ ...(this.taskForm.errors ?? {}), dateRange: true });
      return;
    }
    const formErrors = this.taskForm.errors;
    if (formErrors?.['dateRange']) {
      const { dateRange, ...otherErrors } = formErrors;
      this.taskForm.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
    }
    Object.assign(this.selectedTask, updated);
    const index = this.tasks.findIndex(t => t.id === updated.id);
    if (index !== -1) Object.assign(this.tasks[index], updated);
    this.trackCascadeUpdates(this.cascadeDependentTaskDates(updated, this.getCascadeModes(changed)));
    this.suppressFormAutoSave = true;
    this.taskForm.patchValue({
      durationDays: updated.durationDays,
      baselineStart: updated.baselineStart ?? '', baselineEnd: updated.baselineEnd ?? '',
      plannedStart: updated.plannedStart ?? '', plannedEnd: updated.plannedEnd ?? '',
      actualStart: updated.actualStart ?? '', actualEnd: updated.actualEnd ?? '',
      departmentCode: updated.departmentCode ?? '', resourceType: updated.resourceType ?? '', assignedUserId: updated.assignedUserId ?? null
    }, { emitEvent: false });
    this.suppressFormAutoSave = false;
    this.refreshGanttView();
  }

  // ---------------- Drawer ----------------
  selectTask(task: GmProjectScheduleTask): void {
    this.closeContextMenu();
    this.selectedTask = task;
  }

  openTaskDrawerFromRow(event: MouseEvent, task: GmProjectScheduleTask): void {
    const target = event.target as HTMLElement;
    if (target.closest('input, select, textarea, button, label')) return;
    this.openTaskDrawer(task);
  }

  openTaskDrawer(task: GmProjectScheduleTask): void {
    this.closeContextMenu();
    this.normalizeTaskDates(task);
    this.recalculateDurationFromDates(task);
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
    this.newSupplier = {
      resourceType: '', assignmentName: '', quantity: 1,
      unitsPercent: 100, cost: 0, assignedUserId: null, supplierId: null
    };
    this.resourceSearchTerm = '';
    if (task.resourceType) {
      this.newResource.resourceType = task.resourceType;
      this.filteredResourceOptions = this.resourceOptions.filter(
        u => (u.resourceType ?? '').toUpperCase() === (task.resourceType ?? '').toUpperCase()
      );
    } else {
      this.filteredResourceOptions = [...this.resourceOptions];
    }
    if (this.selectedTemplateScope === 'selected' && !task) {
      this.selectedTemplateScope = 'all';
    }
    this.loadTaskResources(task.id);
    this.loadSupplierOptions(task.id);
  }

  getTaskWbsById(taskId?: number | null): string {
    if (!taskId) return '—';
    const task = this.tasks.find(t => t.id === taskId);
    return task?.wbsCode ?? String(taskId);
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.selectedTask = null;
    this.taskResources = [];
    this.supplierOptions = [];
    this.newDependency = { predecessorTaskId: null, dependencyType: 'FS', lagDays: 0 };
    this.newResource = {
      resourceType: '',
      assignmentName: '',
      quantity: 1,
      unitsPercent: 100,
      cost: 0,
      assignedUserId: null
    };
    this.newSupplier = {
      resourceType: '', assignmentName: '', quantity: 1,
      unitsPercent: 100, cost: 0, assignedUserId: null, supplierId: null
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
    if (x + menuWidth > window.innerWidth - padding) x = window.innerWidth - menuWidth - padding;
    if (y + menuHeight > window.innerHeight - padding) y = window.innerHeight - menuHeight - padding;
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
      next: (res: any) => { this.actionsCount = res.total || 0; },
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
      next: () => { this.closeContextMenu(); this.loadActionsSummary(); alert('Action created successfully'); },
      error: (error) => { console.error(error); alert('Failed to create action'); }
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
    const current = this.tasks[index];
    const previous = this.tasks[index - 1];
    const currentLevel = this.getWbsLevel(current);
    const previousLevel = this.getWbsLevel(previous);
    if (currentLevel > previousLevel) return;
    let potentialParent: GmProjectScheduleTask | null = null;
    if (this.isSummary(previous)) {
      potentialParent = previous;
    } else {
      potentialParent = previous.parentId
        ? this.tasks.find(t => t.id === previous.parentId) ?? null
        : null;
    }
    if (!potentialParent || !this.isSummary(potentialParent)) {
      alert('A task can only be indented under a Summary task.');
      return;
    }
    this.pushHistory();
    current.parentId = potentialParent.id;
    current.outlineLevel = (potentialParent.outlineLevel ?? 1) + 1;
    const subtreeIds = new Set<number>();
    const collectSubtree = (taskId: number) => {
      subtreeIds.add(taskId);
      this.tasks.filter(t => t.parentId === taskId).forEach(child => collectSubtree(child.id));
    };
    collectSubtree(current.id);
    const subtree = this.tasks.filter(t => subtreeIds.has(t.id) && t.id !== current.id);
    subtree.forEach(t => { t.outlineLevel = (t.outlineLevel ?? 1) + 1; });
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
    const currentParent = current.parentId
      ? this.tasks.find(t => t.id === current.parentId)
      : null;
    const subtreeIds = new Set<number>();
    const collectSubtreeByParentId = (taskId: number) => {
      subtreeIds.add(taskId);
      this.tasks
        .filter(t => t.parentId === taskId)
        .forEach(child => collectSubtreeByParentId(child.id));
    };
    collectSubtreeByParentId(current.id);
    const subtree = this.tasks.filter(t => subtreeIds.has(t.id) && t.id !== current.id);
    current.parentId = currentParent?.parentId ?? null;
    current.outlineLevel = Math.max(1, (current.outlineLevel ?? 1) - 1);
    subtree.forEach(t => {
      t.outlineLevel = Math.max(1, (t.outlineLevel ?? 1) - 1);
    });
    if (currentParent) {
      const allSubtreeIds = new Set([current.id, ...subtree.map(t => t.id)]);
      const parentSubtreeIds = new Set<number>();
      const collectParentSubtree = (taskId: number) => {
        parentSubtreeIds.add(taskId);
        this.tasks
          .filter(t => t.parentId === taskId && !allSubtreeIds.has(t.id))
          .forEach(child => collectParentSubtree(child.id));
      };
      collectParentSubtree(currentParent.id);
      const withoutCurrent = this.tasks.filter(t => !allSubtreeIds.has(t.id));
      let insertAfterIndex = -1;
      for (let i = withoutCurrent.length - 1; i >= 0; i--) {
        if (parentSubtreeIds.has(withoutCurrent[i].id)) {
          insertAfterIndex = i;
          break;
        }
      }
      const currentSubtree = [current, ...subtree];
      this.tasks = [
        ...withoutCurrent.slice(0, insertAfterIndex + 1),
        ...currentSubtree,
        ...withoutCurrent.slice(insertAfterIndex + 1)
      ];
    }
    this.recalculateWbsCodes();
    this.recalculateDisplayOrders();
    this.recalculateSummaryDates();
    this.persistScheduleStructure();
    this.syncSelectedTaskReference();
  }

  indentTaskPersisted(): void {
    if (!this.selectedTask || this.structureSaving) return;
    const index = this.tasks.findIndex(task => task.id === this.selectedTask!.id);
    if (index <= 0) return;
    const current = this.tasks[index];
    const previous = this.tasks[index - 1];
    if (this.getWbsLevel(current) > this.getWbsLevel(previous)) return;
    const parent = this.isSummary(previous)
      ? previous
      : this.tasks.find(task => task.id === previous.parentId) ?? null;
    if (!parent || !this.isSummary(parent)) {
      alert('A task can only be indented under a Summary task.');
      return;
    }
    if (parent.id === current.id || this.getSubtreeTaskIds(current.id).has(parent.id)) return;
    this.pushHistory();
    current.parentId = parent.id;
    this.rebuildLocalTaskStructure();
  }

  outdentTaskPersisted(): void {
    if (!this.selectedTask || this.structureSaving) return;
    const current = this.tasks.find(task => task.id === this.selectedTask!.id);
    const parent = current ? this.tasks.find(task => task.id === current.parentId) ?? null : null;
    if (!current || !parent) return;
    this.pushHistory();
    const subtreeIds = this.getSubtreeTaskIds(current.id);
    const currentSubtree = this.tasks.filter(task => subtreeIds.has(task.id));
    const parentSubtreeIds = this.getSubtreeTaskIds(parent.id, subtreeIds);
    const withoutCurrent = this.tasks.filter(task => !subtreeIds.has(task.id));
    const insertAfterIndex = withoutCurrent.reduce(
      (lastIndex, task, index) => parentSubtreeIds.has(task.id) ? index : lastIndex,
      -1
    );
    current.parentId = parent.parentId ?? null;
    this.tasks = [
      ...withoutCurrent.slice(0, insertAfterIndex + 1),
      ...currentSubtree,
      ...withoutCurrent.slice(insertAfterIndex + 1)
    ];
    this.rebuildLocalTaskStructure();
  }

  private getSubtreeTaskIds(rootId: number, excludedIds = new Set<number>()): Set<number> {
    const ids = new Set<number>();
    const collect = (taskId: number): void => {
      if (ids.has(taskId) || excludedIds.has(taskId)) return;
      ids.add(taskId);
      this.tasks.filter(task => task.parentId === taskId).forEach(task => collect(task.id));
    };
    collect(rootId);
    return ids;
  }

  private rebuildLocalTaskStructure(): void {
    this.recalculateWbsCodes();
    this.recalculateDisplayOrders();
    this.refreshGanttView();
    this.persistScheduleStructure();
  }

  indentTaskFromContext(): void {
    if (!this.contextMenuTask) return;
    this.selectedTask = this.contextMenuTask;
    this.indentTaskPersisted();
    this.closeContextMenu();
  }

  outdentTaskFromContext(): void {
    if (!this.contextMenuTask) return;
    this.selectedTask = this.contextMenuTask;
    this.outdentTaskPersisted();
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
      next: (created) => { this.closeContextMenu(); this.loadSchedule(); this.selectedTask = created; },
      error: (err) => { console.error('Failed to insert task below', err); }
    });
  }

  copyTaskBelowContext(): void {
    if (!this.contextMenuTask) return;
    const source = this.contextMenuTask;
    this.closeContextMenu();
    this.service.copyTaskBelow(this.projectId, source.id).subscribe({
      next: (created) => {
        this.loadSchedule();
        setTimeout(() => {
          const savedCopy = this.tasks.find(t => t.id === created.id) ?? created;
          this.selectedTask = savedCopy;
          this.openTaskDrawer(savedCopy);
        }, 300);
      },
      error: (err) => { console.error('Failed to copy task below', err); alert('Failed to copy task below'); }
    });
  }

  deleteTaskFromContext(): void {
    if (!this.contextMenuTask) return;
    const confirmed = window.confirm(`Delete task "${this.contextMenuTask.name}"?`);
    if (!confirmed) return;
    const taskId = this.contextMenuTask.id;
    this.service.deleteTask(taskId).subscribe({
      next: () => {
        if (this.selectedTask?.id === taskId) this.closeDrawer();
        this.closeContextMenu();
        this.loadSchedule();
      },
      error: (err) => { console.error('Failed to delete task', err); }
    });
  }

  private generateFrontendTaskId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  private cloneTask(task: GmProjectScheduleTask): GmProjectScheduleTask {
    return JSON.parse(JSON.stringify(task));
  }

  // ---------------- Menu / filters ----------------
  toggleLevelMenu(): void { this.levelMenuOpen = !this.levelMenuOpen; this.deptMenuOpen = false; this.columnsMenuOpen = false; }
  toggleDeptMenu(): void { this.deptMenuOpen = !this.deptMenuOpen; this.levelMenuOpen = false; this.columnsMenuOpen = false; }
  toggleColumnsMenu(): void { this.columnsMenuOpen = !this.columnsMenuOpen; this.levelMenuOpen = false; this.deptMenuOpen = false; }
  setLevelFilter(level: number | 'ALL'): void { this.selectedLevelFilter = level; this.levelMenuOpen = false; }
  setDepartmentFilter(dept: string): void { this.selectedDepartmentFilter = dept; this.deptMenuOpen = false; }
  toggleColumn(columnKey: keyof typeof this.columnVisibility): void {
    this.columnVisibility[columnKey] = !this.columnVisibility[columnKey];
    this.persistGanttDisplayPreferences();
  }
  onColumnVisibilityChange(): void { this.persistGanttDisplayPreferences(); }
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
    const index = order.indexOf(this.activeZoom as any);
    if (index > 0) this.setZoom(order[index - 1]);
  }
  zoomIn(): void {
    const order: Array<'2W' | '2M' | '1M' | 'Day'> = ['2W', '2M', '1M', 'Day'];
    const index = order.indexOf(this.activeZoom as any);
    if (index < order.length - 1) this.setZoom(order[index + 1]);
  }
  setMode(mode: 'baseline' | 'actual'): void {
    this.activeMode = mode;
    if (this.selectedTask) this.patchTaskForm(this.selectedTask);
    this.buildTimeline();
    this.persistGanttDisplayPreferences();
  }
  setZoom(zoom: '2W' | '1M' | '2M' | 'Day'): void {
    this.activeZoom = zoom;
    this.dayWidth = this.getDayWidth(zoom);
    this.buildTimeline();
    this.persistGanttDisplayPreferences();
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
  getInlineNameValue(task: GmProjectScheduleTask): string {
    return this.inlineNameEdits.get(task.id)?.value ?? task.name ?? '';
  }
  beginInlineNameEdit(task: GmProjectScheduleTask): void {
    if (!this.inlineNameEdits.has(task.id)) {
      const name = task.name ?? '';
      this.inlineNameEdits.set(task.id, { original: name, value: name, committed: false });
    }
  }
  updateInlineNameDraft(task: GmProjectScheduleTask, value: string): void {
    const edit = this.inlineNameEdits.get(task.id);
    if (edit) {
      edit.value = value;
      edit.committed = false;
      return;
    }
    this.inlineNameEdits.set(task.id, { original: task.name ?? '', value, committed: false });
  }
  commitInlineNameEdit(task: GmProjectScheduleTask): void {
    const edit = this.inlineNameEdits.get(task.id);
    if (!edit || edit.committed) return;
    const name = edit.value.trim();
    if (!name) {
      edit.value = edit.original;
      return;
    }
    edit.committed = true;
    if (name !== edit.original) {
      this.updateLocalTaskField(task, 'name', name, false);
      this.saveInlineTask(task);
    }
    setTimeout(() => this.inlineNameEdits.delete(task.id));
  }
  handleInlineNameEnter(task: GmProjectScheduleTask, event: Event): void {
    event.preventDefault();
    this.commitInlineNameEdit(task);
    (event.target as HTMLInputElement).blur();
  }
  cancelInlineNameEdit(task: GmProjectScheduleTask, event: Event): void {
    event.preventDefault();
    const edit = this.inlineNameEdits.get(task.id);
    if (edit) {
      edit.value = edit.original;
      this.inlineNameEdits.delete(task.id);
    }
    (event.target as HTMLInputElement).value = task.name ?? '';
    (event.target as HTMLInputElement).blur();
  }
  onInlineDateChange(
    task: GmProjectScheduleTask,
    field: 'actualStart' | 'actualEnd' | 'baselineStart' | 'baselineEnd',
    value: string
  ): void {
    this.applyPickerDateChange(task, field, value);
  }

  private applyPickerDateChange(
    task: GmProjectScheduleTask,
    field: 'actualStart' | 'actualEnd' | 'baselineStart' | 'baselineEnd',
    value: string
  ): void {
    if (value === this.formatDateForInput(task[field])) return;
    this.updateLocalTaskField(task, field, value, false);
    this.saveInlineTask(task);
  }

  updateLocalTaskField(
    task: GmProjectScheduleTask,
    field: keyof GmProjectScheduleTask,
    value: any,
    queueAutoSave = true
  ): void {
    if ((field === 'departmentCode' || field === 'resourceType') && !this.isActivity(task)) return;
    const previousTaskState = { ...task };
    (task as any)[field] = value;
    if (field === 'taskType') this.clearNonActivityAssignments(task);
    if (field === 'taskType' && String(value).toUpperCase() === 'MILESTONE') {
      task.durationDays = 0;
      if (task.baselineStart) task.baselineEnd = task.baselineStart;
      if (task.plannedStart) task.plannedEnd = task.plannedStart;
      if (task.actualStart) task.actualEnd = task.actualStart;
    }
    const changed = field === 'durationDays' ? 'duration'
      : field === 'actualStart' ? 'actualStart'
      : field === 'actualEnd' ? 'actualEnd'
      : field === 'baselineStart' ? 'baselineStart'
      : field === 'baselineEnd' ? 'baselineEnd'
      : null;
    if (changed && !this.synchronizeTaskDates(task, changed)) {
      Object.assign(task, previousTaskState);
      this.refreshGanttView();
      return;
    }
    if (changed) {
      this.trackCascadeUpdates(this.cascadeDependentTaskDates(task, this.getCascadeModes(changed)));
    }
    this.refreshGanttView();
    const selectedTask = this.selectedTask;
    if (selectedTask?.id === task.id) {
      this.suppressFormAutoSave = true;
      this.patchTaskForm(selectedTask);
      this.suppressFormAutoSave = false;
    }
    if (queueAutoSave) this.queueTaskAutoSave(task);
  }

  private queueTaskAutoSave(task: GmProjectScheduleTask): void {
    clearTimeout(this.formAutoSaveTimer);
    this.formAutoSaveTimer = setTimeout(() => this.saveInlineTask(task), 600);
  }

  getPredecessorText(task: GmProjectScheduleTask): string {
    if (!task.dependencies?.length) return '—';
    return task.dependencies.map(dep => {
      const predTask = this.tasks.find(t => t.id === dep.predecessorTaskId);
      const ref = predTask?.wbsCode ?? dep.predecessorTaskId;
      const type = dep.dependencyType || 'FS';
      const lag = dep.lagDays ?? 0;
      const lagText = lag === 0 ? '' : lag > 0 ? `+${lag}d` : `${lag}d`;
      return `${ref}${type}${lagText}`;
    }).join(', ');
  }

  getEditableValue(task: GmProjectScheduleTask, field: keyof GmProjectScheduleTask): any {
    const edited = this.editedRows[task.id];
    const value = edited && field in edited ? edited[field] : task[field];
    return value ?? '';
  }

  updateInlineField(task: GmProjectScheduleTask, field: keyof GmProjectScheduleTask, value: any): void {
    if ((field === 'departmentCode' || field === 'resourceType') && !this.isActivity(task)) return;
    if (!this.editedRows[task.id]) this.editedRows[task.id] = {};
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
    this.refreshGanttView();
    this.pushHistory();
    this.saving = true;
    const payload = this.buildTaskUpdatePayload(this.selectedTask);
    this.service.updateTask(this.projectId, this.selectedTask.id, payload).subscribe({
      next: (updated) => {
        const index = this.tasks.findIndex(t => t.id === this.selectedTask!.id);
        if (index !== -1) {
          this.tasks[index] = { ...this.tasks[index], ...updated };
          this.selectedTask = this.tasks[index];
        }
        this.saving = false;
        this.refreshGanttView();
      },
      error: (err) => {
        console.error('Failed to update task', err);
        this.saving = false;
      }
    });
  }

  saveInlineTask(task: GmProjectScheduleTask): void {
    clearTimeout(this.formAutoSaveTimer);
    const tasksToSave = [task, ...[...this.pendingCascadeSaveIds]
      .map(id => this.tasks.find(candidate => candidate.id === id))
      .filter((candidate): candidate is GmProjectScheduleTask => !!candidate && candidate.id !== task.id)];
    this.pendingCascadeSaveIds.clear();
    tasksToSave.forEach(candidate => this.persistInlineTask(candidate));
  }

  private persistInlineTask(task: GmProjectScheduleTask): void {
    if (this.hasInvalidDateRange(task.baselineStart, task.baselineEnd)
      || this.hasInvalidDateRange(task.actualStart, task.actualEnd)) return;
    const payload = this.buildTaskUpdatePayload(task);
    this.service.updateTask(this.projectId, task.id, payload).subscribe({
      next: (updated) => {
        const index = this.tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
          this.tasks[index] = { ...this.tasks[index], ...updated };
        }
        if (this.selectedTask?.id === task.id) {
          this.selectedTask = this.tasks.find(t => t.id === task.id) ?? null;
          if (this.selectedTask) {
            this.suppressFormAutoSave = true;
            this.patchTaskForm(this.selectedTask);
            this.suppressFormAutoSave = false;
          }
        }
        this.refreshGanttView();
        this.editedRows[task.id] = {};
      },
      error: err => {
        console.error('Failed to autosave task', err);
      }
    });
  }

  private saveDraggedTask(task: GmProjectScheduleTask): void {
    if (this.activeMode === 'baseline') {
      this.recalculateDurationFromDates(task);
    } else if (this.isMilestone(task) && task.actualStart) {
      task.actualEnd = task.actualStart;
    }
    const payload = this.buildTaskUpdatePayload(task);
    this.service.updateTask(this.projectId, task.id, payload).subscribe({
      next: () => this.refreshGanttView(),
      error: err => { console.error('Failed to save dragged task', err); }
    });
  }

  // ---------------- History ----------------
  private pushHistory(): void {
    this.history.push(this.cloneTasks(this.tasks));
    if (this.history.length > 50) this.history.shift();
    this.future = [];
  }

  undo(): void {
    if (!this.history.length) return;
    this.future.push(this.cloneTasks(this.tasks));
    const previous = this.history.pop();
    if (previous) { this.tasks = this.cloneTasks(previous); this.computeStats(); this.buildTimeline(); this.syncSelectedTaskReference(); }
  }

  redo(): void {
    if (!this.future.length) return;
    this.history.push(this.cloneTasks(this.tasks));
    const next = this.future.pop();
    if (next) { this.tasks = this.cloneTasks(next); this.computeStats(); this.buildTimeline(); this.syncSelectedTaskReference(); }
  }

  private syncSelectedTaskReference(): void {
    if (!this.selectedTask) return;
    const refreshed = this.tasks.find(t => t.id === this.selectedTask?.id) ?? null;
    this.selectedTask = refreshed;
    if (refreshed && this.taskForm) this.patchTaskForm(refreshed);
  }

  // ---------------- Import / export ----------------
  exportScheduleJson(): void {
    const payload = { projectId: this.projectId, exportedAt: new Date().toISOString(), tasks: this.tasks };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${this.projectId}-schedule.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  openImportPicker(input: HTMLInputElement): void {
    this.importMenuOpen = false;
    input.click();
  }

  async importScheduleFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const rows = await this.readImportRows(file);
      const payload = rows.map((row, index) => this.toImportedTaskPayload(row, index));
      if (!payload.length) throw new Error('The file does not contain any task rows.');
      this.saving = true;
      this.importStatus = 'Importing schedule...';
      this.service.importSchedule(this.projectId, payload).subscribe({
        next: imported => {
          this.saving = false;
          this.importStatus = `${imported.length} task${imported.length === 1 ? '' : 's'} imported.`;
          this.loadSchedule();
        },
        error: err => {
          this.saving = false;
          this.importStatus = '';
          const message = err?.error?.message || err?.error?.detail || 'Import failed. No changes were saved.';
          console.error('Import failed', err);
          alert(message);
        }
      });
    } catch (error) {
      this.saving = false;
      this.importStatus = '';
      alert(error instanceof Error ? error.message : 'Invalid import file.');
    } finally {
      input.value = '';
    }
  }

  templateImportStatus = '';
 
  async importTemplateFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const rows = await this.readImportRows(file);
      const payload = rows.map((row, index) => this.toImportedTaskPayload(row, index));
      if (!payload.length) throw new Error('The file does not contain any task rows.');
 
      // Réutilise la structure de tâche déjà attendue par le composant
      // (le même format que celui produit par "Save Template").
    const idBySnapshotWbs = new Map<string, number>();
      payload.forEach((p, index) => {
        if (p.wbsCode) idBySnapshotWbs.set(p.wbsCode, -(index + 1));
      });
      const parentWbsOf = (wbs: string | undefined): string | null => {
        if (!wbs || !wbs.includes('.')) return null;
        return wbs.substring(0, wbs.lastIndexOf('.'));
      };
 
      const tasksForSnapshot = payload.map((p, index) => ({
        id: -(index + 1),
        parentId: idBySnapshotWbs.get(parentWbsOf(p.wbsCode) || '') ?? null,
        name: p.name,
        taskType: p.taskType,
        wbsCode: p.wbsCode,
        durationDays: p.durationDays,
        baselineStart: p.baselineStart,
        baselineEnd: p.baselineEnd,
        plannedStart: p.plannedStart,
        plannedEnd: p.plannedEnd,
        percentComplete: p.percentComplete,
        departmentCode: p.departmentCode,
        resourceType: p.resourceType,
        priority: 500,
        active: true,
        outlineLevel: 1,
        displayOrder: index + 1
      }));
 
      const fileName = file.name.replace(/\.(json|xlsx)$/i, '');
      this.templateImportStatus = 'Importing template...';
      this.templateService.createTemplate(this.projectId, {
        name: fileName || 'Imported Template',
        scope: 'all',
        description: `Imported from ${file.name}`,
        snapshotJson: JSON.stringify(tasksForSnapshot)
      }).subscribe({
        next: () => {
          this.templateImportStatus = `Template imported: ${payload.length} task(s).`;
          this.loadTemplates();
        },
        error: (err) => {
          this.templateImportStatus = '';
          console.error('Failed to import template', err);
          alert(err?.error?.message || 'Failed to import template.');
        }
      });
    } catch (error) {
      this.templateImportStatus = '';
      alert(error instanceof Error ? error.message : 'Invalid import file.');
    } finally {
      input.value = '';
    }
  }
  
  private async readImportRows(file: File): Promise<Record<string, unknown>[]> {
    const filename = file.name.toLowerCase();
    assertSpreadsheetFile(file, ['.json', '.xlsx', '.xls']);
    if (filename.endsWith('.json')) {
      const parsed = JSON.parse(await file.text());
      const rows = Array.isArray(parsed) ? parsed : parsed?.tasks;
      if (!Array.isArray(rows)) throw new Error('JSON must contain a task array or a { tasks: [] } object.');
      return rows as Record<string, unknown>[];
    }
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
 
      // Some "legacy .xls" exports (like report-generator downloads) are
      // actually HTML tables saved with an .xls extension. SheetJS's binary
      // parser cannot read these and throws an unhelpful internal error.
      // Sniff the first bytes and parse as HTML when detected.
      const sniff = new TextDecoder('utf-8').decode(buffer.slice(0, 512)).trim().toLowerCase();
      if (sniff.startsWith('<html') || sniff.startsWith('<!doctype') || sniff.startsWith('<table') || sniff.startsWith('<?xml')) {
        return this.parseHtmlTableRows(new TextDecoder('utf-8').decode(buffer));
      }
 
      let workbook;
      try {
        workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      } catch {
        throw new Error('This file could not be read as a spreadsheet. If it was exported from a web page, try re-saving it as a real .xlsx file first.');
      }
      const firstSheet = assertValidWorkbook(workbook);
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: null, raw: true });
      assertSpreadsheetRowLimit(rows);
      if (!rows.length) throw new Error('Excel file is empty.');
      const headers = Object.keys(rows[0]).map(header => this.normalizeImportHeader(header));
      if (!headers.some(header => ['task', 'taskname', 'name'].includes(header))) throw new Error('Schedule spreadsheet must include a Task or Name header.');
      return rows;
    }
    throw new Error('Choose a JSON, .xlsx, or .xls schedule file.');
  }
 
  /**
   * Parses an HTML <table> export (title/meta rows above the real header
   * are common — e.g. "Molisana — Schedule Export", "Exported: ...", a
   * blank row — so this scans for the first row containing a
   * Task/Name-like header instead of assuming row 0 is the header.
   */
  private parseHtmlTableRows(html: string): Record<string, unknown>[] {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) throw new Error('Could not find a table in this file.');
    const trs = Array.from(table.querySelectorAll('tr'));
    if (!trs.length) throw new Error('The table in this file has no rows.');
 
    let headerIndex = -1;
    let headers: string[] = [];
    for (let i = 0; i < trs.length; i++) {
      const cells = Array.from(trs[i].querySelectorAll('th,td')).map(c => (c.textContent || '').trim());
      const normalized = cells.map(c => this.normalizeImportHeader(c));
      if (normalized.some(h => ['task', 'taskname', 'name'].includes(h))) {
        headerIndex = i;
        headers = cells;
        break;
      }
    }
    if (headerIndex === -1) throw new Error('Could not find a Task/Name header row in this file.');
 
    const rows: Record<string, unknown>[] = [];
    for (let i = headerIndex + 1; i < trs.length; i++) {
      const cells = Array.from(trs[i].querySelectorAll('th,td')).map(c => (c.textContent || '').trim());
      if (!cells.some(c => c !== '')) continue;
      const row: Record<string, unknown> = {};
      headers.forEach((h, idx) => { if (h) row[h] = cells[idx] ?? ''; });
      rows.push(row);
    }
    assertSpreadsheetRowLimit(rows);
    return rows;
  }

  private toImportedTaskPayload(row: Record<string, unknown>, index: number): GmUpdateProjectTaskRequest {
    const rowNumber = index + 1;
    const value = (...headers: string[]): unknown => {
      const normalized = new Set(headers.map(header => this.normalizeImportHeader(header)));
      const key = Object.keys(row).find(candidate => normalized.has(this.normalizeImportHeader(candidate)));
      return key === undefined ? undefined : row[key];
    };
    const text = (...headers: string[]): string | undefined => {
      const raw = value(...headers);
      if (raw === undefined || raw === null || String(raw).trim() === '') return undefined;
      return String(raw).trim();
    };
    const date = (...headers: string[]): string | undefined => this.importDate(value(...headers), rowNumber);
    const integer = (label: string, ...headers: string[]): number | undefined => this.importInteger(value(...headers), rowNumber, label);
    const name = text('Task', 'Task Name', 'Name');
    if (!name) throw new Error(`Import row ${rowNumber}: task name is required.`);
    const taskType = (text('Type', 'Task Type') || 'ACTIVITY').toUpperCase();
    if (!['ACTIVITY', 'SUMMARY', 'MILESTONE'].includes(taskType)) {
      throw new Error(`Import row ${rowNumber}: task type must be ACTIVITY, SUMMARY, or MILESTONE.`);
    }
   const baselineStart = date('Baseline Start', 'Baseline Start Date', 'B.Start', 'BStart');
    const baselineEnd = date('Baseline End', 'Baseline End Date', 'B.End', 'BEnd');
    const plannedStart = date('Planned Start', 'Start', 'Start Date', 'P.Start', 'PStart');
    const plannedEnd = date('Planned End', 'End', 'End Date', 'P.End', 'PEnd');
    const actualStart = date('Actual Start', 'Actual Start Date');
    const actualEnd = date('Actual End', 'Actual End Date');
    const wbsCode = text('WBS', 'WBS Code');
    const task: GmProjectScheduleTask = {
      id: 0,
      name,
      taskType,
      wbsCode,
      outlineLevel: integer('outline level', 'Outline Level') ?? (wbsCode ? wbsCode.split('.').length : 1),
      displayOrder: integer('display order', 'Display Order') ?? index + 1,
      description: text('Description'),
      baselineStart: baselineStart ?? plannedStart,
      baselineEnd: baselineEnd ?? plannedEnd,
      plannedStart: plannedStart ?? baselineStart,
      plannedEnd: plannedEnd ?? baselineEnd,
      actualStart,
      actualEnd,
      durationDays: integer('duration', 'Duration', 'Duration Days', 'Baseline Duration'),
      percentComplete: integer('progress', 'Progress', 'Percent Complete', '%Done', 'PercentDone') ??  0,
     departmentCode: text('Department', 'Department Code', 'Dept'), 
      resourceType: text('Resource Type', 'Resource'),
      active: true,
      scheduleMode: 'AUTO',
      status: text('Status') ?? 'NOT_STARTED'
    };
    if ((task.percentComplete ?? 0) < 0 || (task.percentComplete ?? 0) > 100) {
      throw new Error(`Import row ${rowNumber}: progress must be between 0 and 100.`);
    }
    this.clearNonActivityAssignments(task);
    if (task.durationDays !== undefined && (task.durationDays < 0 || (taskType === 'ACTIVITY' && task.durationDays === 0))) {
      throw new Error(`Import row ${rowNumber}: duration is invalid for this task type.`);
    }
    this.normalizeImportedTaskDates(task);
    const importedChange = task.durationDays !== undefined
      ? (task.baselineStart ? 'baselineStart' : task.actualStart ? 'actualStart' : 'duration')
      : (task.baselineEnd ? 'baselineEnd' : task.actualEnd ? 'actualEnd' : 'duration');
    if (!this.synchronizeTaskDates(task, importedChange)) {
      throw new Error(`Import row ${rowNumber}: an end date cannot be before its start date.`);
    }
    return this.buildTaskUpdatePayload(task);
  }

  private normalizeImportedTaskDates(task: GmProjectScheduleTask): void {
    const moveToWorkingDay = (value: string | null | undefined, direction: 1 | -1): string | undefined => {
      if (!value) return undefined;
      const date = this.toDateOnly(value);
      while (!this.isWorkingDate(date)) date.setDate(date.getDate() + direction);
      return this.dateToString(date);
    };
    if (this.isMilestone(task)) {
      const baselineDate = moveToWorkingDay(task.baselineStart ?? task.plannedStart ?? task.baselineEnd ?? task.plannedEnd, 1);
      const actualDate = moveToWorkingDay(task.actualStart ?? task.actualEnd, 1);
      task.baselineStart = baselineDate;
      task.baselineEnd = baselineDate;
      task.plannedStart = baselineDate;
      task.plannedEnd = baselineDate;
      task.actualStart = actualDate;
      task.actualEnd = actualDate;
      return;
    }
    task.baselineStart = moveToWorkingDay(task.baselineStart, 1);
    task.plannedStart = moveToWorkingDay(task.plannedStart, 1);
    task.actualStart = moveToWorkingDay(task.actualStart, 1);
    task.baselineEnd = moveToWorkingDay(task.baselineEnd, -1);
    task.plannedEnd = moveToWorkingDay(task.plannedEnd, -1);
    task.actualEnd = moveToWorkingDay(task.actualEnd, -1);
    if (this.hasInvalidDateRange(task.baselineStart, task.baselineEnd)) task.baselineEnd = task.baselineStart;
    if (this.hasInvalidDateRange(task.plannedStart, task.plannedEnd)) task.plannedEnd = task.plannedStart;
    if (this.hasInvalidDateRange(task.actualStart, task.actualEnd)) task.actualEnd = task.actualStart;
  }

  private normalizeImportHeader(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private importInteger(value: unknown, row: number, label: string): number | undefined {
    if (value === undefined || value === null || String(value).trim() === '') return undefined;
    const parsed = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      throw new Error(`Import row ${row}: ${label} must be a whole number.`);
    }
    return parsed;
  }

  private importDate(value: unknown, row: number): string | undefined {
    if (value === undefined || value === null || String(value).trim() === '') return undefined;
    let date: Date | undefined;
    if (value instanceof Date) date = value;
    else if (typeof value === 'number') {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) date = new Date(parsed.y, parsed.m - 1, parsed.d);
    } else {
      const source = String(value).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(source)) return source;
      const parsed = new Date(source);
      if (!Number.isNaN(parsed.getTime())) date = parsed;
    }
    if (!date || Number.isNaN(date.getTime())) throw new Error(`Import row ${row}: date is invalid.`);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private dateToString(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private refreshGanttView(): void {
    this.recalculateSummaryDates();
    this.tasks = this.tasks.map(task => ({
      ...task,
      dependencies: task.dependencies?.map(dependency => ({ ...dependency }))
    }));
    this.computeStats();
    this.buildTimeline();
    this.syncSelectedTaskReference();
    this.changeDetector.markForCheck();
  }

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
    const childrenMap = new Map<number | null, GmProjectScheduleTask[]>();
    for (const task of this.tasks) {
      const key = task.parentId ?? null;
      if (!childrenMap.has(key)) childrenMap.set(key, []);
      childrenMap.get(key)!.push(task);
    }
    const assignWbs = (tasks: GmProjectScheduleTask[], prefix: string, level: number): void => {
      tasks.forEach((task, index) => {
        const wbs = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
        task.wbsCode = wbs;
        task.outlineLevel = level;
        const children = childrenMap.get(task.id);
        if (children?.length) assignWbs(children, wbs, level + 1);
      });
    };
    const roots = childrenMap.get(null) ?? [];
    assignWbs(roots, '', 1);
  }

  private recalculateDisplayOrders(): void {
    this.tasks.forEach((task, index) => { task.displayOrder = index + 1; });
  }

  private recalculateSummaryDates(): void {
    const summaries = [...this.tasks]
      .filter(t => this.isSummary(t))
      .sort((a, b) => this.getTaskLevel(b) - this.getTaskLevel(a));
    summaries.forEach(summary => {
      const children = this.tasks.filter(t => this.isDescendantOf(t, summary) && !this.isSummary(t));
      if (!children.length) return;
      const baselineStarts = children.map(t => t.baselineStart ?? t.plannedStart).filter((d): d is string => !!d);
      const baselineEnds = children.map(t => t.baselineEnd ?? t.plannedEnd).filter((d): d is string => !!d);
      const actualStarts = children.map(t => t.actualStart).filter((d): d is string => !!d);
      const actualEnds = children.map(t => t.actualEnd).filter((d): d is string => !!d);
      if (baselineStarts.length) summary.baselineStart = baselineStarts.sort()[0];
      if (baselineEnds.length) summary.baselineEnd = baselineEnds.sort()[baselineEnds.length - 1];
      if (actualStarts.length) summary.actualStart = actualStarts.sort()[0];
      if (actualEnds.length) summary.actualEnd = actualEnds.sort()[actualEnds.length - 1];
      this.normalizeTaskDates(summary);
      this.recalculateDurationFromDates(summary);
    });
  }

  private persistScheduleStructure(): void {
    if (this.structureSaving) return;
    this.structureSaving = true;
    const structure = this.tasks.map(task => ({
      taskId: task.id,
      parentId: task.parentId ?? null,
      displayOrder: task.displayOrder ?? 0
    }));
    this.service.updateTaskStructure(this.projectId, structure).pipe(
      finalize(() => this.structureSaving = false)
    ).subscribe({
      next: () => { /* local hierarchy is already rendered and persisted */ },
      error: err => {
        console.error('Failed to persist task hierarchy', err);
      }
    });
  }

  getRowId(task?: GmProjectScheduleTask | null): string {
    if (!task) return '—';
    return String(task.displayOrder ?? task.id);
  }

  // ---------------- Settings ----------------
  toggleSettings(): void { this.settingsOpen = !this.settingsOpen; }
  closeSettingsOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('settings-overlay')) this.settingsOpen = false;
  }

  // ---------------- Resize ----------------
  private getLeftPaneWidthLimits(): { min: number; max: number } {
    const containerWidth = this.plannerMain?.nativeElement.clientWidth ?? window.innerWidth;
    const min = Math.min(this.minLeftPaneWidth, Math.max(0, containerWidth - this.plannerResizerWidth));
    const max = Math.max(min, containerWidth - this.minTimelineWidth - this.plannerResizerWidth);
    return { min, max };
  }

  private clampLeftPaneWidth(width = this.leftPaneWidth): void {
    const { min, max } = this.getLeftPaneWidthLimits();
    this.leftPaneWidth = Math.min(max, Math.max(min, width));
  }


  
  startResize(event: MouseEvent): void {
    event.preventDefault();
    this.isResizing = true;
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isResizing) return;
      const containerLeft = this.plannerMain?.nativeElement.getBoundingClientRect().left ?? 0;
      this.clampLeftPaneWidth(moveEvent.clientX - containerLeft);
    };
    const onMouseUp = () => {
      this.isResizing = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.classList.remove('resizing-pane');
      this.persistGanttDisplayPreferences();
    };
    document.body.classList.add('resizing-pane');
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  // ---------------- Templates ----------------
  saveTemplateWithName(scope?: 'all' | 'selected'): void {
    const finalScope = scope ?? this.selectedTemplateScope;
    const name = this.templateName?.trim() || (finalScope === 'all' ? 'Full Schedule' : 'Selected Tasks');
    const tasksToSave = finalScope === 'all' ? this.cloneTasks(this.tasks) : this.cloneTasks(this.getSelectedTemplateTasks());
    if (!tasksToSave.length) { console.error('No tasks selected for template'); return; }
    this.templateService.createTemplate(this.projectId, { name, scope: finalScope, description: this.templateDescription?.trim() || '', snapshotJson: JSON.stringify(tasksToSave) }).subscribe({
      next: () => { this.templateName = ''; this.templateDescription = ''; this.selectedTemplateScope = 'all'; this.selectedTemplateTaskIds.clear(); this.loadTemplates(); },
      error: (err) => { console.error('Failed to save template', err); }
    });
  }

  applyTemplate(templateId: number): void {
    const template = this.templates.find(t => t.id === templateId);
    if (!template || this.applyingTemplate) return;
    this.applyingTemplate = true;
    this.templateService.applyTemplate(this.projectId, templateId).pipe(
      finalize(() => this.applyingTemplate = false)
    ).subscribe({
      next: () => {
        this.closeDrawer();
        this.loadSchedule();
      },
      error: (err) => {
        console.error('Failed to apply template to schedule', err);
      }
    });
  }

  deleteTemplate(templateId: number): void {
    this.templateService.deleteTemplate(this.projectId, templateId).subscribe({
      next: () => { this.templates = this.templates.filter(t => t.id !== templateId); },
      error: (err) => { console.error('Failed to delete template', err); }
    });
  }

  openTemplateTab(): void { this.settingsTab = 'templates'; this.loadTemplates(); }

  getTemplateTaskTypeLabel(task: GmProjectScheduleTask): string {
    if (this.isSummary(task)) return 'summary';
    if (this.isMilestone(task)) return 'milestone';
    return 'activity';
  }

  // ---------------- Calendars ----------------
  createDefaultCalendar(): void {
    this.editingCalendarId = null;
    this.calendarName = '';
    this.calendarWorkingDays = [1, 2, 3, 4, 5];
    this.calendarEditorOpen = true;
  }

  editCalendar(calendar: ProjectCalendar): void {
    this.editingCalendarId = calendar.id;
    this.calendarName = calendar.name;
    this.calendarWorkingDays = [...calendar.workingDays];
    this.calendarEditorOpen = true;
  }

  toggleCalendarWorkingDay(day: number, checked: boolean): void {
    this.calendarWorkingDays = checked
      ? Array.from(new Set([...this.calendarWorkingDays, day])).sort()
      : this.calendarWorkingDays.filter(value => value !== day);
  }

  saveCalendar(): void {
    const name = this.calendarName.trim();
    if (!name || !this.calendarWorkingDays.length) return;
    const payload = { name, workingDays: this.calendarWorkingDays, hoursPerDay: 8, startTime: '08:00', isDefault: this.editingCalendarId === null };
    const request = this.editingCalendarId === null
      ? this.calendarService.createCalendar(this.projectId, payload)
      : this.calendarService.updateCalendar(this.projectId, this.editingCalendarId, payload);
    request.subscribe({
      next: () => { this.calendarEditorOpen = false; this.loadSchedule(); },
      error: (err) => console.error('Failed to save calendar', err)
    });
  }

  makeCalendarDefault(calendarId: number): void {
    this.calendarService.makeDefault(this.projectId, calendarId).subscribe({ next: () => this.loadSchedule(), error: (err) => console.error('Failed to make calendar default', err) });
  }

  deleteCalendar(calendarId: number): void {
    this.calendarService.deleteCalendar(this.projectId, calendarId).subscribe({ next: () => this.loadCalendars(), error: (err) => console.error('Failed to delete calendar', err) });
  }

  getCalendarDaysLabel(days: number[]): string {
    const map: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
    return days.map(d => map[d]).join('-');
  }

  loadCalendars(): void {
    this.calendarService.getCalendars(this.projectId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.calendars = res ?? [];
        this.refreshActiveWorkingDays();
      },
      error: (err) => {
        console.error('Failed to load calendars', err);
        this.calendars = [];
        this.refreshActiveWorkingDays();
      }
    });
  }

  private refreshActiveWorkingDays(): void {
    const calendar = this.calendars.find(item => item.isDefault);
    const days = calendar?.workingDays?.filter(day => Number.isInteger(day) && day >= 1 && day <= 7);
    this.activeWorkingDays = days?.length ? [...days] : [1, 2, 3, 4, 5];
  }

  // ---------------- Baselines ----------------
  deleteBaseline(baselineId: number): void {
    this.baselineService.deleteBaseline(this.projectId, baselineId).subscribe({ next: () => this.loadBaselines(), error: (err) => { console.error('Failed to delete baseline', err); } });
  }

  openBaselineTab(): void { this.settingsTab = 'baseline'; this.loadBaselines(); }

  // ---------------- Task type helpers ----------------
  isMilestone(task?: GmProjectScheduleTask | null): boolean { return ((task?.taskType) || '').toUpperCase() === 'MILESTONE'; }
  isSummary(task?: GmProjectScheduleTask | null): boolean { return ((task?.taskType) || '').toUpperCase() === 'SUMMARY'; }
  isActivity(task?: GmProjectScheduleTask | null): boolean { return ((task?.taskType) || 'ACTIVITY').toUpperCase() === 'ACTIVITY'; }
  isCustomerMilestone(task: GmProjectScheduleTask): boolean { return this.isMilestone(task) && !!task.customerMilestone; }

  private clearNonActivityAssignments(task: GmProjectScheduleTask): void {
    if (this.isActivity(task)) return;
    task.departmentCode = '';
    task.resourceType = '';
    task.assignedUserId = null;
    task.assignedUserName = undefined;
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

  getSelectedTaskResourceType(): string { return this.selectedTask ? this.getResourceType(this.selectedTask) : '—'; }

  toggleSummary(task: GmProjectScheduleTask, event?: MouseEvent): void {
    event?.stopPropagation();
    if (!this.isSummary(task)) return;
    if (this.collapsedTaskIds.has(task.id)) this.collapsedTaskIds.delete(task.id);
    else this.collapsedTaskIds.add(task.id);
  }

  get visibleTasks(): GmProjectScheduleTask[] {
    return this.tasks.filter(task => !this.isHiddenByCollapsedParent(task) && this.matchesLevelFilter(task) && this.matchesDepartmentFilter(task));
  }

  private isHiddenByCollapsedParent(task: GmProjectScheduleTask): boolean {
    if (!task.wbsCode) return false;
    const parts = task.wbsCode.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentWbs = parts.slice(0, i).join('.');
      const parent = this.tasks.find(t => t.wbsCode === parentWbs && this.isSummary(t));
      if (parent && this.collapsedTaskIds.has(parent.id)) return true;
    }
    return false;
  }

  // ---------------- Timeline ----------------
  private buildTimeline(): void {
    const dates: Date[] = [];
    this.tasks.forEach(task => {
      const baselineStart = this.getBaselineStart(task);
      const baselineEnd = this.getBaselineEnd(task);
      if (baselineStart) dates.push(this.toDateOnly(baselineStart));
      if (baselineEnd) dates.push(this.toDateOnly(baselineEnd));
      if (task.actualStart) dates.push(this.toDateOnly(task.actualStart));
      if (task.actualEnd) dates.push(this.toDateOnly(task.actualEnd));
    });
    if (!dates.length) { this.timelineDays = []; return; }
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
        isMonthStart: cursor.getDate() === 1 || days.length === 0
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    this.timelineDays = days;
  }

  getTimelineWidth(): number { return this.timelineDays.length * this.dayWidth; }

  getTimelineMonths(): TimelineMonth[] {
    if (!this.timelineDays.length) return [];
    const months: TimelineMonth[] = [];
    let currentKey = '', currentLabel = '', currentCount = 0;
    this.timelineDays.forEach((day, index) => {
      const key = `${day.date.getFullYear()}-${day.date.getMonth()}`;
      const label = day.date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      if (key !== currentKey) {
        if (currentCount > 0) months.push({ label: currentLabel, width: currentCount * this.dayWidth });
        currentKey = key; currentLabel = label; currentCount = 1;
      } else { currentCount++; }
      if (index === this.timelineDays.length - 1) months.push({ label: currentLabel, width: currentCount * this.dayWidth });
    });
    return months;
  }

  trackTimelineDay(index: number): number { return index; }
  getTimelineDayLabel(day: TimelineDay): string { return String(day.date.getDate()).padStart(2, '0'); }
  isNonWorkingDay(day: TimelineDay): boolean { return !this.isWorkingDate(day.date); }
  getTodayLineLeft(): number { return this.getLeftFromDate(this.getTodayDateString()); }

  getBarLeft(task: GmProjectScheduleTask): number {
    if (this.activeMode === 'actual') return this.getLeftFromDate(task.actualStart ?? task.plannedStart);
    return this.getLeftFromDate(this.getBaselineStart(task));
  }

  getBarWidth(task: GmProjectScheduleTask): number {
    if (this.activeMode === 'actual') return this.getWidthFromDates(task.actualStart ?? task.plannedStart, task.actualEnd ?? task.plannedEnd, task.taskType);
    return this.getWidthFromDates(this.getBaselineStart(task), this.getBaselineEnd(task), task.taskType);
  }

  getBaselineStart(task: GmProjectScheduleTask): string | null | undefined { return task.baselineStart ?? task.plannedStart; }
  getBaselineEnd(task: GmProjectScheduleTask): string | null | undefined { return task.baselineEnd ?? task.plannedEnd; }
  getBaselineLeft(task: GmProjectScheduleTask): number { return this.getLeftFromDate(this.getBaselineStart(task)); }
  getBaselineWidth(task: GmProjectScheduleTask): number { return this.getWidthFromDates(this.getBaselineStart(task), this.getBaselineEnd(task), task.taskType); }
  getActualLeft(task: GmProjectScheduleTask): number { return this.getLeftFromDate(task.actualStart); }
  getActualWidth(task: GmProjectScheduleTask): number { return this.getWidthFromDates(task.actualStart, task.actualEnd, task.taskType); }

  getMilestoneLeft(task: GmProjectScheduleTask): number {
    return this.getBarLeft(task) + ((this.dayWidth - 12) / 2);
  }

  hasBaseline(task: GmProjectScheduleTask): boolean { return !!this.getBaselineStart(task) && !!this.getBaselineEnd(task); }
  hasActualDates(task: GmProjectScheduleTask): boolean { return !!task.actualStart && !!task.actualEnd; }

  // ---------------- Drag ----------------
  canDragTask(task: GmProjectScheduleTask): boolean { return !this.isSummary(task) && !this.isMilestone(task) && (this.activeMode === 'actual' || !this.activeBaselineId) && !!task.plannedStart && !!task.plannedEnd; }

  startBarDrag(event: MouseEvent, task: GmProjectScheduleTask): void {
    if (event.button !== 0) return;
    if (!this.canDragTask(task)) return;
    event.stopPropagation();
    event.preventDefault();
    const startField = this.activeMode === 'actual' ? 'actualStart' : 'baselineStart';
    const endField = this.activeMode === 'actual' ? 'actualEnd' : 'baselineEnd';
    this.dragState = { taskId: task.id, startClientX: event.clientX, originalStart: (task as any)[startField] ?? null, originalEnd: (task as any)[endField] ?? null, deltaDays: 0, mode: this.activeMode };
    if (!this.dragState.originalStart || !this.dragState.originalEnd) return;
    document.body.classList.add('resizing-pane');
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.dragState || this.dragState.taskId !== task.id) return;
      const deltaX = moveEvent.clientX - this.dragState.startClientX;
      const deltaDays = Math.round(deltaX / this.dayWidth);
      if (deltaDays === this.dragState.deltaDays) return;
      this.dragState.deltaDays = deltaDays;
      if (!this.dragState.originalStart || !this.dragState.originalEnd) return;
      const newStart = this.addDaysToDateString(this.dragState.originalStart, deltaDays);
      const newEnd = this.addDaysToDateString(this.dragState.originalEnd, deltaDays);
      const clamped = this.clampDragDates(task, newStart, newEnd);
      (task as any)[startField] = clamped.start;
      (task as any)[endField] = clamped.end;
      if (this.activeMode === 'baseline') this.recalculateDurationFromDates(task);
      if (this.selectedTask?.id === task.id) { this.selectedTask = task; this.patchTaskForm(task); }
      this.buildTimeline();
    };
    const onMouseUp = () => {
      document.body.classList.remove('resizing-pane');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (!this.dragState) return;
      const changed = (task as any)[startField] !== this.dragState.originalStart || (task as any)[endField] !== this.dragState.originalEnd;
      this.dragState = null;
      if (changed) { this.pushHistory(); this.saveDraggedTask(task); }
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
    if (this.isMilestone(task)) return { start, end: start };
    const startDate = this.toDateOnly(start);
    const endDate = this.toDateOnly(end);
    if (endDate < startDate) return { start, end: start };
    return { start, end };
  }

  // ---------------- Dependencies ----------------
  saveDependency(dep: TaskDependencyDto): void {
    if (!dep.id || !this.selectedTask) return;
    const payload: TaskDependencyDto = { id: dep.id, predecessorTaskId: dep.predecessorTaskId, successorTaskId: this.selectedTask.id, dependencyType: dep.dependencyType || 'FS', lagDays: Number(dep.lagDays ?? 0) };
    this.trackCascadeUpdates(this.cascadeDependentTaskDates(this.selectedTask, ['actual', 'baseline'], true));
    this.refreshGanttView();
    this.service.updateDependency(this.projectId, dep.id, payload).subscribe({
      next: () => this.saveInlineTask(this.selectedTask!),
      error: err => console.error('Failed to update dependency', err)
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
      if (!this.getBaselineStart(successor) && !this.getBaselineEnd(successor)) continue;
      for (const dep of successor.dependencies) {
        const pi = indexMap.get(dep.predecessorTaskId);
        if (pi == null) continue;
        const predecessor = visible[pi];
        if (!this.getBaselineStart(predecessor) && !this.getBaselineEnd(predecessor)) continue;
        const type = (dep.dependencyType || 'FS').toUpperCase();
        const sourceUsesStart = type === 'SS' || type === 'SF';
        const targetUsesEnd = type === 'FF' || type === 'SF';
        const startX = sourceUsesStart ? this.getTaskStartX(predecessor) : this.getTaskEndX(predecessor);
        const endX = targetUsesEnd ? this.getTaskEndX(successor) : this.getTaskStartX(successor);
        if (startX > timelineWidth && endX > timelineWidth) continue;
        if (startX <= 0 && endX <= 0) continue;
        const startY = this.getTaskAnchorY(predecessor, pi);
        const endY = this.getTaskAnchorY(successor, si);
        const sourceExitX = startX + (sourceUsesStart ? -10 : 10);
        const arrowDirection = targetUsesEnd ? 'left' : 'right';
        const arrowTipX = endX + (targetUsesEnd ? 3 : -3);
        const targetApproachX = arrowDirection === 'right' ? arrowTipX - 6 : arrowTipX + 6;
        const routeDirection = endY >= startY ? 1 : -1;
        const routeY = startY + routeDirection * (this.getTaskVisualHeight(predecessor) / 2 + 8);
        const segs: DependencySegment[] = [];
        segs.push({ direction: 'h', left: Math.min(startX, sourceExitX), top: startY, width: Math.abs(sourceExitX - startX), height: 2 });
        segs.push({ direction: 'v', left: sourceExitX, top: Math.min(startY, routeY), width: 2, height: Math.abs(routeY - startY) });
        segs.push({ direction: 'h', left: Math.min(sourceExitX, targetApproachX), top: routeY, width: Math.abs(targetApproachX - sourceExitX), height: 2 });
        segs.push({ direction: 'v', left: targetApproachX, top: Math.min(routeY, endY), width: 2, height: Math.abs(endY - routeY) });
        const lag = Number(dep.lagDays ?? 0);
        const lagText = lag === 0 ? '' : lag > 0 ? ` +${lag}d` : ` ${lag}d`;
        arrows.push({ segments: segs, arrowLeft: arrowTipX, arrowTop: endY - 4, arrowDirection, labelLeft: Math.min(startX, endX) + Math.abs(endX - startX) / 2, labelTop: Math.min(startY, endY) - 16, labelText: `${type}${lagText}` });
      }
    }
    return arrows;
  }

  private getTaskVisualTop(task: GmProjectScheduleTask): number { if (this.isMilestone(task)) return 11; if (this.isSummary(task)) return 14; return 10; }
  private getTaskVisualHeight(task: GmProjectScheduleTask): number { if (this.isMilestone(task)) return 14; if (this.isSummary(task)) return 7; return 18; }
  private getTaskAnchorY(task: GmProjectScheduleTask, index: number): number { return (index * this.rowHeight) + this.getTaskVisualTop(task) + (this.getTaskVisualHeight(task) / 2); }
  private getTaskStartX(task: GmProjectScheduleTask): number { if (this.isMilestone(task)) return this.getMilestoneLeft(task) + (this.milestoneSize / 2); return this.getBarLeft(task); }
  private getTaskEndX(task: GmProjectScheduleTask): number { if (this.isMilestone(task)) return this.getMilestoneLeft(task) + (this.milestoneSize / 2); return this.getBarLeft(task) + this.getBarWidth(task); }

  get availablePredecessorTasks(): GmProjectScheduleTask[] {
    if (!this.selectedTask) return [];
    return this.tasks.filter(task => task.id !== this.selectedTask?.id);
  }

  addDependency(): void {
    if (!this.selectedTask) return;
    const predecessorTaskId = this.newDependency.predecessorTaskId;
    if (!predecessorTaskId) return;
    if (predecessorTaskId === this.selectedTask.id) { console.error('A task cannot depend on itself.'); return; }
    const alreadyExists = (this.selectedTask.dependencies ?? []).some(dep => dep.predecessorTaskId === predecessorTaskId && (dep.dependencyType || 'FS') === (this.newDependency.dependencyType || 'FS'));
    if (alreadyExists) { console.error('Dependency already exists.'); return; }
    const payload: TaskDependencyDto = { predecessorTaskId, successorTaskId: this.selectedTask.id, dependencyType: this.newDependency.dependencyType || 'FS', lagDays: this.newDependency.lagDays ?? 0 };
    this.service.createDependency(this.projectId, payload).subscribe({
      next: (created) => {
        if (this.selectedTask) {
          this.selectedTask.dependencies = [...(this.selectedTask.dependencies ?? []), created];
          this.trackCascadeUpdates(this.cascadeDependentTaskDates(this.selectedTask, ['actual', 'baseline'], true));
          this.refreshGanttView();
          this.saveInlineTask(this.selectedTask);
        }
        this.newDependency = { predecessorTaskId: null, dependencyType: 'FS', lagDays: 0 };
      },
      error: (err) => { console.error('Failed to create dependency', err); }
    });
  }

  removeDependency(dependencyId?: number): void {
    if (!dependencyId) return;
    const task = this.selectedTask;
    if (!task) return;
    const previousDependencies = task.dependencies ?? [];
    task.dependencies = previousDependencies.filter(dependency => dependency.id !== dependencyId);
    this.trackCascadeUpdates(this.cascadeDependentTaskDates(task, ['actual', 'baseline'], true));
    this.refreshGanttView();
    this.service.deleteDependency(this.projectId, dependencyId).subscribe({
      next: () => this.saveInlineTask(task),
      error: (err) => { console.error('Failed to delete dependency', err); task.dependencies = previousDependencies; this.refreshGanttView(); }
    });
  }

  // ---------------- Resources ----------------
  loadTaskResources(taskId: number): void {
    this.service.getTaskResources(this.projectId, taskId).subscribe({
      next: (res) => {
        this.taskResources = res ?? [];
        this.supplierAssignmentIds = new Set(this.taskResources
          .filter(resource => !!resource.supplierId && !!resource.id)
          .map(resource => resource.id!));
      },
      error: (err) => { console.error('Failed to load task resources', err); this.taskResources = []; this.supplierAssignmentIds.clear(); }
    });
  }

  loadSupplierOptions(taskId: number): void {
    this.service.getTaskSupplierOptions(this.projectId, taskId).subscribe({
      next: suppliers => this.supplierOptions = suppliers ?? [],
      error: err => { console.error('Failed to load supplier options', err); this.supplierOptions = []; }
    });
  }

  addResource(): void {
    if (!this.selectedTask || !this.isActivity(this.selectedTask)) return;
    if (!this.newResource.assignedUserId) { console.error('Please select a real resource from the dropdown.'); return; }
    const selectedUser = this.resourceOptions.find(r => r.id === Number(this.newResource.assignedUserId));
    const payload: TaskResourceAssignment = { resourceType: selectedUser?.resourceType || this.newResource.resourceType || undefined, assignmentName: selectedUser?.fullName || this.newResource.assignmentName || undefined, quantity: this.newResource.quantity ?? 1, unitsPercent: this.newResource.unitsPercent ?? 100, cost: this.newResource.cost ?? 0, assignedUserId: Number(this.newResource.assignedUserId) };
    this.service.createTaskResource(this.projectId, this.selectedTask.id, payload).subscribe({
      next: () => {
        if (this.selectedTask && selectedUser) {
          this.selectedTask.assignedUserId = selectedUser.id;
          this.selectedTask.assignedUserName = selectedUser.fullName;
          this.selectedTask.resourceType = selectedUser.resourceType;
          this.selectedTask.departmentCode = selectedUser.departmentCode;
          this.taskForm.patchValue({ assignedUserId: selectedUser.id, resourceType: selectedUser.resourceType, departmentCode: selectedUser.departmentCode }, { emitEvent: false });
          this.saveInlineTask(this.selectedTask);
        }
        this.newResource = { resourceType: '', assignmentName: '', quantity: 1, unitsPercent: 100, cost: 0, assignedUserId: null };
        this.loadTaskResources(this.selectedTask!.id);
      },
      error: (err) => console.error('Failed to create task resource', err)
    });
  }

  saveResource(resource: TaskResourceAssignment): void {
    if (!this.selectedTask || !this.isActivity(this.selectedTask) || !resource.id) return;
    const payload: TaskResourceAssignment = { ...resource, resourceType: resource.resourceType?.trim() || undefined, assignmentName: resource.assignmentName?.trim() || undefined, quantity: resource.quantity ?? 1, unitsPercent: resource.unitsPercent ?? 100, cost: resource.cost ?? 0, assignedUserId: resource.assignedUserId ?? null };
    this.service.updateTaskResource(this.projectId, this.selectedTask.id, resource.id, payload).subscribe({ next: () => { this.loadTaskResources(this.selectedTask!.id); this.loadSchedule(); }, error: (err) => console.error('Failed to update task resource', err) });
  }

  getSupplierOptionsFor(resource: TaskResourceAssignment): { id: number; code: string | null; name: string; resourceTypeCodes: string[] }[] {
    const resourceType = (resource.resourceType ?? '').trim().toUpperCase();
    const linked = resourceType
      ? this.supplierOptions.filter(supplier => supplier.resourceTypeCodes.some(code => code.toUpperCase() === resourceType))
      : [];
    if (!resource.supplierId || linked.some(supplier => supplier.id === resource.supplierId)) {
      return linked;
    }
    return [{
      id: resource.supplierId,
      code: resource.supplierCode ?? null,
      name: resource.supplierName || resource.assignmentName || 'Inactive supplier',
      resourceTypeCodes: resourceType ? [resourceType] : []
    }, ...linked];
  }

  supplierLabel(supplier: { code: string | null; name: string }): string {
    return supplier.code ? `${supplier.code} - ${supplier.name}` : supplier.name;
  }

  onExistingSupplierChange(resource: TaskResourceAssignment, supplierId: number | null): void {
    const supplier = this.getSupplierOptionsFor(resource).find(item => item.id === Number(supplierId));
    resource.supplierId = supplierId ? Number(supplierId) : null;
    resource.supplierCode = supplier?.code ?? null;
    resource.supplierName = supplier?.name ?? null;
    resource.assignmentName = supplier?.name ?? '';
    this.saveResource(resource);
  }

  onExistingSupplierResourceTypeChange(resource: TaskResourceAssignment, resourceType: string): void {
    resource.resourceType = resourceType;
    if (!this.supplierIsLinkedToResourceType(resource.supplierId, resourceType)) {
      resource.supplierId = null;
      resource.supplierCode = null;
      resource.supplierName = null;
      resource.assignmentName = '';
      return;
    }
    this.saveResource(resource);
  }

  isSupplierResourceAssignment(resource: TaskResourceAssignment): boolean {
    return !!resource.supplierId || (!!resource.id && this.supplierAssignmentIds.has(resource.id));
  }

  onNewSupplierResourceTypeChange(resourceType: string): void {
    this.newSupplier.resourceType = resourceType;
    if (!this.getNewSupplierOptions().some(option => option.id === this.newSupplier.supplierId)) {
      this.newSupplier.supplierId = null;
    }
  }

  getNewSupplierOptions(): { id: number; code: string | null; name: string; resourceTypeCodes: string[] }[] {
    const resourceType = (this.newSupplier.resourceType ?? '').trim().toUpperCase();
    if (!resourceType) return [];
    return this.supplierOptions.filter(supplier =>
      supplier.resourceTypeCodes.some(code => code.toUpperCase() === resourceType));
  }

  private supplierIsLinkedToResourceType(supplierId: number | null | undefined, resourceType: string | null | undefined): boolean {
    const normalizedType = (resourceType ?? '').trim().toUpperCase();
    if (!supplierId || !normalizedType) return false;
    return this.supplierOptions.some(supplier => supplier.id === supplierId
      && supplier.resourceTypeCodes.some(code => code.toUpperCase() === normalizedType));
  }

  removeResource(assignmentId?: number): void {
    if (!this.selectedTask || !assignmentId) return;
    this.service.deleteTaskResource(this.projectId, this.selectedTask.id, assignmentId).subscribe({ next: () => { this.loadTaskResources(this.selectedTask!.id); this.loadSchedule(); }, error: (err) => console.error('Failed to delete task resource', err) });
  }

  getSelectedAssignedUserName(): string { return this.selectedTask?.assignedUserName || 'No user assigned'; }

  onNewResourceTypeChange(resourceType: string): void {
    this.newResource.resourceType = resourceType;
    this.newResource.assignedUserId = null;
    this.newResource.assignmentName = '';
    if (resourceType && resourceType !== 'ALL') this.filterResources();
    else this.filteredResourceOptions = [...this.resourceOptions];
  }

  onResourceSearch(): void { this.filterResources(); }

  private filterResources(): void {
    let filtered = [...this.resourceOptions];
    const selectedType = (this.newResource.resourceType ?? '').trim().toUpperCase();
    if (selectedType && selectedType !== 'ALL') filtered = filtered.filter(u => (u.resourceType ?? '').toUpperCase() === selectedType);
    const term = (this.resourceSearchTerm ?? '').trim().toLowerCase();
    if (term) filtered = filtered.filter(u => (u.fullName ?? '').toLowerCase().includes(term) || (u.resourceType ?? '').toLowerCase().includes(term) || (u.departmentCode ?? '').toLowerCase().includes(term));
    this.filteredResourceOptions = filtered;
  }

  loadResourceOptions(): void {
    this.service.getResourceUsers(this.projectId).subscribe({
      next: (users) => {
        this.resourceOptions = users.map(u => ({ id: u.id, fullName: u.fullName, resourceType: u.resourceType || '', departmentCode: u.departmentCode || '' }));
        this.filteredResourceOptions = [...this.resourceOptions];
        this.departmentCodes = [...new Set(this.resourceOptions.map(u => u.departmentCode).filter(d => !!d))].sort();
      },
      error: (err) => { console.error('Could not load resource users', err); this.resourceOptions = []; this.filteredResourceOptions = []; }
    });
  }

  onResourceSearchInput(): void {
    const term = (this.resourceSearchTerm ?? '').trim().toLowerCase();
    if (!term) { this.resourceSearchResults = []; this.showResourceDropdown = false; return; }
    let filtered = [...this.resourceOptions];
    const selectedType = (this.newResource.resourceType ?? '').trim().toUpperCase();
    if (selectedType) filtered = filtered.filter(u => (u.resourceType ?? '').toUpperCase() === selectedType);
    this.resourceSearchResults = filtered.filter(u => (u.fullName ?? '').toLowerCase().includes(term) || (u.resourceType ?? '').toLowerCase().includes(term));
    this.showResourceDropdown = this.resourceSearchResults.length > 0;
  }

  selectResourceFromSearch(user: { id: number; fullName: string; resourceType: string; departmentCode: string }): void {
    this.newResource.assignedUserId = user.id;
    this.newResource.assignmentName = user.fullName;
    if (!this.newResource.resourceType) this.newResource.resourceType = user.resourceType;
    this.resourceSearchTerm = user.fullName;
    this.showResourceDropdown = false;
    this.resourceSearchResults = [];
  }

  onNewResourceUserChange(userId: number | null): void {
    if (this.selectedTask && !this.isActivity(this.selectedTask)) return;
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
      this.taskForm.patchValue({ assignedUserId: user.id, resourceType: user.resourceType, departmentCode: user.departmentCode }, { emitEvent: false });
    }
  }

  addSupplierAssignment(): void {
    if (!this.selectedTask || !this.isActivity(this.selectedTask)) return;
    const supplier = this.supplierOptions.find(item => item.id === Number(this.newSupplier.supplierId));
    if (!this.newSupplier.resourceType) { console.error('Please select a resource type first.'); return; }
    if (!supplier || !this.getNewSupplierOptions().some(option => option.id === supplier.id)) {
      console.error('Please select a supplier linked to the resource type.');
      return;
    }
    const payload: TaskResourceAssignment = {
      resourceType: this.newSupplier.resourceType, assignmentName: supplier.name,
      quantity: this.newSupplier.quantity ?? 1, unitsPercent: this.newSupplier.unitsPercent ?? 100,
      cost: this.newSupplier.cost ?? 0, assignedUserId: null, supplierId: supplier.id
    };
    this.service.createTaskResource(this.projectId, this.selectedTask.id, payload).subscribe({
      next: () => { this.newSupplier = { resourceType: '', assignmentName: '', quantity: 1, unitsPercent: 100, cost: 0, assignedUserId: null, supplierId: null }; this.loadTaskResources(this.selectedTask!.id); this.loadSchedule(); },
      error: err => { console.error('Failed to create supplier assignment', err); }
    });
  }

  // ---------------- Scroll sync ----------------
  private syncScroll(source: HTMLElement, target: HTMLElement, axis: 'vertical' | 'horizontal'): void {
    if (axis === 'vertical') target.scrollTop = source.scrollTop;
    else target.scrollLeft = source.scrollLeft;
  }

  onTableScroll(): void {
    if (!this.tableBodyScroll) return;
    const tableBodyEl = this.tableBodyScroll.nativeElement;
    if (this.ganttBodyScroll && !this.syncingVertical) { this.syncingVertical = true; this.syncScroll(tableBodyEl, this.ganttBodyScroll.nativeElement, 'vertical'); requestAnimationFrame(() => { this.syncingVertical = false; }); }
    if (this.leftHeaderScroll && !this.syncingHorizontal) { this.syncingHorizontal = true; this.syncScroll(tableBodyEl, this.leftHeaderScroll.nativeElement, 'horizontal'); requestAnimationFrame(() => { this.syncingHorizontal = false; }); }
    if (this.contextMenuOpen) this.closeContextMenu();
  }

  onGanttScroll(): void {
    if (!this.ganttBodyScroll) return;
    const ganttBodyEl = this.ganttBodyScroll.nativeElement;
    if (this.tableBodyScroll && !this.syncingVertical) { this.syncingVertical = true; this.syncScroll(ganttBodyEl, this.tableBodyScroll.nativeElement, 'vertical'); requestAnimationFrame(() => { this.syncingVertical = false; }); }
    if (!this.syncingHorizontal) {
      this.syncingHorizontal = true;
      if (this.monthHeaderScroll) this.syncScroll(ganttBodyEl, this.monthHeaderScroll.nativeElement, 'horizontal');
      if (this.timelineHeaderScroll) this.syncScroll(ganttBodyEl, this.timelineHeaderScroll.nativeElement, 'horizontal');
      requestAnimationFrame(() => { this.syncingHorizontal = false; });
    }
    if (this.contextMenuOpen) this.closeContextMenu();
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
    if (this.columnVisibility.baselineStart) cols.push('95px');
    if (this.columnVisibility.milestone) cols.push('120px');
    if (this.columnVisibility.baselineEnd) cols.push('95px');
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
    if (this.columnVisibility.baselineStart) total += 95;
    if (this.columnVisibility.milestone) total += 120;
    if (this.columnVisibility.baselineEnd) total += 95;
    return total;
  }

  // ---------------- Stats / date helpers ----------------
  private computeStats(): void {
    this.stats.total = this.tasks.length;
    this.stats.milestones = this.tasks.filter(t => this.isMilestone(t)).length;
    this.stats.summaries = this.tasks.filter(t => this.isSummary(t)).length;
    const normalTasks = this.tasks.filter(t => !this.isSummary(t));
    const totalProgress = normalTasks.reduce((sum, t) => sum + (t.percentComplete ?? 0), 0);
    this.stats.avgProgress = normalTasks.length ? Math.round(totalProgress / normalTasks.length) : 0;
  }

  private getLeftFromDate(value?: string | null): number {
    const dayIndex = this.getTimelineDayIndex(value);
    return dayIndex < 0 ? 0 : dayIndex * this.dayWidth;
  }

  loadConfiguredResourceTypes(): void {
    this.resourceConfigService.getResourceTypes().subscribe({
      next: resourceTypes => this.resourceTypes = (resourceTypes ?? [])
        .filter(resourceType => resourceType.active && resourceType.assignable)
        .map(resourceType => resourceType.code)
        .sort(),
      error: err => console.error('Could not load configured resource types', err)
    });
  }

  private getWidthFromDates(startValue?: string | null, endValue?: string | null, type?: string | null): number {
    if ((type || '').toUpperCase() === 'MILESTONE') return 12;
    if (!startValue || !endValue) return this.dayWidth;
    const startIndex = this.getTimelineDayIndex(startValue);
    const endIndex = this.getTimelineDayIndex(endValue);
    if (startIndex < 0 || endIndex < startIndex) return this.dayWidth;
    return (endIndex - startIndex + 1) * this.dayWidth;
  }

  private getTimelineDayIndex(value?: string | null): number {
    if (!value || !this.timelineDays.length) return -1;
    const dateKey = this.dateToString(this.toDateOnly(value));
    return this.timelineDays.findIndex(day => this.dateToString(day.date) === dateKey);
  }

  private toDateOnly(value: string): Date {
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (isoDate) return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
    const displayDate = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
    if (displayDate) return new Date(Number(displayDate[3]), Number(displayDate[2]) - 1, Number(displayDate[1]));
    const d = new Date(value);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private cloneTasks(tasks: GmProjectScheduleTask[]): GmProjectScheduleTask[] { return JSON.parse(JSON.stringify(tasks)); }

  normalizeTaskType(value?: string | null): string {
    const normalized = (value ?? 'ACTIVITY').toUpperCase();
    if (normalized === 'SUMMARY') return 'SUMMARY';
    if (normalized === 'MILESTONE') return 'MILESTONE';
    return 'ACTIVITY';
  }

  // ================= MILESTONES (CORRIGÉ) =================
  loadMilestoneTypes(): void {
    console.log('Loading milestones...');
    this.milestoneService.getMilestoneTypes(this.projectId).subscribe({
      next: (types) => {
        console.log('Milestones loaded:', types);
        this.milestoneTypes = (types ?? []).map(type => ({ ...type, id: Number(type.id) }));
      },
      error: (err) => {
        console.error('Failed to load milestone types', err);
        this.milestoneTypes = [];
      }
    });
  }

  saveNewMilestoneType(): void {
    const name = this.newMilestoneType.label.trim();
    if (!name) return;
    const payload = {
      ...this.newMilestoneType,
      label: name,
      code: this.newMilestoneType.code.trim() || name.slice(0, 20).toUpperCase()
    };
    this.milestoneService.createMilestoneType(this.projectId, payload).subscribe({
      next: (created) => {
        this.milestoneTypes.push(created);
        this.newMilestoneType = { code: '', label: '', color: '#cccccc', letterCode: '' };
      },
      error: (err) => console.error('Failed to create milestone type', err)
    });
  }

  loadDefaultMilestones(): void {
    this.loadMilestoneTypes();
    return;
    const defaultMilestones = [
      { code: 'RT', label: 'RT', letterCode: '', color: '#7FFFD4' },
      { code: 'KOM', label: 'KOM', letterCode: '', color: '#228B22' },
      { code: 'DISTINTA UTM', label: 'DISTINTA UTM', letterCode: '', color: '#FF69B4' },
      { code: 'DISTINTA UTE', label: 'DISTINTA UTE', letterCode: '', color: '#FFFF00' },
      { code: 'APPROVVIG.', label: 'APPROVVIG.', letterCode: '', color: '#FFDAB9' },
      { code: 'MONTAGGIO INT.', label: 'MONTAGGIO INT.', letterCode: '', color: '#FFA500' },
      { code: 'COLLAUDO INT.', label: 'COLLAUDO INT.', letterCode: '', color: '#8B4513' },
      { code: 'FAT', label: 'FAT', letterCode: 'F', color: '#800080' },
      { code: 'SPEDIZIONE', label: 'SPEDIZIONE', letterCode: 'SP', color: '#FFFF00' },
      { code: 'INSTALLAZIONE', label: 'INSTALLAZIONE', letterCode: '', color: '#0000FF' },
      { code: 'AVV. E COLLAUDO', label: 'AVV. E COLLAUDO', letterCode: '', color: '#00008B' },
      { code: 'TRAINING', label: 'TRAINING', letterCode: 'T', color: '#800080' },
      { code: 'SAT', label: 'SAT', letterCode: 'S', color: '#800080' }
    ];
    if (this.milestoneTypes.length > 0) {
      if (!confirm('This will attempt to add default milestones. Existing ones will be skipped. Continue?')) return;
    }
    let createdCount = 0;
    let skippedCount = 0;
    defaultMilestones.forEach((milestone) => {
      this.milestoneService.createMilestoneType(this.projectId, milestone).subscribe({
        next: (created) => {
          this.milestoneTypes.push(created);
          createdCount++;
          if (createdCount + skippedCount === defaultMilestones.length) {
            alert(`✅ Success: ${createdCount} added, ${skippedCount} skipped (already exist).`);
          }
        },
        error: (err) => {
          skippedCount++;
          if (createdCount + skippedCount === defaultMilestones.length) {
            alert(`✅ Finished: ${createdCount} added, ${skippedCount} skipped.`);
          }
        }
      });
    });
  }

  deleteMilestoneType(id: number): void {
    if (!confirm('Delete this milestone type?')) return;
    this.milestoneService.deleteMilestoneType(this.projectId, id).subscribe({
      next: () => { this.milestoneTypes = this.milestoneTypes.filter(m => m.id !== id); },
      error: (err) => console.error('Failed to delete milestone type', err)
    });
  }

  beginEditMilestoneType(milestoneType: any): void {
    this.editingMilestoneType = { ...milestoneType };
  }

  cancelMilestoneTypeEdit(): void {
    this.editingMilestoneType = null;
  }

  saveMilestoneTypeEdit(): void {
    const edited = this.editingMilestoneType;
    if (!edited || !edited.label?.trim()) return;
    const payload = {
      ...edited,
      label: edited.label.trim(),
      code: edited.code?.trim() || edited.label.trim().slice(0, 20).toUpperCase()
    };
    this.milestoneService.updateMilestoneType(this.projectId, edited.id, payload).subscribe({
      next: (saved) => {
        this.milestoneTypes = this.milestoneTypes.map(item => item.id === saved.id ? saved : item);
        this.editingMilestoneType = null;
      },
      error: (err) => console.error('Failed to update milestone type', err)
    });
  }

  selectedMilestoneTypeId(task: GmProjectScheduleTask): number | null {
    return task.milestoneTypeId == null ? null : Number(task.milestoneTypeId);
  }

  // ✅ NOUVELLE MÉTHODE CORRIGÉE pour gérer la sélection des milestones
onMilestoneTypeSelect(task: GmProjectScheduleTask, code: string | null): void {
  if (!code) {
    this.updateLocalTaskField(task, 'milestoneTypeId', null);
    return;
  }
  
  const type = this.milestoneTypes.find(item => item.code === code);
  if (type) {
    this.updateLocalTaskField(task, 'milestoneTypeId', type.id);
    task.name = type.label;
    task.color = type.color;
  }
  this.saveInlineTask(task);
}

  // Ancienne méthode (gardée pour compatibilité avec d'autres parties du code)
  selectMilestoneType(task: GmProjectScheduleTask, milestoneTypeId: number | string | null): void {
    const selectedId = milestoneTypeId == null ? null : Number(milestoneTypeId);
    this.updateLocalTaskField(task, 'milestoneTypeId', selectedId);
    const type = this.milestoneTypes.find(item => Number(item.id) === selectedId);
    if (type) {
      task.name = type.label;
      task.color = type.color;
    }
    this.saveInlineTask(task);
  }

  milestoneColor(task: GmProjectScheduleTask): string {
    return this.milestoneTypes.find(item => Number(item.id) === Number(task.milestoneTypeId))?.color || task.color || '#64748b';
  }

  formatDateForInput(value?: string | null): string { return value ?? ''; }

  formatDateForDisplay(value?: string | null): string {
    if (!value) return '—';
    const date = this.toDateOnly(value);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  }

  getTaskNameById(taskId?: number | null): string {
    if (!taskId) return '—';
    const task = this.tasks.find(t => t.id === taskId);
    return task?.name || `Task ${taskId}`;
  }

  // ---------------- Settings data ----------------
  loadTemplates(): void {
    this.templateService.getTemplates(this.projectId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: ProjectTemplate[]) => {
        this.templates = (res ?? []).map(t => ({ id: t.id, name: t.name, scope: t.scope, description: t.description ?? null, createdAt: new Date(t.createdAt).toLocaleString(), tasks: this.parseTemplateTasks(t.snapshotJson) }));
      },
      error: (err) => { console.error('Failed to load templates', err); this.templates = []; }
    });
  }

  private parseTemplateTasks(snapshotJson: string): GmProjectScheduleTask[] {
    try { const parsed = JSON.parse(snapshotJson); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }

  getNormalizedResourceType(task: any): string { return (task?.resourceType || '').toUpperCase(); }
  getNormalizedDepartment(task: any): string { return (task?.departmentCode || '').toUpperCase(); }
  getNormalizedTaskType(task: any): string {
    const value = String(task?.taskType || '').toUpperCase();
    if (value === 'ACTIVITY' || value === 'SUMMARY' || value === 'MILESTONE') return value;
    return 'ACTIVITY';
  }

  getTemplateScopeLabel(): string {
    if (this.selectedTemplateScope === 'selected' && this.selectedTask) return `Selected task: ${this.selectedTask.name || this.selectedTask.id}`;
    return 'All tasks in project';
  }

  setTemplateScope(scope: 'all' | 'selected'): void { this.selectedTemplateScope = scope; if (scope === 'all') this.selectedTemplateTaskIds.clear(); }
  isTemplateTaskSelected(taskId: number): boolean { return this.selectedTemplateTaskIds.has(taskId); }
  toggleTemplateTask(taskId: number, checked: boolean): void { if (checked) this.selectedTemplateTaskIds.add(taskId); else this.selectedTemplateTaskIds.delete(taskId); }
  toggleAllTemplateTasks(checked: boolean): void { this.selectedTemplateTaskIds.clear(); if (checked) this.visibleTasks.forEach(task => this.selectedTemplateTaskIds.add(task.id)); }
  getSelectedTemplateTasks(): GmProjectScheduleTask[] { return this.visibleTasks.filter(task => this.selectedTemplateTaskIds.has(task.id)); }
  getSelectedTemplateCount(): number { return this.selectedTemplateTaskIds.size; }
  areAllVisibleTemplateTasksSelected(): boolean { return this.visibleTasks.length > 0 && this.visibleTasks.every(task => this.selectedTemplateTaskIds.has(task.id)); }
  clearTemplateSelection(): void { this.selectedTemplateTaskIds.clear(); }

  // ---------------- Customer flag ----------------
  getCustomerFlag(task: GmProjectScheduleTask): 'Y' | 'N' { return task.customerMilestone ? 'Y' : 'N'; }
  isCustomerChecked(task: GmProjectScheduleTask): boolean { return !!task.customerMilestone; }
  onCustomerFlagChange(task: GmProjectScheduleTask, checked: boolean): void { this.updateLocalTaskField(task, 'customerMilestone', checked); this.saveInlineTask(task); }

  // ---------------- Dependency cascade ----------------
  private normalizeDateString(value?: string | null): string | null {
    if (!value) return null;
    const d = this.toDateOnly(value);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private compareDateStrings(a?: string | null, b?: string | null): number {
    if (!a && !b) return 0; if (!a) return -1; if (!b) return 1;
    return this.toDateOnly(a).getTime() - this.toDateOnly(b).getTime();
  }

  private maxDateString(a?: string | null, b?: string | null): string | null {
    if (!a) return b ?? null; if (!b) return a ?? null;
    return this.compareDateStrings(a, b) >= 0 ? a : b;
  }

  private getTaskDurationDays(task: GmProjectScheduleTask, mode: 'actual' | 'baseline'): number {
    if (this.isMilestone(task)) return 0;
    const start = mode === 'actual' ? task.actualStart : task.baselineStart ?? task.plannedStart;
    const end = mode === 'actual' ? task.actualEnd : task.baselineEnd ?? task.plannedEnd;
    return start && end ? this.calculateScheduledDurationDays(start, end) : this.normalizeDuration(task.durationDays);
  }

  private buildTaskUpdatePayload(task: GmProjectScheduleTask): GmUpdateProjectTaskRequest {
    const isActivity = this.isActivity(task);
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
      departmentCode: isActivity ? task.departmentCode ?? '' : '',
      resourceType: isActivity ? task.resourceType ?? '' : '',
      active: task.active ?? true,
      displayOrder: task.displayOrder ?? 0,
      outlineLevel: task.outlineLevel ?? 1,
      customerMilestone: task.customerMilestone ?? false,
      scheduleMode: task.scheduleMode ?? 'AUTO',
      status: task.status ?? '',
      milestoneTypeId: task.milestoneTypeId ?? null,
      color: task.color ?? '',
      assignedUserId: isActivity ? task.assignedUserId ?? undefined : undefined
    };
  }

  private recalculateTaskFromPredecessors(
    task: GmProjectScheduleTask,
    mode: 'actual' | 'baseline'
  ): boolean {
    const deps = (task.dependencies ?? []).filter(dep => !!dep.predecessorTaskId);
    if (!deps.length) return false;
    if ((task.scheduleMode || 'AUTO').toUpperCase() === 'MANUAL') return false;
    const oldStart = mode === 'actual'
      ? task.actualStart ?? null
      : task.baselineStart ?? task.plannedStart ?? null;
    const oldEnd = mode === 'actual'
      ? task.actualEnd ?? null
      : task.baselineEnd ?? task.plannedEnd ?? null;
    const duration = this.getTaskDurationDays(task, mode);
    let requiredStart: string | null = null;
    let requiredEnd: string | null = null;
    for (const dep of deps) {
      const predecessor = this.tasks.find(t => t.id === dep.predecessorTaskId);
      if (!predecessor) continue;
      const lag = dep.lagDays ?? 0;
      const type = (dep.dependencyType || 'FS').toUpperCase();
      const predStartValue = mode === 'actual'
        ? predecessor.actualStart
        : predecessor.baselineStart ?? predecessor.plannedStart;
      const predEndValue = mode === 'actual'
        ? predecessor.actualEnd
        : predecessor.baselineEnd ?? predecessor.plannedEnd;
      const predStart = predStartValue ? this.normalizeDateString(predStartValue) : null;
      const predEnd = predEndValue ? this.normalizeDateString(predEndValue) : predStart;
      if (!predStart && !predEnd) continue;
      switch (type) {
        case 'SS': if (predStart) requiredStart = this.maxDateString(requiredStart, this.addScheduledDaysToDateString(predStart, lag)); break;
        case 'FF': if (predEnd) requiredEnd = this.maxDateString(requiredEnd, this.addScheduledDaysToDateString(predEnd, lag)); break;
        case 'SF': if (predStart) requiredEnd = this.maxDateString(requiredEnd, this.addScheduledDaysToDateString(predStart, lag)); break;
        default:
          if (predEnd) requiredStart = this.maxDateString(requiredStart, this.addScheduledDaysToDateString(predEnd, lag + 1));
          break;
      }
    }
    let newStart = oldStart;
    let newEnd = oldEnd;
    if (this.isMilestone(task)) {
      const milestoneDate = requiredStart || requiredEnd || oldStart || oldEnd;
      if (!milestoneDate) return false;
      newStart = milestoneDate; newEnd = milestoneDate;
    } else if (requiredStart && requiredEnd) {
      const startFromEnd = this.addScheduledDaysToDateString(requiredEnd, -(duration - 1));
      newStart = this.maxDateString(requiredStart, startFromEnd);
      newEnd = this.addScheduledDaysToDateString(newStart!, duration - 1);
      if (this.compareDateStrings(newEnd, requiredEnd) < 0) { newEnd = requiredEnd; newStart = this.addScheduledDaysToDateString(newEnd, -(duration - 1)); }
    } else if (requiredStart) { newStart = requiredStart; newEnd = this.addScheduledDaysToDateString(newStart, duration - 1); }
    else if (requiredEnd) { newEnd = requiredEnd; newStart = this.addScheduledDaysToDateString(newEnd, -(duration - 1)); }
    newStart = this.normalizeDateString(newStart);
    newEnd = this.normalizeDateString(newEnd);
    const changed = newStart !== oldStart || newEnd !== oldEnd;
    if (!changed) return false;
    if (mode === 'actual') {
      task.actualStart = newStart ?? undefined;
      task.actualEnd = newEnd ?? undefined;
    } else {
      task.baselineStart = newStart ?? undefined;
      task.baselineEnd = newEnd ?? undefined;
      task.plannedStart = task.baselineStart;
      task.plannedEnd = task.baselineEnd;
    }
    return true;
  }

  private getCascadeModes(changed: 'baselineStart' | 'baselineEnd' | 'actualStart' | 'actualEnd' | 'duration'): Array<'actual' | 'baseline'> {
    if (changed === 'actualStart' || changed === 'actualEnd') return ['actual'];
    if (changed === 'baselineStart' || changed === 'baselineEnd') return ['baseline'];
    return ['actual', 'baseline'];
  }

  private cascadeDependentTaskDates(
    source: GmProjectScheduleTask,
    modes: Array<'actual' | 'baseline'>,
    recalculateSource = false
  ): number[] {
    const changedIds = new Set<number>();
    const successorsOf = (taskId: number) => this.tasks.filter(task =>
      (task.dependencies ?? []).some(dependency => dependency.predecessorTaskId === taskId)
    );
    for (const mode of modes) {
      const queue = recalculateSource ? [source] : successorsOf(source.id);
      const visited = new Set<number>();
      while (queue.length) {
        const task = queue.shift()!;
        if (visited.has(task.id)) continue;
        visited.add(task.id);
        if (this.recalculateTaskFromPredecessors(task, mode)) {
          changedIds.add(task.id);
          queue.push(...successorsOf(task.id));
        }
      }
    }
    return [...changedIds];
  }

  private trackCascadeUpdates(taskIds: number[]): void {
    taskIds.forEach(id => this.pendingCascadeSaveIds.add(id));
  }

  private persistShiftedTasks(taskIds: number[]) {
    const uniqueIds = Array.from(new Set(taskIds));
    if (!uniqueIds.length) return of([]);
    const requests = uniqueIds.map(id => this.tasks.find(t => t.id === id)).filter((task): task is GmProjectScheduleTask => !!task).map(task => this.service.updateTask(this.projectId, task.id, this.buildTaskUpdatePayload(task)));
    return requests.length ? forkJoin(requests) : of([]);
  }

  private setupTaskFormAutoCalculations(): void {
    const baselineStartCtrl = this.taskForm.get('baselineStart');
    const baselineEndCtrl = this.taskForm.get('baselineEnd');
    const plannedStartCtrl = this.taskForm.get('plannedStart');
    const plannedEndCtrl = this.taskForm.get('plannedEnd');
    const taskTypeCtrl = this.taskForm.get('taskType');
    const durationCtrl = this.taskForm.get('durationDays');
    const actualStartCtrl = this.taskForm.get('actualStart');
    const actualEndCtrl = this.taskForm.get('actualEnd');
    if (!baselineStartCtrl || !baselineEndCtrl || !taskTypeCtrl || !durationCtrl) return;
    baselineStartCtrl.valueChanges.subscribe(() => this.syncSelectedTaskFromForm('baselineStart'));
    baselineEndCtrl.valueChanges.subscribe(() => this.syncSelectedTaskFromForm('baselineEnd'));
    actualStartCtrl?.valueChanges.subscribe(() => this.syncSelectedTaskFromForm('actualStart'));
    actualEndCtrl?.valueChanges.subscribe(() => this.syncSelectedTaskFromForm('actualEnd'));
    taskTypeCtrl.valueChanges.subscribe(() => this.syncSelectedTaskFromForm('duration'));
    durationCtrl.valueChanges.subscribe(() => {
      if (!this.selectedTask || this.suppressFormAutoSave) return;
      this.syncSelectedTaskFromForm('duration');
    });
    this.taskForm.valueChanges.subscribe(() => {
      if (!this.selectedTask || this.suppressFormAutoSave) return;
      clearTimeout(this.formAutoSaveTimer);
      this.formAutoSaveTimer = setTimeout(() => {
        if (!this.selectedTask || this.taskForm.invalid) return;
        const formValue = this.taskForm.value;
        Object.assign(this.selectedTask, formValue);
        const index = this.tasks.findIndex(t => t.id === this.selectedTask!.id);
        if (index !== -1) {
          Object.assign(this.tasks[index], formValue);
        }
        this.saveInlineTask(this.selectedTask);
      }, 900);
    });
  }

  onProgressSliderCommit(): void {
    if (!this.selectedTask || this.taskForm.invalid) return;
    const percent = Number(this.taskForm.get('percentComplete')?.value ?? 0);
    this.taskForm.patchValue({ percentComplete: Math.max(0, Math.min(100, percent)) }, { emitEvent: false });
    this.saveTask();
  }

  onProgressSliderInput(): void {
    if (!this.selectedTask) return;
    const percent = Number(this.taskForm.get('percentComplete')?.value ?? 0);
    const safePercent = Math.max(0, Math.min(100, percent));
    this.taskForm.patchValue({ percentComplete: safePercent }, { emitEvent: false });
    if (this.selectedTask) this.selectedTask.percentComplete = safePercent;
  }

  openExportModal(): void { this.exportModalOpen = true; }
  closeExportModal(): void { this.exportModalOpen = false; }
  closeExportModalOnBackdrop(event: MouseEvent): void { if ((event.target as HTMLElement).classList.contains('export-overlay')) this.closeExportModal(); }

  private getExportTasks(): GmProjectScheduleTask[] {
    if (this.exportScope === 'ALL') return [...this.tasks];
    if (this.exportScope === 'CUSTOMER_NO') return this.tasks.filter(task => task.customerMilestone === false);
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
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  private formatDateForExport(value?: string | null): string { return value ?? ''; }

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
</Task>`).join('');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Project>
<Name>Project ${this.projectId} Schedule</Name>
<Tasks>${xmlTasks}  </Tasks>
</Project>`;
    this.downloadBlob(new Blob([xml], { type: 'application/xml;charset=utf-8' }), `project-${this.projectId}-schedule.xml`);
    this.closeExportModal();
  }

  exportAsPdfReport(): void {
    const exportTasks = this.getExportTasks();
    const rowsHtml = exportTasks.map(task => `<tr><td>${task.id ?? ''}</td><td>${task.wbsCode ?? ''}</td><td>${this.escapeXml(task.name ?? '')}</td><td>${task.taskType ?? ''}</td><td>${task.departmentCode ?? ''}</td><td>${task.baselineStart ?? task.plannedStart ?? ''}</td><td>${task.baselineEnd ?? task.plannedEnd ?? ''}</td><td>${task.durationDays ?? ''}</td><td>${task.percentComplete ?? 0}%</td></tr>`).join('');
    const html = `<html><head><title>Project ${this.projectId} Schedule Report</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#1f2937}h1{font-size:22px;margin-bottom:8px}p{color:#64748b;margin-bottom:18px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #d1d5db;padding:8px;text-align:left}th{background:#f3f4f6}</style></head><body><h1>Project ${this.projectId} Schedule Report</h1><p>Scope: ${this.exportScope}</p><table><thead><tr><th>ID</th><th>WBS</th><th>Name</th><th>Type</th><th>Department</th><th>Start</th><th>Finish</th><th>Duration</th><th>% Done</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;
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
    const headers = ['ID', 'WBS', 'Name', 'Type', 'Department', 'Resource Type', 'Customer Milestone', 'Baseline Start', 'Baseline End', 'Actual Start', 'Actual End', 'Duration', 'Percent Complete', 'Priority', 'Status', 'Schedule Mode'];
    const rows = exportTasks.map(task => [task.id ?? '', task.wbsCode ?? '', task.name ?? '', task.taskType ?? '', task.departmentCode ?? '', task.resourceType ?? '', task.customerMilestone ? 'Yes' : 'No', task.baselineStart ?? task.plannedStart ?? '', task.baselineEnd ?? task.plannedEnd ?? '', task.actualStart ?? '', task.actualEnd ?? '', task.durationDays ?? '', task.percentComplete ?? '', task.priority ?? '', task.status ?? '', task.scheduleMode ?? '']);
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    this.downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `project-${this.projectId}-schedule.csv`);
    this.closeExportModal();
  }

  getAssignableResources(projectId: number): Observable<{ id: number; fullName: string; departmentCode: string }[]> {
    return new Observable(observer => { observer.next([]); observer.complete(); });
  }

  loadSelectedTaskHistory(): void {
    if (!this.selectedTask) return;
    this.historyLoading = true;
    this.service.getTaskHistory(this.projectId, this.selectedTask.id).subscribe({ next: (res) => { this.taskHistory = res ?? []; this.historyLoading = false; }, error: (err) => { console.error('Failed to load task history', err); this.taskHistory = []; this.historyLoading = false; } });
  }

  loadTaskConsole(): void {
    if (!this.selectedTask) return;
    this.consoleLoading = true;
    forkJoin({ config: this.service.getTaskConsoleConfig(this.projectId, this.selectedTask.id), logs: this.service.getTaskConsoleLogs(this.projectId, this.selectedTask.id) }).subscribe({
      next: ({ config, logs }) => { this.consoleConfig = config; this.consoleLogs = logs ?? []; this.consoleLoading = false; },
      error: (err) => { console.error('Failed to load task console', err); this.consoleConfig = null; this.consoleLogs = []; this.consoleLoading = false; }
    });
  }

  setDetailTab(tab: 'general' | 'predecessors' | 'resources' | 'history' | 'console'): void {
    this.activeDetailTab = tab;
    if (tab === 'console') this.loadTaskConsole();
    if (tab === 'history') this.loadSelectedTaskHistory();
  }

  formatHistoryDate(value?: string | null): string { return value ? new Date(value).toLocaleString() : '—'; }

  toggleConsoleCheckpoint(field: 'checkpoint25' | 'checkpoint50' | 'checkpoint75'): void { if (!this.consoleConfig) return; this.consoleConfig[field] = !this.consoleConfig[field]; }
  setConsoleChannel(channel: 'APP_ALERT' | 'EMAIL' | 'BOTH'): void { if (!this.consoleConfig) return; this.consoleConfig.channel = channel; }
  toggleConsoleNotify(field: 'notifyPm' | 'notifyOwner' | 'notifyDeptManager' | 'notifyEveryone'): void { if (!this.consoleConfig) return; this.consoleConfig[field] = !this.consoleConfig[field]; }

  saveConsoleConfig(): void {
    if (!this.selectedTask || !this.consoleConfig) return;
    this.service.saveTaskConsoleConfig(this.projectId, this.selectedTask.id, this.consoleConfig).subscribe({ next: (saved) => { this.consoleConfig = saved; this.loadTaskConsole(); }, error: (err) => console.error('Failed to save console config', err) });
  }

  clearConsoleLogs(): void {
    if (!this.selectedTask) return;
    this.service.clearTaskConsoleLogs(this.projectId, this.selectedTask.id).subscribe({ next: () => { this.consoleLogs = []; }, error: (err) => console.error('Failed to clear console logs', err) });
  }

  // ---------------- Baselines ----------------
  private parseBaselineTasks(snapshotJson: string): ProjectBaselineTaskSnapshot[] {
    try {
      const parsed = JSON.parse(snapshotJson || '[]');
      const tasks = Array.isArray(parsed) ? parsed : parsed?.tasks;
      if (!Array.isArray(tasks)) return [];
      return tasks.map((task: any) => ({
        taskId: Number(task.taskId ?? task.id),
        taskType: task.taskType ?? 'ACTIVITY',
        start: task.start ?? task.baselineStart ?? task.plannedStart ?? null,
        end: task.end ?? task.baselineEnd ?? task.plannedEnd ?? null,
        durationDays: task.durationDays ?? null
      })).filter(task => Number.isFinite(task.taskId));
    } catch {
      return [];
    }
  }

  private enrichBaseline(baseline: ProjectBaseline): ProjectBaseline {
    const tasks = this.parseBaselineTasks(baseline.snapshotJson);
    const taskCount = tasks.length;
    const avgProgress = 0;
    const completedCount = 0;
    return { ...baseline, tasks, taskCount, avgProgress, completedCount, active: baseline.active };
  }

  loadBaselines(): void {
    this.baselineService.getBaselines(this.projectId).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        this.baselines = (res || []).map(b => this.enrichBaseline(b));
        const active = this.baselines.find(b => b.active) ?? null;
        this.activeBaselineId = active?.id ?? null;
        this.setActiveBaselineTasks(active?.tasks ?? []);
      },
      error: err => console.error('Failed to load baselines', err)
    });
  }

  saveBaselineWithName(): void {
    const name = this.baselineName?.trim();
    this.saving = true;
    this.baselineService.createBaseline(this.projectId, name ? { name } : {}).subscribe({
      next: () => { this.baselineName = ''; this.saving = false; this.loadBaselines(); },
      error: err => { this.saving = false; console.error('Failed to save baseline', err); }
    });
  }

  applyBaselineToSchedule(baseline: ProjectBaseline): void {
    this.saving = true;
    this.baselineService.applyBaseline(this.projectId, baseline.id).pipe(finalize(() => this.saving = false)).subscribe({
      next: applied => {
        this.activeBaselineId = applied.id;
        this.setActiveBaselineTasks(this.parseBaselineTasks(applied.snapshotJson));
        this.loadBaselines();
      },
      error: err => console.error('Failed to apply baseline', err)
    });
  }

  private setActiveBaselineTasks(tasks: ProjectBaselineTaskSnapshot[]): void {
    this.activeBaselineTasks = new Map(tasks.map(task => [task.taskId, task]));
    this.buildTimeline();
  }

  renameBaseline(baseline: ProjectBaseline): void {
    const name = prompt('New baseline name:', baseline.name);
    if (!name?.trim()) return;
    this.baselineService.renameBaseline(this.projectId, baseline.id, name.trim()).subscribe({ next: () => this.loadBaselines(), error: err => console.error('Failed to rename baseline', err) });
  }

  toggleBaselineDetails(baseline: ProjectBaseline): void { baseline.expanded = !baseline.expanded; }
  trackBaseline(_: number, baseline: ProjectBaseline): number { return baseline.id; }

  getPrimaryPredecessorId(task: GmProjectScheduleTask): number | null {
    return task.dependencies?.[0]?.predecessorTaskId ?? null;
  }

  getAvailablePredecessors(task: GmProjectScheduleTask): GmProjectScheduleTask[] {
    const additionalPredecessors = new Set((task.dependencies ?? []).slice(1).map(dep => dep.predecessorTaskId));
    return this.tasks.filter(candidate =>
      candidate.id !== task.id
      && !additionalPredecessors.has(candidate.id)
      && !this.hasDependencyPath(task.id, candidate.id)
    );
  }

  private hasDependencyPath(fromTaskId: number, targetTaskId: number): boolean {
    const successors = new Map<number, number[]>();
    this.tasks.forEach(successor => {
      (successor.dependencies ?? []).forEach(dependency => {
        const next = successors.get(dependency.predecessorTaskId) ?? [];
        next.push(successor.id);
        successors.set(dependency.predecessorTaskId, next);
      });
    });
    const visited = new Set<number>();
    const pending = [...(successors.get(fromTaskId) ?? [])];
    while (pending.length) {
      const taskId = pending.pop()!;
      if (taskId === targetTaskId) return true;
      if (visited.has(taskId)) continue;
      visited.add(taskId);
      pending.push(...(successors.get(taskId) ?? []));
    }
    return false;
  }

  onInlinePredecessorChange(task: GmProjectScheduleTask, predecessorTaskId: number | null): void {
    const nextPredecessorId = predecessorTaskId === null ? null : Number(predecessorTaskId);
    const existing = task.dependencies?.[0];
    if (nextPredecessorId === (existing?.predecessorTaskId ?? null)) return;
    if (nextPredecessorId !== null && !this.getAvailablePredecessors(task).some(candidate => candidate.id === nextPredecessorId)) return;
    if (!existing && nextPredecessorId === null) return;
    const previousDependencies = (task.dependencies ?? []).map(dependency => ({ ...dependency }));
    if (nextPredecessorId === null) {
      task.dependencies = (task.dependencies ?? []).filter(dependency => dependency.id !== existing!.id);
    } else if (existing) {
      task.dependencies = [{ ...existing, predecessorTaskId: nextPredecessorId }, ...(task.dependencies ?? []).slice(1)];
    } else {
      task.dependencies = [{ predecessorTaskId: nextPredecessorId, successorTaskId: task.id, dependencyType: 'FS', lagDays: 0 }];
    }
    this.trackCascadeUpdates(this.cascadeDependentTaskDates(task, ['actual', 'baseline'], true));
    this.refreshGanttView();
    const save = nextPredecessorId === null
      ? this.service.deleteDependency(this.projectId, existing!.id!)
      : existing?.id
      ? this.service.updateDependency(this.projectId, existing.id, {
        ...existing,
        predecessorTaskId: nextPredecessorId,
        successorTaskId: task.id
      })
      : this.service.createDependency(this.projectId, {
        predecessorTaskId: nextPredecessorId,
        successorTaskId: task.id,
        dependencyType: 'FS',
        lagDays: 0
      });
    save.subscribe({
      next: saved => {
        if (nextPredecessorId !== null && !existing && saved) {
          const local = task.dependencies?.[0];
          if (local) task.dependencies = [{ ...local, ...saved }, ...(task.dependencies ?? []).slice(1)];
          this.refreshGanttView();
        }
        this.saveInlineTask(task);
      },
      error: err => {
        console.error('Failed to save inline predecessor', err);
        task.dependencies = previousDependencies;
        this.refreshGanttView();
      }
    });
  }
  // ✅ NEW: Get milestone code instead of ID for better display
getSelectedMilestoneCode(task: GmProjectScheduleTask): string | null {
  if (!task.milestoneTypeId || !this.milestoneTypes.length) {
    return null;
  }
  const type = this.milestoneTypes.find(item => Number(item.id) === Number(task.milestoneTypeId));
  return type ? type.code : null;
}
}