import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild
} from '@angular/core';
import { finalize } from 'rxjs/operators';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DepartmentManager } from '../../models/department-manager.model';
import { DepartmentOverview } from '../../models/department-overview.model';
import { DepartmentHoliday } from '../../models/department-holiday.model';
import { DepartmentMember } from '../../models/department-member.model';
import { DepartmentResourceRow } from '../../models/department-resource-row.model';
import { DepartmentProjectBlock } from '../../models/department-project-block.model';
import { DepartmentTimelineColumn } from '../../models/department-timeline-column.model';
import { DepartmentActivityRow } from '../../models/department-activity-row.model';
import { DepartmentWeeklyStat } from '../../models/department-weekly-stat.model';
import { CreateDepartmentHolidayRequest } from '../../models/create-department-holiday-request.model';
import { MyDepartmentResponse } from '../../models/my-department-response.model';
import { MyDepartmentService } from '../../service/my-department.service';

type MainView = 'resource' | 'projects';
type TimelineView = 'day' | 'week';

interface PaToggleColumn {
  id: string;
  label: string;
  vis: boolean;
}

interface ActivityGridRow {
  rowId: string;
  kind: 'project-header' | 'activity';
  projectId: number;
  projectCode: string | null;
  projectName: string;
  projectStatus: string | null;

  taskId?: number;
  wbs: string | null;
  name: string;
  type: string | null;
  departmentCode: string | null;
  baselineStartDate: string | null;
  baselineEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  durationDays: number | null;
  progressPercent: number | null;
  summary: boolean;

  barStart: string | null;
  barEnd: string | null;
  barLabel: string | null;
  barColor: string;
}

type TimeFilterValue =
  | 'ALL_TIME'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'NEXT_MONTH'
  | 'THIS_QUARTER'
  | 'NEXT_6_MONTHS'
  | 'THIS_YEAR';

type ProjectStatusFilter = 'ALL' | 'ACTIVE' | 'PLANNED' | 'COMPLETED' | 'STANDBY';

interface TimeFilterOption {
  value: TimeFilterValue;
  label: string;
}

@Component({
  selector: 'app-my-department-page',
  templateUrl: './my-department-page.component.html',
  styleUrls: ['./my-department-page.component.scss']
})
export class MyDepartmentPageComponent implements OnInit, AfterViewInit {
  managers: DepartmentManager[] = [];
  selectedManagerId: number | null = null;

  loading = false;
  managersLoading = false;
  error = '';

  mainView: MainView = 'resource';
  timelineView: TimelineView = 'week';

  offset = 0;
  span = 16;
  colWidth = 98;

  holidayModalOpen = false;
  holidayMemberId: number | null = null;
  holidayFrom = '';
  holidayTo = '';
  holidayNote = '';

  overview: DepartmentOverview | null = null;

  currentRole = '';
  isDepartmentManager = false;

  paColMenuOpen = false;

  showResources = true;
  showSuppliers = true;


  timeFilterMenuOpen = false;

  timeFilterOptions: TimeFilterOption[] = [
    { value: 'ALL_TIME', label: 'All Time' },
    { value: 'THIS_WEEK', label: 'This Week' },
    { value: 'THIS_MONTH', label: 'This Month' },
    { value: 'NEXT_MONTH', label: 'Next Month' },
    { value: 'THIS_QUARTER', label: 'This Quarter' },
    { value: 'NEXT_6_MONTHS', label: 'Next 6 Months' },
    { value: 'THIS_YEAR', label: 'This Year' }
  ];

  selectedTimeFilter: TimeFilterValue = 'ALL_TIME';

  activitySearch = '';

  selectedProjectStatus: ProjectStatusFilter = 'ALL';

  @ViewChild('timeFilterWrap') timeFilterWrap?: ElementRef<HTMLDivElement>;
  

  paToggleableCols: PaToggleColumn[] = [
    { id: 'wbs', label: 'WBS', vis: true },
    { id: 'activity', label: 'ACTIVITY', vis: true },
    { id: 'type', label: 'TYPE', vis: true },
    { id: 'dept', label: 'DEPT', vis: true },
    { id: 'bstart', label: 'B.START', vis: true },
    { id: 'bfinish', label: 'B.FINISH', vis: true },
    { id: 'astart', label: 'A.START', vis: true },
    { id: 'afinish', label: 'A.FINISH', vis: true },
    { id: 'days', label: 'DAYS', vis: true },
    { id: 'progress', label: '%', vis: true }
  ];
    actTableHtml = '';
    actGanttHtml = '';

    actTableHtmlSafe: SafeHtml = '';
    actGanttHtmlSafe: SafeHtml = '';

  private paGanttColWidth = 58;
  private readonly paGanttMinWidth = 28;
  private readonly paGanttMaxWidth = 140;
  private readonly paRowHeight = 32;
  private readonly paHeaderHeightTop = 28;
  private readonly paHeaderHeightBottom = 30;

  @ViewChild('resourceGanttScrollWrap') resourceGanttScrollWrap?: ElementRef<HTMLDivElement>;
  @ViewChild('resourceScrollBar') resourceScrollBar?: ElementRef<HTMLDivElement>;

  @ViewChild('activityGanttContent') activityGanttContent?: ElementRef<HTMLDivElement>;
  @ViewChild('activityScrollBarWrap') activityScrollBarWrap?: ElementRef<HTMLDivElement>;

  @ViewChild('actTablePanel') actTablePanel?: ElementRef<HTMLDivElement>;
  @ViewChild('actTableContent') actTableContent?: ElementRef<HTMLDivElement>;
  @ViewChild('actScrollBarSpacer') actScrollBarSpacer?: ElementRef<HTMLDivElement>;
  @ViewChild('paColBtnWrap') paColBtnWrap?: ElementRef<HTMLDivElement>;

