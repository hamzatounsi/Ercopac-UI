import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { apiErrorKey } from './api-error';

/** Translation helpers for component code (toasts, validation messages, API errors). */
@Injectable({ providedIn: 'root' })
export class I18nService {
  constructor(private translate: TranslateService) {}

  t(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  /**
   * Message for a failed API call. In English the specific backend message is kept (as before);
   * other languages get the translated contextual message, completed by the translated reason for generic failures
   * (network, permission, conflict, server error). Backend business messages are English-only, so they are not shown there.
   */
  error(error: unknown, fallbackKey: string, params?: Record<string, unknown>): string {
    const fallback = this.t(fallbackKey, params);
    if (!(error instanceof HttpErrorResponse)) return fallback;
    const backend = typeof error.error?.message === 'string' ? error.error.message.trim() : '';
    const lang = this.translate.currentLang || 'en';
    if (backend && lang === 'en') return backend;
    if (error.status === 400 || error.status === 422) return fallback;
    // Chinese sentences are not separated by spaces
    return [fallback, this.t(apiErrorKey(error))].join(lang === 'zh' ? '' : ' ');
  }
}
