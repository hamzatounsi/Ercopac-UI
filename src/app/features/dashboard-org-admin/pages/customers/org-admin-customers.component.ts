import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { Subject, catchError, concatMap, debounceTime, distinctUntilChanged, finalize, from, of, switchMap, takeUntil, toArray } from 'rxjs';
import { COUNTRIES } from 'src/app/core/customers/countries';
import { Customer, CustomerReferences, CustomerSortKey, SaveCustomerRequest, totalReferences } from 'src/app/core/customers/customer.models';
import { CustomerService } from 'src/app/core/customers/customer.service';
import { I18nService } from 'src/app/core/i18n/i18n.service';
import { toUpperName } from 'src/app/core/names';
import { OrgAdminService } from '../../services/org-admin.service';
import { AdminToastService } from '../../shared/admin-toast.service';

type StatusFilter = '' | 'active' | 'inactive';

interface DeleteDialog {
  customer: Customer;
  /** Known references: from the list, refreshed by the 409 response when the server knows more. */
  references: CustomerReferences;
}

/**
 * Customer Management (ORG_ADMIN): customers of the administrator's organisation, with
 * server-side search, sorting and pagination. A referenced customer cannot be deleted:
 * the dialog offers to deactivate it instead.
 */
@Component({
  selector: 'app-org-admin-customers',
  templateUrl: './org-admin-customers.component.html',
  styleUrls: ['./org-admin-customers.component.scss']
})
export class OrgAdminCustomersComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly reload$ = new Subject<void>();

  readonly countries = COUNTRIES;
  readonly pageSizes = [10, 20, 50, 100];
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly statusControl = new FormControl<StatusFilter>('', { nonNullable: true });

  customers: Customer[] = [];
  page = 0;
  size = 20;
  totalElements = 0;
  totalPages = 0;
  sort: CustomerSortKey = 'name';
  direction: 'asc' | 'desc' = 'asc';

  firstLoad = true;
  loading = false;
  errorMessage = '';

  drawerOpen = false;
  editing: Customer | null = null;
  saving = false;
  formError = '';

  deleteDialog: DeleteDialog | null = null;
  busyId: number | null = null;
  importing = false;

  readonly form = this.formBuilder.nonNullable.group({
    customerCode: ['', Validators.pattern(/^([A-Za-z0-9_-]{2,40})?$/)],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    country: ['', Validators.maxLength(80)],
    town: ['', Validators.maxLength(100)],
    address: ['', Validators.maxLength(250)],
    vatTaxId: ['', Validators.maxLength(80)],
    erpId: ['', Validators.maxLength(80)],
    contactPerson: ['', Validators.maxLength(150)],
    email: ['', [Validators.email, Validators.maxLength(180)]],
    phone: ['', Validators.maxLength(50)],
    active: [true]
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly customerService: CustomerService,
    private readonly orgAdminService: OrgAdminService,
    private readonly toast: AdminToastService,
    private readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.reload$.pipe(
      switchMap(() => {
        this.loading = true;
        this.errorMessage = '';
        return this.customerService.list({
          search: this.searchControl.value,
          active: this.statusControl.value === '' ? null : this.statusControl.value === 'active',
          page: this.page,
          size: this.size,
          sort: this.sort,
          direction: this.direction
        }).pipe(
          catchError(error => {
            this.errorMessage = this.i18n.error(error, 'orgAdmin.customers.loadError');
            return of(null);
          }),
          finalize(() => { this.loading = false; this.firstLoad = false; })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (!result) return;
      // Deleting the last row of the last page: step back one page.
      if (!result.content.length && result.page > 0 && result.totalPages > 0 && result.page >= result.totalPages) {
        this.page = result.totalPages - 1;
        this.reload$.next();
        return;
      }
      this.customers = result.content;
      this.totalElements = result.totalElements;
      this.totalPages = result.totalPages;
    });

    this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.firstPage());
    this.statusControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.firstPage());

    this.reload$.next();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.deleteDialog && this.busyId === null) this.deleteDialog = null;
    else if (this.drawerOpen) this.closeDrawer();
  }

  // ------------------------------------------------------------ list

  load(): void {
    this.reload$.next();
  }

  get hasFilters(): boolean {
    return !!this.searchControl.value.trim() || this.statusControl.value !== '';
  }

  clearFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.statusControl.setValue('', { emitEvent: false });
    this.firstPage();
  }

  setSort(column: CustomerSortKey): void {
    this.direction = this.sort === column && this.direction === 'asc' ? 'desc' : 'asc';
    this.sort = column;
    this.firstPage();
  }

  ariaSort(column: CustomerSortKey): 'ascending' | 'descending' | 'none' {
    return this.sort !== column ? 'none' : this.direction === 'asc' ? 'ascending' : 'descending';
  }

  setPageSize(value: string): void {
    this.size = Number(value) || 20;
    this.firstPage();
  }

  previousPage(): void {
    if (this.page > 0) { this.page--; this.load(); }
  }

  nextPage(): void {
    if (this.page + 1 < this.totalPages) { this.page++; this.load(); }
  }

  get rangeStart(): number {
    return this.totalElements ? this.page * this.size + 1 : 0;
  }

  get rangeEnd(): number {
    return Math.min((this.page + 1) * this.size, this.totalElements);
  }

  references(customer: Customer): number {
    return totalReferences(customer.references);
  }

  trackById(_: number, customer: Customer): number {
    return customer.id;
  }

  private firstPage(): void {
    this.page = 0;
    this.load();
  }

  // ------------------------------------------------------------ create / edit

  openCreate(): void {
    this.editing = null;
    this.formError = '';
    this.form.reset({ customerCode: '', name: '', country: '', town: '', address: '', vatTaxId: '', erpId: '', contactPerson: '', email: '', phone: '', active: true });
    this.drawerOpen = true;
  }

  openEdit(customer: Customer): void {
    this.editing = customer;
    this.formError = '';
    this.form.reset({
      customerCode: customer.customerCode ?? '',
      name: toUpperName(customer.name),
      country: customer.country ?? '',
      town: customer.town ?? '',
      address: customer.address ?? '',
      vatTaxId: customer.vatTaxId ?? '',
      erpId: customer.erpId ?? '',
      contactPerson: customer.contactPerson ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      active: customer.active
    });
    this.drawerOpen = true;
  }

  closeDrawer(): void {
    if (this.saving) return;
    this.drawerOpen = false;
    this.editing = null;
  }

  /** The country list plus a legacy value that is not in it, so editing never drops it. */
  get countryOptions(): readonly string[] {
    const current = this.form.controls.country.value;
    return current && !this.countries.includes(current) ? [current, ...this.countries] : this.countries;
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const request: SaveCustomerRequest = {
      customerCode: this.optional(value.customerCode)?.toUpperCase() ?? null,
      name: toUpperName(value.name),
      country: this.optional(value.country),
      town: this.optional(value.town),
      address: this.optional(value.address),
      vatTaxId: this.optional(value.vatTaxId),
      erpId: this.optional(value.erpId),
      contactPerson: this.optional(value.contactPerson),
      email: this.optional(value.email)?.toLowerCase() ?? null,
      phone: this.optional(value.phone),
      active: value.active
    };
    const editing = this.editing;
    this.saving = true;
    this.formError = '';
    (editing ? this.customerService.update(editing.id, request) : this.customerService.create(request))
      .pipe(finalize(() => this.saving = false))
      .subscribe({
        next: saved => {
          this.drawerOpen = false;
          this.editing = null;
          this.toast.show(this.i18n.t(editing ? 'orgAdmin.customers.toast.updated' : 'orgAdmin.customers.toast.created', { name: saved.name }), 'success');
          this.load();
        },
        error: error => this.formError = this.i18n.error(error, 'orgAdmin.customers.saveError')
      });
  }

  // ------------------------------------------------------------ status / delete

  toggleActive(customer: Customer): void {
    if (this.busyId !== null) return;
    this.busyId = customer.id;
    this.customerService.setActive(customer.id, !customer.active)
      .pipe(finalize(() => this.busyId = null))
      .subscribe({
        next: updated => {
          this.customers = this.customers.map(item => item.id === updated.id ? updated : item);
          if (this.deleteDialog?.customer.id === updated.id) this.deleteDialog = null;
          this.toast.show(this.i18n.t(updated.active ? 'orgAdmin.customers.toast.activated' : 'orgAdmin.customers.toast.deactivated', { name: updated.name }), 'success');
          if (this.statusControl.value) this.load();
        },
        error: error => this.toast.show(this.i18n.error(error, 'orgAdmin.customers.statusError'), 'error')
      });
  }

  requestDelete(customer: Customer): void {
    this.deleteDialog = { customer, references: customer.references };
  }

  get deleteBlocked(): boolean {
    return !!this.deleteDialog && totalReferences(this.deleteDialog.references) > 0;
  }

  confirmDelete(): void {
    const dialog = this.deleteDialog;
    if (!dialog || this.busyId !== null || this.deleteBlocked) return;
    this.busyId = dialog.customer.id;
    this.customerService.delete(dialog.customer.id)
      .pipe(finalize(() => this.busyId = null))
      .subscribe({
        next: () => {
          this.deleteDialog = null;
          this.toast.show(this.i18n.t('orgAdmin.customers.toast.deleted', { name: dialog.customer.name }), 'success');
          this.load();
        },
        error: (error: unknown) => {
          // Referenced since the list was loaded: switch the dialog to "deactivate instead".
          if (error instanceof HttpErrorResponse && error.status === 409 && error.error?.code === 'CUSTOMER_IN_USE' && error.error?.references) {
            this.deleteDialog = { customer: dialog.customer, references: error.error.references };
            return;
          }
          this.toast.show(this.i18n.error(error, 'orgAdmin.customers.deleteError'), 'error');
        }
      });
  }

  // ------------------------------------------------------------ CSV import (moved from Resource Configuration)

  importCsv(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.importing) return;
    const reader = new FileReader();
    reader.onload = () => this.processCsv(String(reader.result || ''));
    reader.onerror = () => this.toast.show(this.i18n.t('orgAdmin.resourceConfiguration.readSelectedCsvFile'), 'error');
    reader.readAsText(file);
  }

  private processCsv(text: string): void {
    const rows = this.parseCsv(text);
    if (!rows.length) {
      this.toast.show(this.i18n.t('orgAdmin.resourceConfiguration.noValidCustomerRows'), 'info');
      return;
    }
    let failures = 0;
    this.importing = true;
    // Existing customers are matched by code (full list, not just the visible page).
    this.orgAdminService.getCustomers().pipe(
      catchError(() => of([])),
      switchMap(existing => from(rows).pipe(
        concatMap(row => {
          const match = row.customerCode
            ? existing.find(item => item.customerCode.toLowerCase() === row.customerCode!.toLowerCase())
            : undefined;
          return (match ? this.customerService.update(match.id, row) : this.customerService.create(row)).pipe(
            catchError(() => { failures++; return of(null); })
          );
        }),
        toArray()
      )),
      finalize(() => this.importing = false),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const imported = rows.length - failures;
      if (imported) this.toast.show(this.i18n.t('orgAdmin.resourceConfiguration.toast.customersImported', { count: imported }), 'success');
      if (failures) this.toast.show(this.i18n.t('orgAdmin.resourceConfiguration.toast.rowsNotImported', { count: failures }), 'info');
      this.load();
    });
  }

  private parseCsv(text: string): SaveCustomerRequest[] {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];
    const headers = this.csvValues(lines[0]).map(value => value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    return lines.slice(1).map(line => {
      const values = this.csvValues(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
      return {
        customerCode: this.optional(row['customercode'] || row['customer_code'] || row['id'])?.toUpperCase() ?? null,
        name: toUpperName(row['name'] || row['customer_name']),
        country: this.optional(row['country']),
        town: this.optional(row['town'] || row['city']),
        address: this.optional(row['address']),
        vatTaxId: this.optional(row['vattaxid'] || row['vat_tax_id'] || row['vat']),
        contactPerson: this.optional(row['contactperson'] || row['contact_person'] || row['contact']),
        email: this.optional(row['email'])?.toLowerCase() ?? null,
        phone: this.optional(row['phone']),
        erpId: this.optional(row['erpid'] || row['erp_id']),
        active: true
      };
    }).filter(row => !!row.name);
  }

  private csvValues(line: string): string[] {
    return line.split(',').map(value => value.trim().replace(/^"|"$/g, ''));
  }

  private optional(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
