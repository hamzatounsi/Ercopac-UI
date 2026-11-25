import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { StatusRef, TicketStatusDef } from '../../models/ticket.models';
import { TicketStatusService, hexStatusStyle, isPaletteColor } from '../../services/ticket-status.service';

/**
 * Coloured badge of a ticket status. Give it the ticket's statusRef, a status definition, or a status code
 * (resolved through TicketStatusService). Palette colours use the c-* classes; #RRGGBB colours an inline tint.
 */
@Component({
  selector: 'app-ticket-status-badge',
  template: `<span class="badge" [ngClass]="cls" [ngStyle]="style" [title]="title">{{ name || ('ticketing.statusesAdmin.noStatus' | translate) }}</span>`,
  styleUrls: ['./ticket-status-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class TicketStatusBadgeComponent {
  @Input() status?: Pick<TicketStatusDef, 'name' | 'color'> & { description?: string | null } | StatusRef | null;
  @Input() code?: string | null;

  constructor(private statuses: TicketStatusService) {}

  private get resolved(): { name: string; color: string; description?: string | null } | null {
    if (this.status) return this.status;
    const s = this.statuses.byCode(this.code);
    return s ?? (this.code ? { name: this.statuses.label(this.code), color: 'gray' } : null);
  }
  get name(): string { return this.resolved?.name ?? ''; }
  get cls(): string { const c = this.resolved?.color; return isPaletteColor(c) ? 'c-' + c : this.resolved ? '' : 'c-gray'; }
  get style(): Record<string, string> | null { return hexStatusStyle(this.resolved?.color); }
  get title(): string { return this.resolved?.description ?? ''; }
}
