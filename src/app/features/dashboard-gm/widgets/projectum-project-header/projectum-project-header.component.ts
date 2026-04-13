import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-projectum-project-header',
  templateUrl: './projectum-project-header.component.html',
  styleUrls: ['./projectum-project-header.component.scss']
})
export class ProjectumProjectHeaderComponent {

  // DATA
  @Input() projectId!: number;
  @Input() activeMode: 'baseline' | 'actual' = 'baseline';

  // EVENTS
  @Output() modeChange = new EventEmitter<'baseline' | 'actual'>();
  @Output() refresh = new EventEmitter<void>();
  @Output() settings = new EventEmitter<void>();

  setMode(mode: 'baseline' | 'actual'): void {
    this.modeChange.emit(mode);
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  onSettings(): void {
    this.settings.emit();
  }
}