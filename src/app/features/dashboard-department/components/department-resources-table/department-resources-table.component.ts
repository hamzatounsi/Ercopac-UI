import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { DepartmentHoliday } from '../../models/department-holiday.model';
import { DepartmentMember } from '../../models/department-member.model';
import { DepartmentResourceRow } from '../../models/department-resource-row.model';
import { DepartmentTimelineItem } from '../../models/department-timeline-item.model';
import { ClientTable } from '../../utils/client-table';
import { currentWeek, initialsOf, overlaps, todayIso } from '../../utils/department-dates';

export type ResourceKind = 'internal' | 'generic';
export type ResourceAvailability = 'available' | 'assigned' | 'onLeave' | 'none';

export interface ResourceTableRow {
  member: DepartmentMember;
  kind: ResourceKind;
  availability: ResourceAvailability;
  /** Activities overlapping the current week. */
  weekAssignments: number;
  /** Activities that are not finished yet. */
  openAssignments: number;
  hoursPerWeek: number | null;
  items: DepartmentTimelineItem[];
}

type ResourceSortKey = 'name' | 'type' | 'kind' | 'capacity' | 'assignments' | 'availability';

/** Resources tab of My Department: the department's people and generic placeholders, with this week's availability. */
@Component({
  selector: 'app-department-resources-table',
  templateUrl: './department-resources-table.component.html',
  styleUrls: ['./department-resources-table.component.scss']
})
export class DepartmentResourcesTableComponent implements OnChanges {
  @Input() rows: DepartmentResourceRow[] = [];
  @Input() holidays: DepartmentHoliday[] = [];
  @Input() loading = false;
  @Input() canManageResources = false;
  /** Asks the page to show this resource on the timeline. */
  @Output() showOnTimeline = new EventEmitter<void>();

  readonly table = new ClientTable<ResourceTableRow, ResourceSortKey>({
    initialSort: 'name',
    searchText: row => [row.member.fullName, row.member.employeeCode, row.member.email, row.member.resourceType,
      row.member.seniority].filter(Boolean).join(' '),
    sortValue: {
      name: row => (row.kind === 'generic' ? '~' : '') + (row.member.fullName || ''),
      type: row => row.member.resourceType,
      kind: row => row.kind,
      capacity: row => row.hoursPerWeek,
      assignments: row => row.openAssignments,
      availability: row => AVAILABILITY_ORDER[row.availability]
    }
  });

  typeFilter = '';
  kindFilter: '' | ResourceKind = '';
  availabilityFilter: '' | ResourceAvailability = '';
  resourceTypes: string[] = [];
  selected: ResourceTableRow | null = null;

  @ViewChild('closeButton') private closeButton?: ElementRef<HTMLButtonElement>;
  private returnFocus: HTMLElement | null = null;

  ngOnChanges(): void {
    const today = todayIso();
    const week = currentWeek();
    const tableRows = (this.rows || [])
      .filter(row => row.member.role !== 'SUPPLIER' && row.member.id !== GENERIC_POOL_ID)
      .map(row => this.toTableRow(row, today, week));

    this.resourceTypes = [...new Set(tableRows.map(row => row.member.resourceType).filter((type): type is string => !!type))].sort();
    this.table.setRows(tableRows);
    if (this.selected) {
      this.selected = tableRows.find(row => row.member.id === this.selected?.member.id) ?? null;
    }
  }

  onSearch(value: string): void {
    this.table.setSearch(value);
  }

  onTypeFilter(value: string): void {
    this.typeFilter = value;
    this.table.setFilter('type', value ? row => row.member.resourceType === value : null);
  }

  onKindFilter(value: '' | ResourceKind): void {
    this.kindFilter = value;
    this.table.setFilter('kind', value ? row => row.kind === value : null);
  }

  onAvailabilityFilter(value: '' | ResourceAvailability): void {
    this.availabilityFilter = value;
    this.table.setFilter('availability', value ? row => row.availability === value : null);
  }

  clearFilters(): void {
    this.typeFilter = '';
    this.kindFilter = '';
    this.availabilityFilter = '';
    this.table.clearFilters();
  }

  open(row: ResourceTableRow): void {
    this.returnFocus = document.activeElement as HTMLElement | null;
    this.selected = row;
    setTimeout(() => this.closeButton?.nativeElement.focus());
  }

  close(): void {
    if (!this.selected) {
      return;
    }
    this.selected = null;
    this.returnFocus?.focus();
    this.returnFocus = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  initials(name: string): string {
    return initialsOf(name);
  }

  availabilityClass(value: ResourceAvailability): string {
    return value === 'available' ? 'success' : value === 'assigned' ? 'info' : value === 'onLeave' ? 'warning' : '';
  }

  /** Activities of the selected resource that are not finished, earliest first. */
  get selectedOpenItems(): DepartmentTimelineItem[] {
    const today = todayIso();
    return (this.selected?.items ?? [])
      .filter(item => (item.endDate || item.startDate) >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 10);
  }

  get selectedHolidays(): DepartmentHoliday[] {
    const today = todayIso();
    const id = this.selected?.member.id;
    return this.holidays
      .filter(holiday => holiday.memberId === id && holiday.toDate >= today)
      .sort((a, b) => a.fromDate.localeCompare(b.fromDate));
  }

  trackByMember(_: number, row: ResourceTableRow): number {
    return row.member.id;
  }

  private toTableRow(row: DepartmentResourceRow, today: string, week: { start: string; end: string }): ResourceTableRow {
    const member = row.member;
    const kind: ResourceKind = member.role === 'GENERIC' ? 'generic' : 'internal';
    const activities = (row.items || []).filter(item => !item.holiday);
    const weekAssignments = activities.filter(item => overlaps(item.startDate, item.endDate, week.start, week.end)).length;
    const openAssignments = activities.filter(item => (item.endDate || item.startDate) >= today).length;
    const onLeave = kind === 'internal' && this.holidays.some(holiday =>
      holiday.memberId === member.id && overlaps(holiday.fromDate, holiday.toDate, today, today));

    let availability: ResourceAvailability = 'none';
    if (kind === 'internal') {
      availability = onLeave ? 'onLeave' : weekAssignments > 0 ? 'assigned' : 'available';
    }

    const hoursPerWeek = member.hoursPerDay != null && member.daysPerWeek != null
      ? member.hoursPerDay * member.daysPerWeek
      : null;

    return { member, kind, availability, weekAssignments, openAssignments, hoursPerWeek, items: activities };
  }
}

/** Id of the catch-all "Generic" row of the overview (not a real resource). */
const GENERIC_POOL_ID = -999_999;

const AVAILABILITY_ORDER: Record<ResourceAvailability, number> = { available: 0, assigned: 1, onLeave: 2, none: 3 };
