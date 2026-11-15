import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener,
  Input, OnDestroy, OnInit, Output, forwardRef
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, takeUntil, tap } from 'rxjs';
import { UpperNamePipe } from '../names/upper-name.pipe';
import { CustomerOption } from './customer.models';
import { CustomerService } from './customer.service';

let nextId = 0;

/**
 * Searchable customer dropdown (ARIA combobox). The value is the customer id (or null).
 * Lists the active customers of the signed-in user's organisation; the current value is shown
 * even when that customer was deactivated since, so existing records still display it.
 *
 *   <app-customer-select [(ngModel)]="form.customerId" (customerChange)="form.customer = $event?.name ?? ''">
 *   <app-customer-select formControlName="customerId" [allowNone]="false">
 */
@Component({
  selector: 'app-customer-select',
  standalone: true,
  imports: [CommonModule, TranslateModule, UpperNamePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CustomerSelectComponent), multi: true }],
  template: `
    <div class="cs" [class.open]="open" [class.disabled]="disabled">
      <div class="cs-field">
        <span class="material-symbols-outlined cs-icon" aria-hidden="true">apartment</span>
        <input
          #input
          class="cs-input"
          type="text"
          role="combobox"
          autocomplete="off"
          [id]="inputId"
          [disabled]="disabled"
          [attr.aria-expanded]="open"
          [attr.aria-controls]="listId"
          [attr.aria-activedescendant]="open && activeIndex >= 0 ? optionId(activeIndex) : null"
          [attr.aria-label]="ariaLabel || ('customers.select.label' | translate)"
          [attr.aria-invalid]="invalid || null"
          aria-autocomplete="list"
          [placeholder]="placeholder || ('customers.select.placeholder' | translate)"
          [value]="open ? query : (selected ? (selected.name | upperName) : '')"
          (focus)="openList()"
          (click)="openList()"
          (input)="onQuery(input.value)"
          (keydown)="onKeydown($event)"
          (blur)="onTouched()" />
        <span *ngIf="selected && !selected.active && !open" class="cs-badge">{{ 'customers.select.inactive' | translate }}</span>
        <button *ngIf="allowNone && value !== null && !disabled" type="button" class="cs-clear"
                [attr.aria-label]="'customers.select.clear' | translate" (mousedown)="$event.preventDefault()" (click)="choose(null)">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        <span class="material-symbols-outlined cs-chevron" aria-hidden="true">expand_more</span>
      </div>

      <ul *ngIf="open" class="cs-list" role="listbox" [id]="listId" (mousedown)="$event.preventDefault()">
        <li *ngIf="loading" class="cs-state" role="presentation">{{ 'customers.select.loading' | translate }}</li>
        <li *ngIf="!loading && loadError" class="cs-state error" role="presentation">
          {{ 'customers.select.loadError' | translate }}
          <button type="button" (click)="reload()">{{ 'common.retry' | translate }}</button>
        </li>
        <li *ngIf="!loading && !loadError && allowNone" role="option" class="cs-option none" [id]="optionId(-1)"
            [attr.aria-selected]="value === null" [class.active]="activeIndex === -1" (click)="choose(null)">
          {{ noneLabel || ('customers.select.none' | translate) }}
        </li>
        <li *ngFor="let option of options; let i = index; trackBy: trackById" role="option" class="cs-option"
            [id]="optionId(i)" [attr.aria-selected]="option.id === value" [class.active]="i === activeIndex"
            [class.selected]="option.id === value" (click)="choose(option)">
          <span class="cs-name">{{ option.name | upperName }}</span>
          <span class="cs-code">{{ option.code }}</span>
          <span *ngIf="!option.active" class="cs-badge">{{ 'customers.select.inactive' | translate }}</span>
        </li>
        <li *ngIf="!loading && !loadError && !options.length" class="cs-state" role="presentation">
          {{ query ? ('customers.select.noResults' | translate) : ('customers.select.noCustomers' | translate) }}
        </li>
      </ul>
    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }
    .cs-field { display: flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 10px;
      border: 1px solid var(--pm-input-border, var(--pm-border)); border-radius: var(--pm-radius, 8px);
      background: var(--pm-surface); color: var(--pm-text); }
    .cs.open .cs-field, .cs-field:focus-within { border-color: var(--pm-primary); box-shadow: 0 0 0 3px var(--pm-focus); }
    .cs.disabled .cs-field { background: var(--pm-surface-muted); opacity: .7; }
    .cs-input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: inherit; font: inherit; padding: 8px 0; }
    .cs-icon, .cs-chevron { font-size: 18px; color: var(--pm-text-muted); }
    .cs-clear { display: inline-flex; border: 0; background: transparent; color: var(--pm-text-muted); cursor: pointer; padding: 2px; border-radius: 50%; }
    .cs-clear:hover, .cs-clear:focus-visible { background: var(--pm-surface-muted); color: var(--pm-text); }
    .cs-clear .material-symbols-outlined { font-size: 16px; }
    .cs-list { position: absolute; z-index: 40; inset-inline: 0; top: calc(100% + 4px); margin: 0; padding: 4px; list-style: none;
      max-height: 260px; overflow-y: auto; background: var(--pm-surface-raised, var(--pm-surface));
      border: 1px solid var(--pm-border); border-radius: var(--pm-radius, 8px); box-shadow: var(--pm-shadow-lg); }
    .cs-option { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: var(--pm-radius-sm, 6px); cursor: pointer; }
    .cs-option.active { background: var(--pm-primary-soft); }
    .cs-option.selected .cs-name { font-weight: var(--pm-weight-semibold, 600); color: var(--pm-primary-text, var(--pm-primary)); }
    .cs-option.none { color: var(--pm-text-muted); font-style: italic; }
    .cs-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cs-code { font-family: var(--pm-font-mono); font-size: var(--pm-text-xs, 12px); color: var(--pm-text-muted); }
    .cs-badge { font-size: 11px; padding: 1px 6px; border-radius: var(--pm-radius-pill, 999px);
      background: var(--pm-warning-soft); color: var(--pm-warning-text); white-space: nowrap; }
    .cs-state { padding: 10px; color: var(--pm-text-muted); font-size: var(--pm-text-sm, 13px); }
    .cs-state.error { color: var(--pm-danger-text); display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .cs-state.error button { border: 1px solid var(--pm-border); background: var(--pm-surface); color: var(--pm-text); border-radius: var(--pm-radius-sm, 6px); padding: 4px 8px; cursor: pointer; }
  `]
})
export class CustomerSelectComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @Input() placeholder = '';
  @Input() noneLabel = '';
  @Input() ariaLabel = '';
  @Input() allowNone = true;
  @Input() invalid = false;
  @Input() inputId = `customer-select-${nextId++}`;
  /** Emitted with the chosen option (null when cleared), e.g. to keep a name field in sync. */
  @Output() readonly customerChange = new EventEmitter<CustomerOption | null>();

  readonly listId = `${this.inputId}-list`;
  value: number | null = null;
  selected: CustomerOption | null = null;
  options: CustomerOption[] = [];
  query = '';
  open = false;
  loading = false;
  loadError = false;
  disabled = false;
  activeIndex = -1;

  private readonly search$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();
  private onChange: (value: number | null) => void = () => {};
  onTouched: () => void = () => {};

  constructor(
    private readonly customers: CustomerService,
    private readonly host: ElementRef<HTMLElement>,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.search$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      tap(() => { this.loading = true; this.loadError = false; this.cdr.markForCheck(); }),
      switchMap(search => this.customers.options(search, this.value).pipe(
        catchError(() => { this.loadError = true; return of([] as CustomerOption[]); })
      )),
      takeUntil(this.destroy$)
    ).subscribe(options => {
      this.options = options;
      this.loading = false;
      this.syncSelected();
      this.activeIndex = this.options.findIndex(option => option.id === this.value);
      this.cdr.markForCheck();
    });
    this.search$.next('');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ------------------------------------------------------------ ControlValueAccessor

  writeValue(value: number | null | undefined): void {
    this.value = value ?? null;
    this.syncSelected();
    // The current value may be a deactivated customer that is not in the active list yet.
    if (this.value !== null && !this.selected) {
      this.customers.options(null, this.value).pipe(catchError(() => of([] as CustomerOption[])), takeUntil(this.destroy$))
        .subscribe(options => {
          const match = options.find(option => option.id === this.value);
          if (match) {
            this.selected = match;
            if (!this.options.some(option => option.id === match.id)) this.options = [match, ...this.options];
          }
          this.cdr.markForCheck();
        });
    }
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: number | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; this.cdr.markForCheck(); }

  // ------------------------------------------------------------ interaction

  openList(): void {
    if (this.disabled || this.open) return;
    this.open = true;
    this.query = '';
    this.activeIndex = this.options.findIndex(option => option.id === this.value);
  }

  onQuery(text: string): void {
    this.query = text;
    this.open = true;
    this.search$.next(text.trim());
  }

  reload(): void {
    this.customers.options(this.query, this.value).pipe(takeUntil(this.destroy$)).subscribe({
      next: options => { this.options = options; this.loadError = false; this.syncSelected(); this.cdr.markForCheck(); },
      error: () => { this.loadError = true; this.cdr.markForCheck(); }
    });
  }

  choose(option: CustomerOption | null): void {
    this.value = option?.id ?? null;
    this.selected = option;
    this.onChange(this.value);
    this.customerChange.emit(option);
    this.close();
  }

  onKeydown(event: KeyboardEvent): void {
    const first = this.allowNone ? -1 : 0;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open) { this.openList(); return; }
        this.activeIndex = Math.min(this.activeIndex + 1, this.options.length - 1);
        this.scrollActiveIntoView();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex = Math.max(this.activeIndex - 1, first);
        this.scrollActiveIntoView();
        break;
      case 'Enter':
        if (!this.open) return;
        event.preventDefault();
        if (this.activeIndex === -1 && this.allowNone) this.choose(null);
        else if (this.options[this.activeIndex]) this.choose(this.options[this.activeIndex]);
        break;
      case 'Escape':
        if (this.open) { event.preventDefault(); event.stopPropagation(); this.close(); }
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  optionId(index: number): string {
    return `${this.inputId}-option-${index < 0 ? 'none' : index}`;
  }

  trackById(_: number, option: CustomerOption): number {
    return option.id;
  }

  private close(): void {
    this.open = false;
    if (this.query) {
      this.query = '';
      this.search$.next('');
    }
    this.cdr.markForCheck();
  }

  private syncSelected(): void {
    if (this.value === null) { this.selected = null; return; }
    const match = this.options.find(option => option.id === this.value);
    if (match) this.selected = match;
  }

  private scrollActiveIntoView(): void {
    setTimeout(() => this.host.nativeElement.querySelector(`#${this.optionId(this.activeIndex)}`)?.scrollIntoView({ block: 'nearest' }));
  }
}
