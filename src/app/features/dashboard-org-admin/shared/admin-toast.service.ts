import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AdminToastType = 'success' | 'error' | 'info';

export interface AdminToast {
  type: AdminToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AdminToastService {
  private readonly toastSubject = new BehaviorSubject<AdminToast | null>(null);
  readonly toast$ = this.toastSubject.asObservable();
  private dismissTimer?: ReturnType<typeof setTimeout>;

  show(message: string, type: AdminToastType = 'success'): void {
    if (this.dismissTimer) clearTimeout(this.dismissTimer);
    this.toastSubject.next({ message, type });
    this.dismissTimer = setTimeout(() => this.dismiss(), 4500);
  }

  dismiss(): void {
    if (this.dismissTimer) clearTimeout(this.dismissTimer);
    this.dismissTimer = undefined;
    this.toastSubject.next(null);
  }
}