  constructor(
  private myDepartmentService: MyDepartmentService,
  private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.resolveCurrentRole();

    if (this.isDepartmentManager) {
      this.loadOwnDepartmentOverview();
    } else {
      this.loadManagers();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.syncResourceScrollBarWidth();
      this.syncActivityScrollBarWidth();
      this.bindBottomScrollSync();
      this.syncActivityLayout();
    });
  }

  get selectedDepartmentCode(): string {
    return this.overview?.selectedDepartmentCode ?? '';
  }

  get selectedManager(): DepartmentManager | null {
    return this.overview?.selectedManager ?? null;
  }

  get members(): DepartmentMember[] {
    return this.overview?.members ?? [];
  }

  get holidays(): DepartmentHoliday[] {
    return this.overview?.holidays ?? [];
  }

  get timelineColumns(): DepartmentTimelineColumn[] {
    return this.overview?.timelineColumns ?? [];
  }


  get projectBlocks(): DepartmentProjectBlock[] {
    return this.overview?.projectBlocks ?? [];
  }

  get weeklyStats(): DepartmentWeeklyStat[] {
    return this.overview?.weeklyStats ?? [];
  }

  get holidayListForSelectedMember(): DepartmentHoliday[] {
    if (!this.holidayMemberId) {
      return [];
    }
    return this.holidays.filter((h: DepartmentHoliday) => h.memberId === this.holidayMemberId);
  }

  get rangeLabel(): string {
    const cols = this.timelineColumns;
    if (!cols.length) {
      return '—';
    }

    const first = cols[0];
    const last = cols[cols.length - 1];
    return `${this.formatShortDate(first.startDate)} – ${this.formatShortDate(last.endDate)}`;
  }

  get todayLineLeft(): number | null {
    if (this.timelineView !== 'day') {
      return null;
    }

    const index = this.timelineColumns.findIndex(c => c.today);
    if (index < 0) {
      return null;
    }

    return index * this.colWidth + this.colWidth / 2;
  }

  get weekendShades(): { left: number; width: number }[] {
    if (this.timelineView !== 'day') {
      return [];
    }

    return this.timelineColumns
      .map((col, index) => ({ col, index }))
      .filter(x => x.col.weekend)
      .map(x => ({
        left: x.index * this.colWidth,
        width: this.colWidth
      }));
  }

  get topHeaderGroups(): { label: string; width: number }[] {
    const cols = this.timelineColumns;
    if (!cols.length) {
      return [];
    }

    const groups: { label: string; width: number }[] = [];

    let currentKey = '';
    let currentCount = 0;
    let currentLabel = '';

    cols.forEach((col, index) => {
      const date = new Date(col.startDate);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const label =
        this.timelineView === 'day'
          ? date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
          : date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();

      if (index === 0) {
        currentKey = key;
        currentLabel = label;
        currentCount = 1;
        return;
      }

      if (key === currentKey) {
        currentCount++;
      } else {
        groups.push({ label: currentLabel, width: currentCount * this.colWidth });
        currentKey = key;
        currentLabel = label;
        currentCount = 1;
      }
    });

    groups.push({ label: currentLabel, width: currentCount * this.colWidth });
    return groups;
  }

  get activityGridRows(): ActivityGridRow[] {
    const rows: ActivityGridRow[] = [];

    for (const block of this.filteredProjectBlocks) { 
      rows.push({
        rowId: `project-${block.projectId}`,
        kind: 'project-header',
        projectId: block.projectId,
        projectCode: block.projectCode,
        projectName: block.projectName,
        projectStatus: block.status,

        wbs: null,
        name: block.projectName,
        type: null,
        departmentCode: null,
        baselineStartDate: this.getProjectBaselineStart(block),
        baselineEndDate: this.getProjectBaselineEnd(block),
        actualStartDate: this.getProjectActualStart(block),
        actualEndDate: this.getProjectActualEnd(block),
        durationDays: this.getProjectDuration(block),
        progressPercent: this.getProjectProgress(block),
        summary: true,

        barStart: this.getProjectBarStart(block),
        barEnd: this.getProjectBarEnd(block),
        barLabel: block.projectCode || block.projectName,
        barColor: '#cfd8e6'
      });

      for (const row of block.rows ?? []) {
        rows.push({
          rowId: `task-${row.taskId}`,
          kind: 'activity',
          projectId: block.projectId,
          projectCode: block.projectCode,
          projectName: block.projectName,
          projectStatus: block.status,

          taskId: row.taskId,
          wbs: row.wbs,
          name: row.name,
          type: row.type,
          departmentCode: row.departmentCode,
          baselineStartDate: row.baselineStartDate,
          baselineEndDate: row.baselineEndDate,
          actualStartDate: row.actualStartDate,
          actualEndDate: row.actualEndDate,
          durationDays: row.durationDays,
          progressPercent: row.progressPercent,
          summary: !!row.summary,

          barStart: row.actualStartDate || row.baselineStartDate,
          barEnd: row.actualEndDate || row.baselineEndDate,
          barLabel: this.getActivityBarLabel(row),
          barColor: row.summary ? '#cbd5e1' : '#7f92ac'
        });
      }
    }

    return rows;
  }

  get selectedTimeFilterLabel(): string {
  return this.timeFilterOptions.find(x => x.value === this.selectedTimeFilter)?.label ?? 'All Time';
  }

  get filteredProjectBlocks(): DepartmentProjectBlock[] {
    const blocks = this.projectBlocks ?? [];
    const search = this.activitySearch.trim().toLowerCase();

    return blocks.filter(block => {
      const statusOk = this.matchesProjectStatus(block);
      const timeOk = this.matchesTimeFilter(block);
      const searchOk = this.matchesSearchFilter(block, search);

      return statusOk && timeOk && searchOk;
    });
  }

  get filteredResourceRows(): DepartmentResourceRow[] {
  return (this.resourceRows || []).map(row => ({
    ...row,
    items: (row.items || []).filter(item => this.shouldShowResourceItem(item))
  }));
  }

  get resourceRows(): DepartmentResourceRow[] {
    const rows = [...(this.overview?.resourceRows ?? [])];

    let filtered = rows;

    if (!this.showResources && !this.showSuppliers) {
      filtered = [];
    } else if (this.showResources && !this.showSuppliers) {
      filtered = rows.filter(row => row.member.internal);
    } else if (!this.showResources && this.showSuppliers) {
      filtered = rows.filter(row => !row.member.internal);
    }

    return filtered.sort((a, b) => {
      const aGeneric = (a.member.fullName || '').startsWith('G-');
      const bGeneric = (b.member.fullName || '').startsWith('G-');

      if (aGeneric !== bGeneric) {
        return aGeneric ? 1 : -1;
      }

      return (a.member.fullName || '').localeCompare(b.member.fullName || '');
    });
  }

  toggleTimeFilterMenu(): void {
    this.timeFilterMenuOpen = !this.timeFilterMenuOpen;
  }

  selectTimeFilter(value: TimeFilterValue): void {
    this.selectedTimeFilter = value;
    this.timeFilterMenuOpen = false;
    this.renderActivityView();
  }

  onActivitySearchChange(value: string): void {
    this.activitySearch = value ?? '';
    this.renderActivityView();
  }

  setProjectStatusFilter(status: ProjectStatusFilter): void {
    this.selectedProjectStatus = status;
    this.renderActivityView();
  }

  loadManagers(): void {
    this.managersLoading = true;
    this.error = '';

    this.myDepartmentService.getManagers()
      .pipe(finalize(() => (this.managersLoading = false)))
      .subscribe({
        next: (managers: DepartmentManager[]) => {
          this.managers = managers ?? [];

          if (this.managers.length > 0 && !this.selectedManagerId) {
            this.selectedManagerId = this.managers[0].id;
            this.loadOverview();
          }
        },
        error: () => {
          this.error = 'Failed to load managers.';
        }
      });
  }

  loadOwnDepartmentOverview(): void {
    this.loading = true;
    this.error = '';

    this.myDepartmentService
      .getOverviewWithoutManager(this.timelineView, this.offset, this.span)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: MyDepartmentResponse) => {
          this.overview = response.overview;
          this.syncHolidayMemberSelection();
          this.renderActivityView();

          setTimeout(() => {
            this.syncResourceScrollBarWidth();
            this.syncActivityScrollBarWidth();
            this.bindBottomScrollSync();
            this.syncActivityLayout();
          });
        },
        error: () => {
          this.error = 'Failed to load your department overview.';
        }
      });
  }

  onManagerChange(managerIdValue: string): void {
    this.selectedManagerId = managerIdValue ? Number(managerIdValue) : null;
    this.offset = 0;

    if (!this.selectedManagerId) {
      this.overview = null;
      this.renderActivityView();
      return;
    }

    this.loadOverview();
  }

  loadOverview(): void {
    if (this.isDepartmentManager) {
      this.loadOwnDepartmentOverview();
      return;
    }

    if (!this.selectedManagerId) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.myDepartmentService
      .getOverview(this.selectedManagerId, this.timelineView, this.offset, this.span)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: MyDepartmentResponse) => {
          this.overview = response.overview;
          this.syncHolidayMemberSelection();
          this.renderActivityView();

          setTimeout(() => {
            this.syncResourceScrollBarWidth();
            this.syncActivityScrollBarWidth();
            this.bindBottomScrollSync();
            this.syncActivityLayout();
          });
        },
        error: () => {
          this.error = 'Failed to load department overview.';
        }
      });
  }

