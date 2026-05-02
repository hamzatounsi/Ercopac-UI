import { Component, OnInit } from '@angular/core';
import { GmAdminService } from 'src/app/features/dashboard-gm/services/gm-admin.service';

@Component({
  selector: 'app-customers-tab',
  templateUrl: './customers-tab.component.html',
  styleUrls: ['./customers-tab.component.scss']
})
export class CustomersTabComponent implements OnInit {

  customers: any[] = [];

  search = '';
  selectedCountry = '';

  importModalOpen = false;
  csvRows: any[] = [];
  csvPreviewLimit = 8;

  modalOpen = false;
  editingId: number | null = null;

  form = {
    customerCode: '',
    name: '',
    country: '',
    town: '',
    address: '',
    vatTaxId: '',
    contactPerson: '',
    email: '',
    phone: '',
    erpId: '',
    active: true
  };

  countries = [
    'Tunisia', 'France', 'Germany', 'Italy', 'Spain', 'United Kingdom',
    'United States', 'Canada', 'Morocco', 'Algeria', 'Egypt',
    'Netherlands', 'Belgium', 'Switzerland', 'Saudi Arabia',
    'United Arab Emirates', 'Qatar', 'Turkey'
  ];

  constructor(private adminService: GmAdminService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.adminService.getCustomers().subscribe(res => {
      this.customers = res || [];
    });
  }

  get filteredCustomers(): any[] {
    const q = this.search.trim().toLowerCase();

    return this.customers.filter(c => {
      const matchesCountry = !this.selectedCountry || c.country === this.selectedCountry;

      const matchesSearch =
        !q ||
        (c.customerCode || '').toLowerCase().includes(q) ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.country || '').toLowerCase().includes(q) ||
        (c.town || '').toLowerCase().includes(q) ||
        (c.contactPerson || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.erpId || '').toLowerCase().includes(q);

      return matchesCountry && matchesSearch;
    });
  }

  get availableCountries(): string[] {
    const values = this.customers
      .map(c => c.country)
      .filter(v => !!v);

    return Array.from(new Set(values)).sort();
  }

  openCreate(): void {
    this.editingId = null;
    this.form = {
      customerCode: '',
      name: '',
      country: '',
      town: '',
      address: '',
      vatTaxId: '',
      contactPerson: '',
      email: '',
      phone: '',
      erpId: '',
      active: true
    };
    this.modalOpen = true;
  }

  openEdit(customer: any): void {
    this.editingId = customer.id;
    this.form = {
      customerCode: customer.customerCode || '',
      name: customer.name || '',
      country: customer.country || '',
      town: customer.town || '',
      address: customer.address || '',
      vatTaxId: customer.vatTaxId || '',
      contactPerson: customer.contactPerson || '',
      email: customer.email || '',
      phone: customer.phone || '',
      erpId: customer.erpId || '',
      active: customer.active !== false
    };
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
  }

  save(): void {
    if (!this.form.customerCode.trim() || !this.form.name.trim()) {
      alert('Customer ID and name are required');
      return;
    }

    const payload = {
      ...this.form,
      customerCode: this.form.customerCode.trim().toUpperCase()
    };

    if (this.editingId) {
      this.adminService.updateCustomer(this.editingId, payload).subscribe(() => {
        this.closeModal();
        this.load();
      });
    } else {
      this.adminService.createCustomer(payload).subscribe(() => {
        this.closeModal();
        this.load();
      });
    }
  }

  delete(customer: any): void {
    if (!confirm(`Delete customer "${customer.name}"?`)) {
      return;
    }

    this.adminService.deleteCustomer(customer.id).subscribe(() => {
      this.load();
    });
  }

  openImportModal(): void {
    this.csvRows = [];
    this.importModalOpen = true;
  }

  closeImportModal(): void {
    this.importModalOpen = false;
    this.csvRows = [];
  }

  handleCsvFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.parseCsv(file);
    input.value = '';
  }

  handleCsvDrop(event: DragEvent): void {
    event.preventDefault();

    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }

    this.parseCsv(file);
  }

  parseCsv(file: File): void {
    const reader = new FileReader();

    reader.onload = () => {
      const text = String(reader.result || '');
      const lines = text.split(/\r?\n/).filter(line => line.trim());

      if (lines.length < 2) {
        alert('CSV file is empty or missing data rows');
        return;
      }

      const headers = lines[0]
        .split(',')
        .map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));

      this.csvRows = lines.slice(1)
        .map(line => this.mapCsvLine(headers, line))
        .filter(row => row.customerCode && row.name);
    };

    reader.readAsText(file);
  }

  mapCsvLine(headers: string[], line: string): any {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj: any = {};

    headers.forEach((h, i) => {
      obj[h] = values[i] || '';
    });

    return {
      customerCode: obj.id || obj.customer_id || obj.customercode || obj.customer_code || '',
      name: obj.name || obj.customer_name || '',
      country: obj.country || '',
      town: obj.town || obj.city || '',
      address: obj.address || '',
      vatTaxId: obj.vat || obj.tax_id || obj.vat_tax_id || '',
      contactPerson: obj.contact || obj.contact_person || '',
      email: obj.email || '',
      phone: obj.phone || '',
      erpId: obj.erp_id || obj.erpid || '',
      active: true
    };
  }

  confirmCsvImport(): void {
    if (!this.csvRows.length) {
      return;
    }

    let completed = 0;

    this.csvRows.forEach(row => {
      const existing = this.customers.find(c =>
        c.customerCode?.toLowerCase() === row.customerCode.toLowerCase()
      );

      const request$ = existing
        ? this.adminService.updateCustomer(existing.id, row)
        : this.adminService.createCustomer(row);

      request$.subscribe({
        next: () => {
          completed++;

          if (completed === this.csvRows.length) {
            this.closeImportModal();
            this.load();
          }
        },
        error: () => {
          completed++;

          if (completed === this.csvRows.length) {
            this.closeImportModal();
            this.load();
          }
        }
      });
    });
  }
}