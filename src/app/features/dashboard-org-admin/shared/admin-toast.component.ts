import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AdminToastService } from './admin-toast.service';

@Component({
  selector: 'app-admin-toast',
  template: `
    <div
      *ngIf="toastService.toast$ | async as toast"
      class="oa-toast"
      [class]="'oa-toast ' + toast.type"
      role="status"
      aria-live="polite">
      <span class="material-symbols-outlined" aria-hidden="true">
        {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info' }}
      </span>
      <span>{{ toast.message }}</span>
      <button type="button" (click)="toastService.dismiss()" aria-label="Dismiss notification">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </div>
  `,
  styles: [`
    .oa-toast { position: fixed; top: 76px; right: 22px; z-index: 1200; width: min(420px, calc(100vw - 32px)); display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center; padding: 13px 14px; border: 1px solid var(--pm-border); border-radius: var(--pm-radius-lg); background: var(--pm-surface); box-shadow: var(--pm-shadow); color: var(--pm-text); font-weight: 700; }
    .oa-toast.success { border-color: color-mix(in srgb, var(--pm-success) 28%, transparent); background: var(--pm-success-soft); color: var(--pm-success); }
    .oa-toast.error { border-color: color-mix(in srgb, var(--pm-danger) 28%, transparent); background: var(--pm-danger-soft); color: var(--pm-danger); }
    .oa-toast.info { border-color: color-mix(in srgb, var(--pm-primary) 24%, transparent); background: var(--pm-info-soft); color: var(--pm-info); }
    button { display: grid; place-items: center; width: 30px; height: 30px; border: 0; border-radius: 7px; background: transparent; color: inherit; cursor: pointer; }
    button:hover { background: color-mix(in srgb, var(--pm-surface) 65%, transparent); }
    .material-symbols-outlined { font-size: 20px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminToastComponent {
  constructor(readonly toastService: AdminToastService) {}
}
