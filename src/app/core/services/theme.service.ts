import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type ThemeName = 'light' | 'dim' | 'dark';

export const THEMES: readonly ThemeName[] = ['light', 'dim', 'dark'];
/** Same key as the inline script in index.html, which applies the theme before Angular starts. */
export const THEME_STORAGE_KEY = 'pm.theme';

const SWITCH_CLASS = 'pm-theme-switching';
const SWITCH_DURATION_MS = 300;

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeSubject: BehaviorSubject<ThemeName>;
  private switchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly theme$;

  constructor(@Inject(DOCUMENT) private document: Document) {
    const root = this.document.documentElement;
    const initial = [root.getAttribute('data-theme'), this.readCache()].find(isThemeName) ?? this.systemTheme();
    this.themeSubject = new BehaviorSubject<ThemeName>(initial);
    this.theme$ = this.themeSubject.asObservable();
    root.setAttribute('data-theme', initial);
  }

  get theme(): ThemeName {
    return this.themeSubject.value;
  }

  /** Applies the theme immediately and caches it locally. Persisting to the user profile is PreferencesService's job. */
  setTheme(theme: ThemeName, options: { animate?: boolean } = {}): void {
    if (!isThemeName(theme)) return;
    const root = this.document.documentElement;
    if (options.animate !== false && theme !== this.theme) {
      root.classList.add(SWITCH_CLASS);
      if (this.switchTimer) clearTimeout(this.switchTimer);
      this.switchTimer = setTimeout(() => {
        root.classList.remove(SWITCH_CLASS);
        this.switchTimer = null;
      }, SWITCH_DURATION_MS);
    }
    root.setAttribute('data-theme', theme);
    this.writeCache(theme);
    if (theme !== this.theme) this.themeSubject.next(theme);
  }

  systemTheme(): ThemeName {
    const view = this.document.defaultView;
    return view?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private readCache(): string | null {
    try {
      return this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private writeCache(theme: ThemeName): void {
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // storage unavailable (private mode): the theme still applies for this session
    }
  }
}
