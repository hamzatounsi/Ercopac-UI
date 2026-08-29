import { Pipe, PipeTransform } from '@angular/core';

/** CRM presentation dates only. API payloads remain ISO dates. */
@Pipe({ name: 'crmDate' })
export class CrmDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) return '—';
    const date = value instanceof Date ? value : this.parse(value);
    if (Number.isNaN(date.getTime())) return '—';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  private parse(value: string): Date {
    // Date-only values must be interpreted locally, otherwise UTC conversion
    // can display the previous day for users west of UTC.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(value);
  }
}