setMainView(view: MainView): void {
  if (this.mainView === view) {
    return;
  }

  this.mainView = view;

  setTimeout(() => {
    if (view === 'projects') {
      this.renderActivityView();
      this.syncActivityScrollBarWidth();
      this.syncActivityLayout();
    } else {
      this.syncResourceScrollBarWidth();
      this.bindBottomScrollSync();
    }
  });
}

  setTimelineView(view: TimelineView): void {
    if (this.timelineView === view) {
      return;
    }

    this.timelineView = view;
    this.span = view === 'day' ? 28 : 16;
    this.colWidth = view === 'day' ? 32 : 98;
    this.offset = 0;

    this.loadOverview();
  }

  zoom(delta: number): void {
    const step = this.timelineView === 'day' ? 4 : 8;
    const min = this.timelineView === 'day' ? 16 : 60;
    const max = this.timelineView === 'day' ? 80 : 140;

    const next = this.colWidth + delta * step;
    this.colWidth = Math.max(min, Math.min(max, next));

    setTimeout(() => {
      this.syncResourceScrollBarWidth();
      this.bindBottomScrollSync();
    });
  }

  shift(step: number): void {
    this.offset += step;
    this.loadOverview();
  }

  goToday(): void {
    this.offset = 0;
    this.loadOverview();
  }

  openHolidayModal(): void {
    if (!this.members.length) {
      return;
    }

    this.holidayModalOpen = true;
    this.syncHolidayMemberSelection();

    const today = new Date().toISOString().slice(0, 10);
    this.holidayFrom = today;
    this.holidayTo = today;
    this.holidayNote = '';
  }

  closeHolidayModal(): void {
    this.holidayModalOpen = false;
  }

  addHoliday(): void {
    if (!this.holidayMemberId || !this.holidayFrom || !this.holidayTo) {
      return;
    }

    const payload: CreateDepartmentHolidayRequest = {
      memberId: this.holidayMemberId,
      fromDate: this.holidayFrom,
      toDate: this.holidayTo,
      note: this.holidayNote?.trim() || null
    };

    this.myDepartmentService.createHoliday(payload).subscribe({
      next: () => {
        this.closeHolidayModal();
        this.loadOverview();
      },
      error: () => {
        this.error = 'Failed to add holiday.';
      }
    });
  }

  deleteHoliday(holidayId: number): void {
    this.myDepartmentService.deleteHoliday(holidayId).subscribe({
      next: () => this.loadOverview(),
      error: () => {
        this.error = 'Failed to delete holiday.';
      }
    });
  }

  onHolidayMemberChange(value: string): void {
    this.holidayMemberId = value ? Number(value) : null;
  }

  togglePaColMenu(): void {
    this.paColMenuOpen = !this.paColMenuOpen;
  }

togglePaCol(columnId: string, checked: boolean): void {
  const col = this.paToggleableCols.find(c => c.id === columnId);
  if (!col) {
    return;
  }

  col.vis = checked;
  this.renderActivityView();
}

