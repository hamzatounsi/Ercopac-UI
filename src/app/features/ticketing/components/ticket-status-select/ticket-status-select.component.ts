import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TicketStatusDef } from '../../models/ticket.models';
import { TicketStatusService } from '../../services/ticket-status.service';

/**
 * Dropdown of the active ticket statuses (Ticketing settings > Statuses). value is a status code;
 * allLabel adds an empty "all statuses" choice (filters); placeholder an empty first choice (forms).
 * exclude hides one code (e.g. the ticket's current status).
 */
@Component({
  selector: 'app-ticket-status-select',
  template: `
    <select class="select" [ngClass]="selectClass" [ngModel]="value ?? ''" (ngModelChange)="pick($event)" [disabled]="disabled || (!options.length && !allLabel)"
            [attr.aria-label]="'common.status' | translate">
      <option *ngIf="allLabel" value="">{{ allLabel | translate }}</option>
      <option *ngIf="placeholder && !allLabel" value="" disabled>{{ placeholder | translate }}</option>
      <option *ngFor="let s of options; trackBy: byId" [value]="s.code">{{ s.name }}{{ s.isClosed ? ' ✓' : '' }}</option>
    </select>`,
  styleUrls: ['../../ticketing.shared.scss'],
  styles: [':host{display:inline-block} .select.narrow{width:auto;min-width:150px}']
})
export class TicketStatusSelectComponent {
  @Input() value: string | null = null;
  @Output() valueChange = new EventEmitter<string | null>();
  @Input() allLabel = '';
  @Input() placeholder = '';
  @Input() exclude: string | null = null;
  @Input() disabled = false;
  @Input() selectClass = '';

  private cache: { key: unknown; exclude: string | null; list: TicketStatusDef[] } = { key: undefined, exclude: null, list: [] };

  constructor(private statuses: TicketStatusService) { statuses.load(); }

  get options(): TicketStatusDef[] {
    const active = this.statuses.active;
    if (this.cache.key !== active || this.cache.exclude !== this.exclude) this.cache = { key: active, exclude: this.exclude, list: active.filter(s => s.code !== this.exclude) };
    return this.cache.list;
  }
  pick(code: string): void { this.value = code || null; this.valueChange.emit(this.value); }
  byId(_: number, s: TicketStatusDef): number { return s.id; }
}
