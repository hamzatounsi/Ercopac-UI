import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, Renderer2, SimpleChanges, ViewChild } from '@angular/core';

interface CalendarDay {
  date: Date;
  value: string;
  label: number;
  inCurrentMonth: boolean;
  working: boolean;
}

@Component({
  selector: 'app-gantt-date-picker',
  templateUrl: './gantt-date-picker.component.html',
  styleUrls: ['./gantt-date-picker.component.scss']
})
export class GanttDatePickerComponent implements OnChanges, OnDestroy {
  @Input() value: string | null | undefined = null;
  @Input() workingDays: readonly number[] = [1, 2, 3, 4, 5];
  @Input() disabled = false;
  @Input() ariaLabel = 'Select date';
  @Output() valueChange = new EventEmitter<string>();
  @ViewChild('trigger') trigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('popover') popover?: ElementRef<HTMLDivElement>;

  calendarOpen = false;
  viewDate = new Date();
  popoverLeft = 8;
  popoverTop = 8;
  readonly weekdayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  private removeOutsideClickListener?: () => void;
  private removeResizeListener?: () => void;
  private removeScrollListener?: () => void;
  private resizeObserver?: ResizeObserver;
  private popoverOriginalParent: Node | null = null;
  private popoverPortaled = false;
  private popupMountTimer: ReturnType<typeof setTimeout> | null = null;
  private positionUpdateFrame: number | null = null;

  constructor(private renderer: Renderer2) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.value && !this.calendarOpen) {
      this.viewDate = this.parseDate(this.value) ?? new Date();
    }
  }

  get monthLabel(): string {
    return this.viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }

  get calendarDays(): CalendarDay[] {
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() || 7) - 1;
    const workingDays = new Set(this.workingDays);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(year, month, index - offset + 1);
      return {
        date,
        value: this.toDateValue(date),
        label: date.getDate(),
        inCurrentMonth: date.getMonth() === month,
        working: workingDays.has(date.getDay() || 7)
      };
    });
  }

  toggleCalendar(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled) return;
    if (this.calendarOpen) {
      this.closeCalendar();
      return;
    }
    if (this.value) this.viewDate = this.parseDate(this.value) ?? this.viewDate;
    this.positionPopover(event.currentTarget as HTMLElement);
    this.calendarOpen = true;
    this.addOverlayListeners();
    this.popupMountTimer = setTimeout(() => {
      this.popupMountTimer = null;
      if (!this.calendarOpen) return;
      this.portalPopover();
      this.schedulePositionUpdate();
    });
  }

  previousMonth(event: MouseEvent): void {
    event.stopPropagation();
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
  }

  nextMonth(event: MouseEvent): void {
    event.stopPropagation();
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
  }

  selectDay(event: MouseEvent, day: CalendarDay): void {
    event.stopPropagation();
    if (this.disabled || !day.inCurrentMonth || !day.working) return;
    this.valueChange.emit(day.value);
    this.viewDate = day.date;
    this.closeCalendar();
  }

  isSelected(day: CalendarDay): boolean { return day.value === this.value; }
  isToday(day: CalendarDay): boolean { return day.value === this.toDateValue(new Date()); }

  formatDisplayDate(value: string | null | undefined): string {
    const date = value ? this.parseDate(value) : null;
    if (!date) return 'DD.MM.YYYY';
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  }

  ngOnDestroy(): void { this.closeCalendar(); }

  private positionPopover(trigger: HTMLElement): void {
    const rect = trigger.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) {
      this.closeCalendar();
      return;
    }
    const width = 232;
    const height = 240;
    this.popoverLeft = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    this.popoverTop = rect.bottom + height + 4 <= window.innerHeight
      ? rect.bottom + 4
      : Math.max(8, rect.top - height - 4);
  }

  private portalPopover(): void {
    const popover = this.popover?.nativeElement;
    if (!popover || this.popoverPortaled) return;
    this.popoverOriginalParent = popover.parentNode;
    this.renderer.appendChild(document.body, popover);
    this.popoverPortaled = true;
  }

  private restorePopover(): void {
    const popover = this.popover?.nativeElement;
    if (popover && this.popoverPortaled && this.popoverOriginalParent) {
      this.renderer.appendChild(this.popoverOriginalParent, popover);
    }
    this.popoverPortaled = false;
    this.popoverOriginalParent = null;
  }

  private addOverlayListeners(): void {
    if (!this.removeOutsideClickListener) {
      this.removeOutsideClickListener = this.renderer.listen('document', 'mousedown', (event: MouseEvent) => {
        const target = event.target as Node | null;
        if (!target || this.trigger?.nativeElement.contains(target) || this.popover?.nativeElement.contains(target)) return;
        this.closeCalendar();
      });
    }
    if (!this.removeResizeListener) {
      this.removeResizeListener = this.renderer.listen('window', 'resize', () => this.schedulePositionUpdate());
    }
    if (!this.removeScrollListener) {
      const onScroll = () => this.schedulePositionUpdate();
      document.addEventListener('scroll', onScroll, true);
      this.removeScrollListener = () => document.removeEventListener('scroll', onScroll, true);
    }
    if (!this.resizeObserver && this.trigger) {
      this.resizeObserver = new ResizeObserver(() => this.schedulePositionUpdate());
      this.resizeObserver.observe(this.trigger.nativeElement);
      const ganttPane = this.trigger.nativeElement.closest('.planner-left');
      if (ganttPane) this.resizeObserver.observe(ganttPane);
    }
  }

  private schedulePositionUpdate(): void {
    if (!this.calendarOpen || this.positionUpdateFrame !== null) return;
    this.positionUpdateFrame = requestAnimationFrame(() => {
      this.positionUpdateFrame = null;
      if (this.calendarOpen && this.trigger) this.positionPopover(this.trigger.nativeElement);
    });
  }

  private closeCalendar(): void {
    if (this.popupMountTimer !== null) {
      clearTimeout(this.popupMountTimer);
      this.popupMountTimer = null;
    }
    this.removeOutsideClickListener?.();
    this.removeOutsideClickListener = undefined;
    this.removeResizeListener?.();
    this.removeResizeListener = undefined;
    this.removeScrollListener?.();
    this.removeScrollListener = undefined;
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    if (this.positionUpdateFrame !== null) {
      cancelAnimationFrame(this.positionUpdateFrame);
      this.positionUpdateFrame = null;
    }
    this.restorePopover();
    this.calendarOpen = false;
  }

  private parseDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toDateValue(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