zoomPaGantt(delta: number): void {
  const next = this.paGanttColWidth + delta * 8;
  this.paGanttColWidth = Math.max(this.paGanttMinWidth, Math.min(this.paGanttMaxWidth, next));
  this.renderActivityView();
}

  syncActPanels(event?: Event): void {
    const gantt = this.activityGanttContent?.nativeElement;
    const table = this.actTableContent?.nativeElement;
    const bar = this.activityScrollBarWrap?.nativeElement;

    if (!gantt) {
      return;
    }

    if (table) {
      table.scrollTop = gantt.scrollTop;
    }

    if (bar && (!event || event.target === gantt)) {
      bar.scrollLeft = gantt.scrollLeft;
    }
  }

  syncActScrollFromBar(_: Event): void {
    const gantt = this.activityGanttContent?.nativeElement;
    const bar = this.activityScrollBarWrap?.nativeElement;

    if (!gantt || !bar) {
      return;
    }

    gantt.scrollLeft = bar.scrollLeft;
  }

  trackByManager(_: number, item: DepartmentManager): number {
    return item.id;
  }

  trackByMember(_: number, row: DepartmentResourceRow): number {
    return row.member.id;
  }

  trackByColumn(_: number, col: DepartmentTimelineColumn): string {
    return `${col.startDate}-${col.endDate}`;
  }

  trackByProject(_: number, block: DepartmentProjectBlock): number {
    return block.projectId;
  }

  initials(name: string | null | undefined): string {
    if (!name) {
      return '?';
    }

    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
  }

  itemLeftPx(itemStart: string): number {
    if (!this.timelineColumns.length) {
      return 0;
    }

    const start = new Date(itemStart);
    const first = new Date(this.timelineColumns[0].startDate);
    const diffDays = Math.floor((start.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));

    if (this.timelineView === 'day') {
      return diffDays * this.colWidth;
    }

    return diffDays * (this.colWidth / 7);
  }

  itemWidthPx(itemStart: string, itemEnd: string): number {
    const start = new Date(itemStart);
    const end = new Date(itemEnd);
    const diffDays = Math.max(
      0,
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );

    if (this.timelineView === 'day') {
      return Math.max(this.colWidth, (diffDays + 1) * this.colWidth);
    }

    return Math.max(10, (diffDays + 1) * (this.colWidth / 7));
  }

  getHolidayShadesForRow(row: DepartmentResourceRow): { left: number; width: number }[] {
    if (this.timelineView !== 'day') {
      return [];
    }

    return row.items
      .filter(item => item.holiday)
      .map(item => ({
        left: this.itemLeftPx(item.startDate),
        width: this.itemWidthPx(item.startDate, item.endDate)
      }));
  }

  formatShortDate(dateStr: string | null | undefined): string {
    if (!dateStr) {
      return '—';
    }

    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) {
      return dateStr;
    }

    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    }).toUpperCase();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.syncResourceScrollBarWidth();
    this.syncActivityScrollBarWidth();
    this.syncActivityLayout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;

    if (this.paColMenuOpen) {
      const wrap = this.paColBtnWrap?.nativeElement;
      if (wrap && target && !wrap.contains(target)) {
        this.paColMenuOpen = false;
      }
    }

    if (this.timeFilterMenuOpen) {
      const wrap = this.timeFilterWrap?.nativeElement;
      if (wrap && target && !wrap.contains(target)) {
        this.timeFilterMenuOpen = false;
      }
    }
  }

  private resolveCurrentRole(): void {
    const token = localStorage.getItem('token');

    if (!token) {
      this.currentRole = '';
      this.isDepartmentManager = false;
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const role = payload?.role || payload?.authorities?.[0] || '';

      this.currentRole = role;
      this.isDepartmentManager =
      role === 'DEPARTMENT_MANAGER' || role === 'ROLE_DEPARTMENT_MANAGER';
    } catch {
      this.currentRole = '';
      this.isDepartmentManager = false;
    }
  }

  private syncHolidayMemberSelection(): void {
    const memberIds = this.members.map((m: DepartmentMember) => m.id);

    if (!memberIds.length) {
      this.holidayMemberId = null;
      return;
    }

    if (!this.holidayMemberId || !memberIds.includes(this.holidayMemberId)) {
      this.holidayMemberId = memberIds[0];
    }
  }

  private syncResourceScrollBarWidth(): void {
    const ganttWrap = this.resourceGanttScrollWrap?.nativeElement;
    const scrollBar = this.resourceScrollBar?.nativeElement;

    if (!ganttWrap || !scrollBar) {
      return;
    }

    const inner = scrollBar.querySelector('.res-scroll-bar-inner') as HTMLDivElement | null;
    if (!inner) {
      return;
    }

    inner.style.width = `${Math.max(ganttWrap.scrollWidth, ganttWrap.clientWidth + 1)}px`;
  }

  private syncActivityScrollBarWidth(): void {
    const gantt = this.activityGanttContent?.nativeElement;
    const barWrap = this.activityScrollBarWrap?.nativeElement;

    if (!gantt || !barWrap) {
      return;
    }

    const inner = barWrap.querySelector('.act-scroll-bar-inner') as HTMLDivElement | null;
    if (!inner) {
      return;
    }

    inner.style.width = `${Math.max(gantt.scrollWidth, gantt.clientWidth + 1)}px`;
  }

  private bindBottomScrollSync(): void {
    const resourceMain = this.resourceGanttScrollWrap?.nativeElement;
    const resourceBar = this.resourceScrollBar?.nativeElement;

    if (resourceMain && resourceBar && !resourceBar.dataset['bound']) {
      resourceBar.dataset['bound'] = 'true';

      resourceBar.addEventListener('scroll', () => {
        resourceMain.scrollLeft = resourceBar.scrollLeft;
      });

      resourceMain.addEventListener('scroll', () => {
        resourceBar.scrollLeft = resourceMain.scrollLeft;
      });
    }

    const activityMain = this.activityGanttContent?.nativeElement;
    const activityBar = this.activityScrollBarWrap?.nativeElement;

    if (activityMain && activityBar && !activityBar.dataset['bound']) {
      activityBar.dataset['bound'] = 'true';

      activityBar.addEventListener('scroll', () => {
        activityMain.scrollLeft = activityBar.scrollLeft;
      });

      activityMain.addEventListener('scroll', () => {
        activityBar.scrollLeft = activityMain.scrollLeft;
      });
    }
  }

  private syncActivityLayout(): void {
    const panel = this.actTablePanel?.nativeElement;
    const spacer = this.actScrollBarSpacer?.nativeElement;

    if (!panel || !spacer) {
      return;
    }

    const width = panel.offsetWidth || 0;
    spacer.style.width = `${width}px`;
  }

  private getTableColPixelWidth(colId: string): number {
  switch (colId) {
    case 'wbs': return 60;
    case 'activity': return 240;
    case 'type': return 58;
    case 'dept': return 62;
    case 'bstart': return 90;
    case 'bfinish': return 90;
    case 'astart': return 90;
    case 'afinish': return 90;
    case 'days': return 54;
    case 'progress': return 62;
    default: return 90;
  }
}

