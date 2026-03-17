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
import { GmProjectScheduleTask } from '../../../models/gm-project-schedule-task.model';
import { GmUpdateProjectTaskRequest } from '../../../models/gm-update-project-task-request.model';

interface TimelineDay {
  label: string;
  date: Date;
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

  projectId!: number;
  tasks: GmProjectScheduleTask[] = [];
  loading = false;
  saving = false;

  selectedTask: GmProjectScheduleTask | null = null;
  drawerOpen = false;
  taskForm!: FormGroup;

  timelineDays: TimelineDay[] = [];
  readonly dayWidth = 36;

  private syncingVertical = false;
  private syncingHorizontal = false;

  stats = {
    total: 0,
    milestones: 0,
    summaries: 0,
    avgProgress: 0
  };

  taskTypes = ['ACTIVITY', 'SUMMARY', 'MILESTONE'];
  departmentCodes = ['PM', 'ME', 'CE', 'SW', 'PRC', 'MFC'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private projectTimelineService: GmProjectTimelineService
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.initForm();
    this.loadSchedule();
  }

  ngAfterViewInit(): void {
    // no-op for now; kept because ViewChild-based scrolling is used
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
      percentComplete: [0, [Validators.min(0), Validators.max(100)]],
      priority: [500],
      taskType: ['ACTIVITY', Validators.required],
      wbsCode: [''],
      departmentCode: [''],
      active: [true],
      displayOrder: [0],
      customerMilestone: [false],
      scheduleMode: ['AUTO']
    });
  }

  loadSchedule(): void {
    this.loading = true;

    this.projectTimelineService.getProjectSchedule(this.projectId).subscribe({
      next: (response: GmProjectScheduleTask[]) => {
        this.tasks = response ?? [];
        this.computeStats();
        this.buildTimeline();
        this.loading = false;

        if (this.selectedTask) {
          const refreshed = this.tasks.find(t => t.id === this.selectedTask?.id);
          if (refreshed) {
            this.openTaskDrawer(refreshed);
          }
        }

        setTimeout(() => this.resetScrollPositions(), 0);
      },
      error: (error: unknown) => {
        console.error('Failed to load schedule', error);
        this.loading = false;
      }
    });
  }

  backToProject(): void {
    this.router.navigate(['/gm/projects', this.projectId]);
  }

  goToTasks(): void {
    this.router.navigate(['/gm/projects', this.projectId, 'tasks']);
  }

  isMilestone(task: GmProjectScheduleTask): boolean {
    return (task.taskType || '').toUpperCase() === 'MILESTONE';
  }

  isSummary(task: GmProjectScheduleTask): boolean {
    return (task.taskType || '').toUpperCase() === 'SUMMARY';
  }

  getIndentLevel(task: GmProjectScheduleTask): number {
    if (!task.wbsCode) {
      return 0;
    }
    return Math.max(0, task.wbsCode.split('.').length - 1);
  }

  getTimelineWidth(): number {
    return this.timelineDays.length * this.dayWidth;
  }

  getTaskLeft(task: GmProjectScheduleTask): number {
    if (!task.plannedStart || !this.timelineDays.length) {
      return 0;
    }

    const start = this.toDateOnly(task.plannedStart).getTime();
    const min = this.timelineDays[0].date.getTime();
    const dayDiff = Math.floor((start - min) / (1000 * 60 * 60 * 24));

    return Math.max(0, dayDiff * this.dayWidth);
  }

  getTaskWidth(task: GmProjectScheduleTask): number {
    if (this.isMilestone(task)) {
      return 18;
    }

    if (!task.plannedStart || !task.plannedEnd) {
      return this.dayWidth;
    }

    const start = this.toDateOnly(task.plannedStart).getTime();
    const end = this.toDateOnly(task.plannedEnd).getTime();
    const diffDays = Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1);

    return diffDays * this.dayWidth;
  }

  getBaselineLeft(task: GmProjectScheduleTask): number {
    if (!task.baselineStart || !this.timelineDays.length) {
      return this.getTaskLeft(task);
    }

    const start = this.toDateOnly(task.baselineStart).getTime();
    const min = this.timelineDays[0].date.getTime();
    const dayDiff = Math.floor((start - min) / (1000 * 60 * 60 * 24));

    return Math.max(0, dayDiff * this.dayWidth);
  }

  getBaselineWidth(task: GmProjectScheduleTask): number {
    if (this.isMilestone(task)) {
      return 12;
    }

    if (!task.baselineStart || !task.baselineEnd) {
      return this.dayWidth;
    }

    const start = this.toDateOnly(task.baselineStart).getTime();
    const end = this.toDateOnly(task.baselineEnd).getTime();
    const diffDays = Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1);

    return diffDays * this.dayWidth;
  }

  hasBaseline(task: GmProjectScheduleTask): boolean {
    return !!task.baselineStart && !!task.baselineEnd;
  }

  trackTimelineDay(index: number, day: TimelineDay): string {
    return `${index}-${day.label}`;
  }

  onTableVerticalScroll(): void {
    if (!this.tableBodyScroll || !this.ganttBodyScroll || this.syncingVertical) {
      return;
    }

    this.syncingVertical = true;
    this.ganttBodyScroll.nativeElement.scrollTop = this.tableBodyScroll.nativeElement.scrollTop;

    requestAnimationFrame(() => {
      this.syncingVertical = false;
    });
  }

  onGanttVerticalScroll(): void {
    if (!this.tableBodyScroll || !this.ganttBodyScroll || this.syncingVertical) {
      return;
    }

    this.syncingVertical = true;
    this.tableBodyScroll.nativeElement.scrollTop = this.ganttBodyScroll.nativeElement.scrollTop;

    requestAnimationFrame(() => {
      this.syncingVertical = false;
    });
  }

  onGanttHorizontalScroll(): void {
    if (!this.ganttBodyScroll || !this.timelineHeaderScroll || this.syncingHorizontal) {
      return;
    }

    this.syncingHorizontal = true;
    this.timelineHeaderScroll.nativeElement.scrollLeft = this.ganttBodyScroll.nativeElement.scrollLeft;

    requestAnimationFrame(() => {
      this.syncingHorizontal = false;
    });
  }

  openTaskDrawer(task: GmProjectScheduleTask): void {
    this.selectedTask = task;
    this.drawerOpen = true;

    this.taskForm.patchValue({
      name: task.name ?? '',
      description: task.description ?? '',
      durationDays: task.durationDays ?? 0,
      baselineStart: task.baselineStart ?? '',
      baselineEnd: task.baselineEnd ?? '',
      plannedStart: task.plannedStart ?? '',
      plannedEnd: task.plannedEnd ?? '',
      percentComplete: task.percentComplete ?? 0,
      priority: task.priority ?? 500,
      taskType: task.taskType ?? 'ACTIVITY',
      wbsCode: task.wbsCode ?? '',
      departmentCode: task.departmentCode ?? '',
      active: task.active ?? true,
      displayOrder: task.displayOrder ?? 0,
      customerMilestone: task.customerMilestone ?? false,
      scheduleMode: task.scheduleMode ?? 'AUTO'
    });
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.selectedTask = null;
    this.taskForm.reset();
  }

  saveTask(): void {
    if (!this.selectedTask || this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const value = this.taskForm.value;

    if (value.plannedStart && value.plannedEnd && value.plannedEnd < value.plannedStart) {
      return;
    }

    if (value.baselineStart && value.baselineEnd && value.baselineEnd < value.baselineStart) {
      return;
    }

    this.saving = true;

    const payload: GmUpdateProjectTaskRequest = {
      ...value
    };

    this.projectTimelineService.updateTask(this.selectedTask.id, payload).subscribe({
      next: () => {
        this.saving = false;
        this.loadSchedule();
      },
      error: (error: unknown) => {
        console.error('Failed to update task', error);
        this.saving = false;
      }
    });
  }

  private resetScrollPositions(): void {
    if (this.tableBodyScroll?.nativeElement) {
      this.tableBodyScroll.nativeElement.scrollTop = 0;
    }

    if (this.ganttBodyScroll?.nativeElement) {
      this.ganttBodyScroll.nativeElement.scrollTop = 0;
      this.ganttBodyScroll.nativeElement.scrollLeft = 0;
    }

    if (this.timelineHeaderScroll?.nativeElement) {
      this.timelineHeaderScroll.nativeElement.scrollLeft = 0;
    }
  }

  private computeStats(): void {
    this.stats.total = this.tasks.length;
    this.stats.milestones = this.tasks.filter(t => this.isMilestone(t)).length;
    this.stats.summaries = this.tasks.filter(t => this.isSummary(t)).length;

    const normalTasks = this.tasks.filter(t => !this.isSummary(t));
    const totalProgress = normalTasks.reduce((sum, t) => sum + (t.percentComplete ?? 0), 0);
    this.stats.avgProgress = normalTasks.length ? Math.round(totalProgress / normalTasks.length) : 0;
  }

  private buildTimeline(): void {
    const candidateDates: Date[] = [];

    this.tasks.forEach(task => {
      if (task.baselineStart) candidateDates.push(this.toDateOnly(task.baselineStart));
      if (task.baselineEnd) candidateDates.push(this.toDateOnly(task.baselineEnd));
      if (task.plannedStart) candidateDates.push(this.toDateOnly(task.plannedStart));
      if (task.plannedEnd) candidateDates.push(this.toDateOnly(task.plannedEnd));
    });

    if (!candidateDates.length) {
      this.timelineDays = [];
      return;
    }

    const minDate = new Date(Math.min(...candidateDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...candidateDates.map(d => d.getTime())));

    minDate.setDate(minDate.getDate() - 2);
    maxDate.setDate(maxDate.getDate() + 2);

    const days: TimelineDay[] = [];
    const cursor = new Date(minDate);

    while (cursor <= maxDate) {
      days.push({
        date: new Date(cursor),
        label: cursor.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    this.timelineDays = days;
  }

  private toDateOnly(value: string): Date {
    const date = new Date(value);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}