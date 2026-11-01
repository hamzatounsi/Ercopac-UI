import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface PickOption { id: number; label: string; hint?: string; }

// "Select an existing Projectum record OR enter it manually" (ticket Customer and Project fields).
// The parent keeps the values: selectedId for a linked record, manual for the mode; the manual fields
// are projected as content and only shown in manual mode. Long lists get a search box.
@Component({
  selector: 'app-select-or-manual',
  templateUrl: './select-or-manual.component.html',
  styleUrls: ['./select-or-manual.component.scss']
})
export class SelectOrManualComponent {
  @Input() label = '';
  @Input() options: PickOption[] = [];
  @Input() selectedId: number | null = null;
  /** Shown when the selected record is not in the list any more (e.g. archived or from another customer). */
  @Input() selectedLabel?: string;
  @Input() manual = false;
  @Input() allowManual = true;
  @Input() loading = false;
  @Input() error = '';
  @Input() disabled = false;
  @Input() noneLabel = 'None';
  @Input() emptyText = 'Nothing to choose from';
  @Input() manualLabel = 'Enter manually';
  @Input() linkedLabel = 'Choose from Projectum';
  @Input() searchThreshold = 8;
  @Input() compact = false;
  @Output() selectedIdChange = new EventEmitter<number | null>();
  @Output() manualChange = new EventEmitter<boolean>();
  @Output() retry = new EventEmitter<void>();

  query = '';

  get searchable(): boolean { return this.options.length > this.searchThreshold; }

  get filtered(): PickOption[] {
    const q = this.query.trim().toLowerCase();
    return q ? this.options.filter(o => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)) : this.options;
  }

  /** The current choice stays visible even when the search hides it or the list no longer contains it. */
  get pinned(): PickOption | null {
    if (this.selectedId == null || this.filtered.some(o => o.id === this.selectedId)) return null;
    const known = this.options.find(o => o.id === this.selectedId);
    return known ?? { id: this.selectedId, label: this.selectedLabel || 'Current selection' };
  }

  get placeholder(): string {
    if (this.loading) return 'Loading…';
    if (this.error) return 'List unavailable';
    return this.options.length ? this.noneLabel : this.emptyText;
  }

  select(id: number | null): void { this.selectedIdChange.emit(id); }

  toggle(): void {
    this.query = '';
    this.manualChange.emit(!this.manual);
  }
}