private renderActivityView(): void {
  this.actTableHtml = this.buildActivityTableHtml();
  this.actGanttHtml = this.buildActivityGanttHtml();

  this.actTableHtmlSafe = this.sanitizer.bypassSecurityTrustHtml(this.actTableHtml);
  this.actGanttHtmlSafe = this.sanitizer.bypassSecurityTrustHtml(this.actGanttHtml);

  setTimeout(() => {
    this.syncActivityPanelWidth();
    this.syncActivityScrollBarWidth();
    this.syncActivityLayout();
    this.bindBottomScrollSync();
    this.syncActPanels();
  });
}

private syncActivityPanelWidth(): void {
  const panel = this.actTablePanel?.nativeElement;
  const spacer = this.actScrollBarSpacer?.nativeElement;

  if (!panel) {
    return;
  }

  const visibleCols = this.paToggleableCols.filter(c => c.vis);
  const width = visibleCols.reduce((sum, col) => sum + this.getTableColPixelWidth(col.id), 0);

  panel.style.width = `${width}px`;
  panel.style.minWidth = `${width}px`;
  panel.style.maxWidth = `${width}px`;

  if (spacer) {
    spacer.style.width = `${width}px`;
    spacer.style.minWidth = `${width}px`;
    spacer.style.maxWidth = `${width}px`;
  }
}

  private buildActivityTableHtml(): string {
    const rows = this.activityGridRows;
    const visibleCols = this.paToggleableCols.filter(c => c.vis);
    const templateCols = visibleCols.map(col => this.getTableColWidth(col.id)).join(' ');

    const header = `
      <div style="position:sticky;top:0;z-index:5;background:#f8fafc;border-bottom:2px solid #cbd5e1;">
        <div style="display:grid;grid-template-columns:${templateCols};height:${this.paHeaderHeightTop + this.paHeaderHeightBottom}px;">
          ${visibleCols.map(col => `
            <div style="
              display:flex;
              align-items:center;
              padding:0 8px;
              border-right:1px solid #cbd5e1;
              font-size:11px;
              font-weight:800;
              color:#64748b;
              text-transform:uppercase;
              letter-spacing:.04em;
            ">${this.escapeHtml(col.label)}</div>
          `).join('')}
        </div>
      </div>
    `;

    const body = rows.length
      ? rows.map((row, index) => this.buildActivityTableRowHtml(row, visibleCols, templateCols, index)).join('')
      : `<div style="padding:40px;text-align:center;color:#94a3b8;font-size:13px;background:#fff;">No activity data to display.</div>`;

    return `
      <div style="height:100%;display:flex;flex-direction:column;background:#fff;">
        ${header}
        <div style="display:flex;flex-direction:column;">
          ${body}
        </div>
      </div>
    `;
  }

  private buildActivityTableRowHtml(
    row: ActivityGridRow,
    visibleCols: PaToggleColumn[],
    templateCols: string,
    index: number
  ): string {
    if (row.kind === 'project-header') {
      const bg = '#dde7f4';
      const statusBadge = row.projectStatus
        ? `<span style="${this.projectHeaderStatusStyle()}">${this.escapeHtml(row.projectStatus)}</span>`
        : '';

      return `
        <div style="
          display:grid;
          grid-template-columns:${templateCols};
          height:${this.paRowHeight + 8}px;
          background:${bg};
          border-top:1px solid #b9c7d8;
          border-bottom:1px solid #b9c7d8;
        ">
          <div style="
            grid-column:1 / -1;
            display:flex;
            align-items:center;
            justify-content:space-between;
            padding:0 14px;
            font-size:13px;
            font-weight:800;
            color:#143d7a;
          ">
            <div style="display:flex;align-items:center;gap:10px;min-width:0;">
              <span style="width:10px;height:10px;border-radius:50%;background:#1f67c1;display:inline-block;flex-shrink:0;"></span>
              <span style="font-weight:900;">${this.escapeHtml(row.projectName)}</span>
              <span style="font-size:12px;color:#7f8ea3;font-weight:700;">
                ${this.escapeHtml(row.projectCode || '')}
              </span>
            </div>
            ${statusBadge}
          </div>
        </div>
      `;
    }

    const bg = row.summary ? '#f2f5fa' : index % 2 === 0 ? '#ffffff' : '#fbfcfe';
    const nameStyle = row.summary
      ? 'font-weight:800;color:#2057b7;'
      : 'font-weight:600;color:#1e293b;';

    const cells = visibleCols.map(col => {
      switch (col.id) {
        case 'wbs':
          return `<div style="${this.paCellStyle(bg)}font-family:monospace;color:#64748b;">${this.escapeHtml(row.wbs || '')}</div>`;

        case 'activity':
          return `
            <div style="${this.paCellStyle(bg)}${nameStyle}min-width:0;">
              <div style="display:flex;align-items:center;gap:6px;min-width:0;">
                ${row.summary ? '<span style="font-size:10px;color:#2057b7;">▶</span>' : ''}
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                  ${this.escapeHtml(row.name)}
                </span>
              </div>
            </div>
          `;

        case 'type':
          return `<div style="${this.paCellStyle(bg)}font-size:10px;color:#7a8ca6;text-transform:uppercase;">${this.escapeHtml(row.type || '')}</div>`;

        case 'dept':
          return `
            <div style="${this.paCellStyle(bg)}">
              <div style="display:flex;align-items:center;gap:6px;">
                ${row.departmentCode ? '<span style="width:9px;height:9px;border-radius:50%;background:#1696b8;display:inline-block;"></span>' : ''}
                <span style="font-size:11px;color:#6d86a2;">${this.escapeHtml(row.departmentCode || '')}</span>
              </div>
            </div>
          `;

        case 'bstart':
          return `<div style="${this.paCellStyle(bg)}font-family:monospace;color:#a05a24;">${this.escapeHtml(this.formatTableDate(row.baselineStartDate))}</div>`;

        case 'bfinish':
          return `<div style="${this.paCellStyle(bg)}font-family:monospace;color:#a05a24;">${this.escapeHtml(this.formatTableDate(row.baselineEndDate))}</div>`;

        case 'astart':
          return `<div style="${this.paCellStyle(bg)}font-family:monospace;color:#2f49c4;">${this.escapeHtml(this.formatTableDate(row.actualStartDate))}</div>`;

        case 'afinish':
          return `<div style="${this.paCellStyle(bg)}font-family:monospace;color:#2f49c4;">${this.escapeHtml(this.formatTableDate(row.actualEndDate))}</div>`;

        case 'days':
          return `<div style="${this.paCellStyle(bg)}justify-content:center;">${this.escapeHtml(row.durationDays ?? '')}</div>`;

        case 'progress':
          return `
            <div style="${this.paCellStyle(bg)}padding:0 4px;">
              <div style="width:100%;display:flex;justify-content:center;">
                <div style="
                  width:100%;
                  max-width:54px;
                  height:8px;
                  background:#edf2f7;
                  border-radius:999px;
                  overflow:hidden;
                  position:relative;
                ">
                  <div style="
                    height:100%;
                    width:${this.normalizePercent(row.progressPercent)}%;
                    background:#d3dbe6;
                  "></div>
                </div>
              </div>
              <div style="
                position:absolute;
                inset:0;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:10px;
                color:#6d7d92;
                pointer-events:none;
              ">
                ${this.normalizePercent(row.progressPercent)}%
              </div>
            </div>
          `;

        default:
          return `<div style="${this.paCellStyle(bg)}"></div>`;
      }
    }).join('');

    return `
      <div style="
        display:grid;
        grid-template-columns:${templateCols};
        height:${this.paRowHeight}px;
        background:${bg};
        border-bottom:1px solid #d7e0eb;
        position:relative;
      ">
        ${cells}
      </div>
    `;
  }

  private buildActivityGanttHtml(): string {
    const rows = this.activityGridRows;
    const cols = this.timelineColumns;
    const totalWidth = Math.max(1, cols.length * this.paGanttColWidth);

    const headerTop = this.buildActivityGanttTopHeader();
    const headerBottom = this.buildActivityGanttBottomHeader();
    const weeklyBand = this.buildWeeklyStatsBand(totalWidth);

    const body = rows.length
      ? rows.map((row, index) => this.buildActivityGanttRowHtml(row, index, totalWidth)).join('')
      : `<div style="padding:40px;text-align:center;color:#94a3b8;font-size:13px;background:#fff;">No gantt data available.</div>`;

    return `
      <div style="min-width:${totalWidth}px;background:#fff;position:relative;">
        <div style="position:sticky;top:0;z-index:6;background:#fff;border-bottom:2px solid #cbd5e1;">
          ${headerTop}
          ${headerBottom}
          ${weeklyBand}
        </div>
        <div style="position:relative;">
          ${body}
        </div>
      </div>
    `;
  }

  private buildActivityGanttTopHeader(): string {
    const groups = this.getPaTopHeaderGroups();

    return `
      <div style="display:flex;height:${this.paHeaderHeightTop}px;border-bottom:1px solid #d8e0ea;background:#f8fafc;">
        ${groups.map(group => `
          <div style="
            width:${group.width}px;
            flex-shrink:0;
            border-right:1px solid #d8e0ea;
            display:flex;
            align-items:center;
            padding:0 10px;
            font-size:11px;
            font-weight:900;
            color:#0f5fd0;
            text-transform:uppercase;
          ">${this.escapeHtml(group.label)}</div>
        `).join('')}
      </div>
    `;
  }

  private buildActivityGanttBottomHeader(): string {
    return `
      <div style="display:flex;height:${this.paHeaderHeightBottom}px;background:#f8fafc;border-bottom:1px solid #d8e0ea;">
        ${this.timelineColumns.map(col => `
          <div style="
            width:${this.paGanttColWidth}px;
            flex-shrink:0;
            border-right:1px solid #d8e0ea;
            display:flex;
            align-items:center;
            justify-content:center;
            position:relative;
            background:${col.today ? '#eff6ff' : '#f8fafc'};
          ">
            <div style="display:flex;flex-direction:column;align-items:center;line-height:1.05;">
              <div style="font-size:11px;font-weight:800;color:#5c7797;">
                ${this.escapeHtml(col.label)}
              </div>
              <div style="font-size:10px;color:#98a7bb;">
                ${this.escapeHtml(col.subLabel || '')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  private buildWeeklyStatsBand(totalWidth: number): string {
    if (!this.weeklyStats.length || this.timelineView !== 'week') {
      return '';
    }

    const rows = this.groupWeeklyStatsByResourceType();
    if (!rows.length) {
      return '';
    }

    const bands = rows.map(statRow => {
      const cells = this.timelineColumns.map(col => {
        const match = statRow.stats.find(s => s.weekStart === col.startDate || s.weekEnd === col.endDate);
        const count = match?.resourceCount ?? 0;
        const hours = match?.plannedHours ?? 0;

        return `
          <div style="
            width:${this.paGanttColWidth}px;
            flex-shrink:0;
            border-right:1px solid #d8e0ea;
            display:flex;
            align-items:center;
            justify-content:center;
            position:relative;
          ">
            ${count > 0 || hours > 0 ? `
              <div style="display:flex;flex-direction:column;align-items:center;gap:2px;width:100%;">
                ${count > 0 ? `<div style="font-size:10px;font-weight:700;color:#557196;">${count}</div>` : '<div style="height:10px;"></div>'}
                <div style="
                  width:${Math.max(18, Math.min(this.paGanttColWidth - 8, Math.round((hours / 80) * (this.paGanttColWidth - 10))))}px;
                  height:10px;
                  border-radius:2px;
                  background:#b7dce8;
                "></div>
                ${hours > 0 ? `<div style="font-size:10px;color:#557196;">${Math.round(hours)}</div>` : '<div style="height:10px;"></div>'}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      return `
        <div style="
          display:flex;
          width:${totalWidth}px;
          height:32px;
          background:#f7fbfd;
          border-bottom:1px solid #d8e0ea;
        ">
          ${cells}
        </div>
      `;
    }).join('');

    return `<div>${bands}</div>`;
  }

  private buildActivityGanttRowHtml(
    row: ActivityGridRow,
    index: number,
    totalWidth: number
  ): string {
    if (row.kind === 'project-header') {
      return `
        <div style="
          position:relative;
          width:${totalWidth}px;
          height:${this.paRowHeight + 8}px;
          background:#dde7f4;
          border-top:1px solid #b9c7d8;
          border-bottom:1px solid #b9c7d8;
        "></div>
      `;
    }

    const bg = row.summary ? '#f2f5fa' : index % 2 === 0 ? '#ffffff' : '#fbfcfe';

    const weekendShades = this.timelineColumns
      .map((col, idx) => ({ col, idx }))
      .filter(x => x.col.weekend && this.timelineView === 'day')
      .map(x => `
        <div style="
          position:absolute;
          left:${x.idx * this.paGanttColWidth}px;
          width:${this.paGanttColWidth}px;
          top:0;
          bottom:0;
          background:rgba(0,0,0,.025);
          pointer-events:none;
        "></div>
      `).join('');

    const verticalGrid = this.timelineColumns.map((_, idx) => `
      <div style="
        position:absolute;
        top:0;
        bottom:0;
        left:${idx * this.paGanttColWidth}px;
        width:1px;
        background:#d8e0ea;
      "></div>
    `).join('');

    const barHtml = this.buildGanttBarHtml(row);

    return `
      <div style="
        position:relative;
        width:${totalWidth}px;
        height:${this.paRowHeight}px;
        background:${bg};
        border-bottom:1px solid #d7e0eb;
      ">
        ${verticalGrid}
        ${weekendShades}
        ${barHtml}
      </div>
    `;
  }

  private buildGanttBarHtml(row: ActivityGridRow): string {
    if (!row.barStart || !row.barEnd) {
      return '';
    }

    const left = this.paItemLeftPx(row.barStart);
    const width = this.paItemWidthPx(row.barStart, row.barEnd);
    const progress = this.normalizePercent(row.progressPercent);
    const label = row.barLabel || row.name;

    if (row.summary) {
      return `
        <div
          title="${this.escapeHtml(label)}"
          style="
            position:absolute;
            left:${left}px;
            width:${width}px;
            top:9px;
            height:10px;
            border-radius:3px;
            background:${row.barColor};
          "
        ></div>
      `;
    }

    return `
      <div
        title="${this.escapeHtml(label)}"
        style="
          position:absolute;
          left:${left}px;
          width:${width}px;
          top:5px;
          height:18px;
          border-radius:4px;
          background:${row.barColor};
          color:#fff;
          font-size:10px;
          font-weight:800;
          overflow:hidden;
          white-space:nowrap;
          display:flex;
          align-items:center;
          padding:0 6px;
          box-shadow:0 1px 2px rgba(0,0,0,.12);
        "
      >
        <div style="
          position:absolute;
          left:0;
          top:0;
          height:100%;
          width:${progress}%;
          background:rgba(255,255,255,.14);
        "></div>
        <div style="
          position:relative;
          z-index:1;
          overflow:hidden;
          text-overflow:ellipsis;
        ">
          ${this.escapeHtml(label)}
        </div>
      </div>
    `;
  }

  private paItemLeftPx(itemStart: string): number {
    if (!this.timelineColumns.length || !itemStart) {
      return 0;
    }

    const start = new Date(itemStart);
    const first = new Date(this.timelineColumns[0].startDate);
    const diffDays = Math.floor((start.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));

    if (this.timelineView === 'day') {
      return diffDays * this.paGanttColWidth;
    }

    return diffDays * (this.paGanttColWidth / 7);
  }

  private paItemWidthPx(itemStart: string, itemEnd: string): number {
    if (!itemStart || !itemEnd) {
      return Math.max(12, this.paGanttColWidth);
    }

    const start = new Date(itemStart);
    const end = new Date(itemEnd);
    const diffDays = Math.max(
      0,
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );

    if (this.timelineView === 'day') {
      return Math.max(this.paGanttColWidth, (diffDays + 1) * this.paGanttColWidth);
    }

    return Math.max(12, (diffDays + 1) * (this.paGanttColWidth / 7));
  }

  private getPaTopHeaderGroups(): { label: string; width: number }[] {
    const cols = this.timelineColumns;
    if (!cols.length) {
      return [];
    }

    const groups: { label: string; width: number }[] = [];
    let currentKey = '';
    let currentCount = 0;
    let currentLabel = '';

    cols.forEach((col, index) => {
      const date = new Date(col.startDate);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const label = date.toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric'
      }).toUpperCase();

      if (index === 0) {
        currentKey = key;
        currentLabel = label;
        currentCount = 1;
        return;
      }

      if (key === currentKey) {
        currentCount++;
      } else {
        groups.push({ label: currentLabel, width: currentCount * this.paGanttColWidth });
        currentKey = key;
        currentLabel = label;
        currentCount = 1;
      }
    });

    groups.push({ label: currentLabel, width: currentCount * this.paGanttColWidth });
    return groups;
  }

  private getProjectBaselineStart(block: DepartmentProjectBlock): string | null {
    const values = (block.rows ?? [])
      .map(r => r.baselineStartDate)
      .filter((v): v is string => !!v);
    return this.minDate(values);
  }

  private getProjectBaselineEnd(block: DepartmentProjectBlock): string | null {
    const values = (block.rows ?? [])
      .map(r => r.baselineEndDate)
      .filter((v): v is string => !!v);
    return this.maxDate(values);
  }

  private getProjectActualStart(block: DepartmentProjectBlock): string | null {
    const values = (block.rows ?? [])
      .map(r => r.actualStartDate || r.baselineStartDate)
      .filter((v): v is string => !!v);
    return this.minDate(values);
  }

  private getProjectActualEnd(block: DepartmentProjectBlock): string | null {
    const values = (block.rows ?? [])
      .map(r => r.actualEndDate || r.baselineEndDate)
      .filter((v): v is string => !!v);
    return this.maxDate(values);
  }

  private getProjectBarStart(block: DepartmentProjectBlock): string | null {
    return this.getProjectActualStart(block) || this.getProjectBaselineStart(block);
  }

  private getProjectBarEnd(block: DepartmentProjectBlock): string | null {
    return this.getProjectActualEnd(block) || this.getProjectBaselineEnd(block);
  }

  private getProjectDuration(block: DepartmentProjectBlock): number | null {
    const start = this.getProjectBarStart(block);
    const end = this.getProjectBarEnd(block);

    if (!start || !end) {
      return null;
    }

    const days = this.diffDaysInclusive(start, end);
    return days >= 0 ? days : null;
  }

  private getProjectProgress(block: DepartmentProjectBlock): number {
    const vals = (block.rows ?? [])
      .map(r => this.normalizePercent(r.progressPercent))
      .filter(v => !Number.isNaN(v));

    if (!vals.length) {
      return 0;
    }

    return Math.round(vals.reduce((sum, v) => sum + v, 0) / vals.length);
  }

  private getActivityBarLabel(row: DepartmentActivityRow): string {
    if (row.departmentCode) {
      return `G-${row.departmentCode}`;
    }

    return row.name;
  }

  private groupWeeklyStatsByResourceType(): { resourceType: string; stats: DepartmentWeeklyStat[] }[] {
    const grouped = new Map<string, DepartmentWeeklyStat[]>();

    for (const stat of this.weeklyStats) {
      const key = stat.resourceType || 'UNKNOWN';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(stat);
    }

    return Array.from(grouped.entries()).map(([resourceType, stats]) => ({
      resourceType,
      stats
    }));
  }

  private minDate(values: string[]): string | null {
    if (!values.length) {
      return null;
    }

    return values
      .slice()
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
  }

  private maxDate(values: string[]): string | null {
    if (!values.length) {
      return null;
    }

    return values
      .slice()
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[values.length - 1];
  }

  private diffDaysInclusive(start: string, end: string): number {
    const s = new Date(start);
    const e = new Date(end);
    return Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  private normalizePercent(value: number | null | undefined): number {
    const n = Number(value ?? 0);
    if (Number.isNaN(n)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  private formatTableDate(dateStr: string | null | undefined): string {
    if (!dateStr) {
      return '';
    }

    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) {
      return dateStr;
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('en-GB', { month: 'short' });
    const year = String(d.getFullYear()).slice(-2);

    return `${day} ${month} ${year}`;
  }

  private getTableColWidth(colId: string): string {
    switch (colId) {
      case 'wbs':
        return '60px';
      case 'activity':
        return '240px';
      case 'type':
        return '58px';
      case 'dept':
        return '62px';
      case 'bstart':
      case 'bfinish':
      case 'astart':
      case 'afinish':
        return '90px';
      case 'days':
        return '54px';
      case 'progress':
        return '62px';
      default:
        return '90px';
    }
  }

  private paCellStyle(bg: string): string {
    return `
      display:flex;
      align-items:center;
      padding:0 8px;
      font-size:12px;
      color:#1e293b;
      background:${bg};
      border-right:1px solid #d7e0eb;
      position:relative;
      overflow:hidden;
    `;
  }

  private projectHeaderStatusStyle(): string {
    return `
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:3px 12px;
      border-radius:999px;
      font-size:11px;
      font-weight:800;
      background:#d8f3dc;
      color:#2c9b56;
      white-space:nowrap;
    `;
  }

  private escapeHtml(value: string | number | null | undefined): string {
    const str = String(value ?? '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private matchesProjectStatus(block: DepartmentProjectBlock): boolean {
  if (this.selectedProjectStatus === 'ALL') {
    return true;
  }

  const status = (block.status || '').trim().toUpperCase();
  return status === this.selectedProjectStatus;
}

private matchesSearchFilter(block: DepartmentProjectBlock, search: string): boolean {
  if (!search) {
    return true;
  }

  const inProject =
    (block.projectName || '').toLowerCase().includes(search) ||
    (block.projectCode || '').toLowerCase().includes(search) ||
    (block.status || '').toLowerCase().includes(search);

  if (inProject) {
    return true;
  }

  return (block.rows || []).some(row =>
    (row.name || '').toLowerCase().includes(search) ||
    (row.wbs || '').toLowerCase().includes(search) ||
    (row.departmentCode || '').toLowerCase().includes(search) ||
    (row.type || '').toLowerCase().includes(search)
  );
}

private matchesTimeFilter(block: DepartmentProjectBlock): boolean {
  if (this.selectedTimeFilter === 'ALL_TIME') {
    return true;
  }

  const start = this.getProjectBarStart(block);
  const end = this.getProjectBarEnd(block);

  if (!start || !end) {
    return false;
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  const today = new Date();
  const range = this.getSelectedTimeRange(today);

  if (!range) {
    return true;
  }

  return !(endDate < range.start || startDate > range.end);
}

private getSelectedTimeRange(today: Date): { start: Date; end: Date } | null {
  const start = new Date(today);
  const end = new Date(today);

  switch (this.selectedTimeFilter) {
    case 'THIS_WEEK': {
      const day = start.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);

      end.setTime(start.getTime());
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case 'THIS_MONTH': {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case 'NEXT_MONTH': {
      start.setMonth(start.getMonth() + 1, 1);
      start.setHours(0, 0, 0, 0);

      end.setMonth(start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case 'THIS_QUARTER': {
      const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3;
      start.setMonth(quarterStartMonth, 1);
      start.setHours(0, 0, 0, 0);

      end.setMonth(quarterStartMonth + 3, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case 'NEXT_6_MONTHS': {
      start.setHours(0, 0, 0, 0);

      end.setMonth(end.getMonth() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case 'THIS_YEAR': {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);

      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    default:
      return null;
  }
  }

  private shouldShowResourceItem(item: any): boolean {
  if (item.holiday) {
    return true;
  }

  const isInternal = item.internalResource === true;
  const isSupplier = item.internalResource === false;

  if (isInternal && !this.showResources) {
    return false;
  }

  if (isSupplier && !this.showSuppliers) {
    return false;
  }

  return true;
}


}