import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { I18nService } from 'src/app/core/i18n/i18n.service';
import { AdminToastService } from 'src/app/features/dashboard-org-admin/shared/admin-toast.service';
import { CreateDepartmentHolidayRequest } from '../../models/create-department-holiday-request.model';
import { DepartmentHoliday } from '../../models/department-holiday.model';
import { DepartmentMember } from '../../models/department-member.model';
import { MyDepartmentService } from '../../service/my-department.service';
import { ClientTable } from '../../utils/client-table';
import { daysInclusive, initialsOf, todayIso } from '../../utils/department-dates';

export type HolidayPeriod = 'ongoing' | 'upcoming' | 'past';

interface HolidayRow {
  holiday: DepartmentHoliday;
  period: HolidayPeriod;
  days: number;
}

type HolidaySortKey = 'member' | 'from' | 'to' | 'days' | 'period';

/** Holidays tab of My Department: list, add and remove the holidays of the department's resources. */
@Component({
  selector: 'app-department-holidays-panel',
  templateUrl: './department-holidays-panel.component.html',
  styleUrls: ['./department-holidays-panel.component.scss']
})
export class DepartmentHolidaysPanelComponent implements OnChanges {
  @Input() holidays: DepartmentHoliday[] = [];
  /** People of the department (holidays can only be planned for real resources). */
  @Input() members: DepartmentMember[] = [];
  @Input() canManage = false;
  @Input() loading = false;
  @Output() changed = new EventEmitter<void>();

  readonly table = new ClientTable<HolidayRow, HolidaySortKey>({
    initialSort: 'from',
    searchText: row => [row.holiday.memberName, row.holiday.note].filter(Boolean).join(' '),
    sortValue: {
      member: row => row.holiday.memberName,
      from: row => row.holiday.fromDate,
      to: row => row.holiday.toDate,
      days: row => row.days,
      period: row => PERIOD_ORDER[row.period]
    }
  });

  periodFilter: '' | 'current' | HolidayPeriod = 'current';
  memberFilter = '';

  drawerOpen = false;
  saving = false;
  submitted = false;
  formError = '';
  pendingDelete: DepartmentHoliday | null = null;
  deleting = false;

  readonly form: FormGroup = this.fb.group({
    memberId: [null as number | null, Validators.required],
    fromDate: ['', Validators.required],
    toDate: ['', Validators.required],
    note: ['', Validators.maxLength(255)]
  }, { validators: dateOrderValidator });

