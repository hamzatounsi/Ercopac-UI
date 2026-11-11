import { Component, EventEmitter, Output } from '@angular/core';
import * as XLSX from 'xlsx';
import { I18nService } from 'src/app/core/i18n/i18n.service';
import { assertSpreadsheetFile, assertSpreadsheetRowLimit, assertValidWorkbook } from 'src/app/core/utils/spreadsheet-import.utils';
import { ImportResult, ImportRow } from '../../models/ticket.models';
import { TicketSettingsService } from '../../services/ticket-settings.service';

// Header synonyms (normalised: lower case, letters and digits only) -> import field
const COLUMNS: Record<keyof ImportRow, string[]> = {
  customerCode: ['customercode', 'code', 'clientcode', 'codicecliente', 'codeclient'],
  customerName: ['customername', 'customer', 'name', 'client', 'cliente', 'ragionesociale', 'company', 'nomclient'],
  country: ['country', 'paese', 'nazione', 'pays'],
  town: ['town', 'city', 'citta', 'ville'],
  email: ['email', 'mail'],
  phone: ['phone', 'telephone', 'telefono', 'tel'],
  orderNumber: ['ordernumber', 'order', 'ncommessa', 'commessa', 'numerocommessa', 'projectnumber', 'ordine', 'numcommande'],
  orderName: ['ordername', 'projectname', 'project', 'descrizione', 'description', 'progetto'],
  year: ['year', 'anno', 'annee', 'orderyear']
};

// Import of historical customers and orders (2023-2026) from CSV / Excel. The file is parsed in the browser,
// previewed with a dry run (counts and duplicates from the backend), then imported. Support leads only.
@Component({
  selector: 'app-customer-import',
  templateUrl: './customer-import.component.html',
  styleUrls: ['./customer-import.component.scss']
})
export class CustomerImportComponent {
  @Output() imported = new EventEmitter<void>();
  open = false;
  rows: ImportRow[] = [];
  fileName = '';
  preview?: ImportResult;
  result?: ImportResult;
  busy = false;
  error = '';

  constructor(private settings: TicketSettingsService, private i18n: I18nService) {}

  toggle(): void { this.open = !this.open; this.reset(); }
  reset(): void { this.rows = []; this.fileName = ''; this.preview = undefined; this.result = undefined; this.error = ''; }

  async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.reset();
    try {
      assertSpreadsheetFile(file, ['.csv', '.xlsx', '.xls']);
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[assertValidWorkbook(workbook)];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
      assertSpreadsheetRowLimit(raw);
      this.rows = raw.map(r => this.mapRow(r)).filter(r => r.customerName || r.customerCode || r.orderNumber || r.orderName);
      this.fileName = file.name;
      if (!this.rows.length) { this.error = this.i18n.t('ticketing.import.noRows'); return; }
      this.run(true);
    } catch (e) {
      this.error = (e as Error)?.message || this.i18n.t('ticketing.import.invalidFile');
    }
  }

  run(dryRun: boolean): void {
    if (!this.rows.length || this.busy) return;
    this.busy = true;
    this.error = '';
    this.settings.importCustomers(this.rows, dryRun).subscribe({
      next: r => {
        this.busy = false;
        if (dryRun) this.preview = r;
        else { this.result = r; this.preview = undefined; this.rows = []; this.imported.emit(); }
      },
      error: e => { this.busy = false; this.error = this.i18n.error(e, 'ticketing.import.failed'); }
    });
  }

  private mapRow(source: Record<string, unknown>): ImportRow {
    const byKey = new Map(Object.entries(source).map(([k, v]) => [k.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, ''), String(v ?? '').trim()]));
    const pick = (field: keyof ImportRow) => COLUMNS[field].map(k => byKey.get(k)).find(v => !!v) || null;
    const year = pick('year');
    return {
      customerCode: pick('customerCode'), customerName: pick('customerName'), country: pick('country'), town: pick('town'),
      email: pick('email'), phone: pick('phone'), orderNumber: pick('orderNumber'), orderName: pick('orderName'),
      year: year && /^\d{4}$/.test(year) ? Number(year) : null
    };
  }
}