  @ViewChild('drawerClose') private drawerClose?: ElementRef<HTMLButtonElement>;
  @ViewChild('confirmCancel') private confirmCancel?: ElementRef<HTMLButtonElement>;
  private returnFocus: HTMLElement | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: MyDepartmentService,
    private readonly toast: AdminToastService,
    private readonly i18n: I18nService
  ) {
    this.applyPeriodFilter();
  }

  ngOnChanges(): void {
    const today = todayIso();
    this.table.setRows((this.holidays ?? []).map(holiday => ({
      holiday,
      period: holiday.toDate < today ? 'past' : holiday.fromDate > today ? 'upcoming' : 'ongoing',
      days: daysInclusive(holiday.fromDate, holiday.toDate)
    })));
  }

  get people(): DepartmentMember[] {
    return (this.members ?? [])
      .filter(member => member.internal && member.id > 0 && member.role !== 'GENERIC')
      .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  }

  onSearch(value: string): void {
    this.table.setSearch(value);
  }

  onPeriodFilter(value: '' | 'current' | HolidayPeriod): void {
    this.periodFilter = value;
    this.applyPeriodFilter();
  }

  onMemberFilter(value: string): void {
    this.memberFilter = value;
    const id = Number(value);
    this.table.setFilter('member', value ? row => row.holiday.memberId === id : null);
  }

  clearFilters(): void {
    this.periodFilter = '';
    this.memberFilter = '';
    this.table.clearFilters();
  }

  periodClass(period: HolidayPeriod): string {
    return period === 'ongoing' ? 'warning' : period === 'upcoming' ? 'info' : '';
  }

  initials(name: string): string {
    return initialsOf(name);
  }

  // ------------------------------------------------------------ add

  /** Opens the add form, optionally for a given person. */
  openCreate(memberId?: number | null): void {
    if (!this.canManage || !this.people.length) {
      return;
    }
    const today = todayIso();
    const fallback = this.memberFilter ? Number(this.memberFilter) : this.people[0].id;
    this.form.reset({ memberId: memberId ?? fallback, fromDate: today, toDate: today, note: '' });
    this.submitted = false;
    this.formError = '';
    this.returnFocus = document.activeElement as HTMLElement | null;
    this.drawerOpen = true;
    setTimeout(() => this.drawerClose?.nativeElement.focus());
  }

  closeDrawer(): void {
    if (!this.drawerOpen || this.saving) {
      return;
    }
    this.drawerOpen = false;
    this.restoreFocus();
  }

  isInvalid(control: string): boolean {
    const field = this.form.get(control);
    return !!field && field.invalid && (field.touched || this.submitted);
  }

  get dateOrderInvalid(): boolean {
    return !!this.form.errors?.['dateOrder'] && (this.submitted || !!this.form.get('toDate')?.touched);
  }

  save(): void {
    this.submitted = true;
    this.formError = '';
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    const request: CreateDepartmentHolidayRequest = {
      memberId: Number(value.memberId),
      fromDate: value.fromDate,
      toDate: value.toDate,
      note: (value.note ?? '').trim() || null
    };
    const memberName = this.people.find(member => member.id === request.memberId)?.fullName ?? '';

    this.saving = true;
    this.service.createHoliday(request)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.toast.show(this.i18n.t('department.workspace.holidays.toast.created', { name: memberName.toLocaleUpperCase() }), 'success');
          this.drawerOpen = false;
          this.restoreFocus();
          this.changed.emit();
        },
        error: err => {
          this.formError = this.i18n.error(err, 'department.my.failedAddHoliday');
        }
      });
  }

  // ------------------------------------------------------------ delete

  requestDelete(holiday: DepartmentHoliday): void {
    if (!this.canManage) {
      return;
    }
    this.returnFocus = document.activeElement as HTMLElement | null;
    this.pendingDelete = holiday;
    setTimeout(() => this.confirmCancel?.nativeElement.focus());
  }

  cancelDelete(): void {
    if (this.deleting) {
      return;
    }
    this.pendingDelete = null;
    this.restoreFocus();
  }

  confirmDelete(): void {
    const holiday = this.pendingDelete;
    if (!holiday) {
      return;
    }
    this.deleting = true;
    this.service.deleteHoliday(holiday.id)
      .pipe(finalize(() => (this.deleting = false)))
      .subscribe({
        next: () => {
          this.toast.show(this.i18n.t('department.workspace.holidays.toast.deleted',
            { name: (holiday.memberName || '').toLocaleUpperCase() }), 'success');
          this.pendingDelete = null;
          this.returnFocus = null;
          this.changed.emit();
        },
        error: err => {
          this.pendingDelete = null;
          this.toast.show(this.i18n.error(err, 'department.my.failedDeleteHoliday'), 'error');
          this.restoreFocus();
        }
      });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.pendingDelete) {
      this.cancelDelete();
    } else {
      this.closeDrawer();
    }
  }

  trackById(_: number, row: HolidayRow): number {
    return row.holiday.id;
  }

  private applyPeriodFilter(): void {
    const value = this.periodFilter;
    if (!value) {
      this.table.setFilter('period', null);
    } else if (value === 'current') {
      this.table.setFilter('period', row => row.period !== 'past');
    } else {
      this.table.setFilter('period', row => row.period === value);
    }
  }

  private restoreFocus(): void {
    this.returnFocus?.focus();
    this.returnFocus = null;
  }
}

const PERIOD_ORDER: Record<HolidayPeriod, number> = { ongoing: 0, upcoming: 1, past: 2 };

function dateOrderValidator(group: AbstractControl): ValidationErrors | null {
  const from = group.get('fromDate')?.value;
  const to = group.get('toDate')?.value;
  return from && to && to < from ? { dateOrder: true } : null;
}
