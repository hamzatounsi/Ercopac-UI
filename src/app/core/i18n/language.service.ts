import { Inject, Injectable } from '@angular/core';
import { DOCUMENT, registerLocaleData } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, LANGUAGES, LanguageCode, LanguageOption, isLanguageCode, languageOption } from './languages';

/** Angular locale data per language, loaded on demand so only the active language is downloaded. */
const LOCALE_LOADERS: Record<Exclude<LanguageCode, 'en'>, () => Promise<{ default: unknown }>> = {
  fr: () => import('@angular/common/locales/fr'),
  de: () => import('@angular/common/locales/de'),
  ar: () => import('@angular/common/locales/ar'),
  it: () => import('@angular/common/locales/it'),
  es: () => import('@angular/common/locales/es'),
  pt: () => import('@angular/common/locales/pt'),
  tr: () => import('@angular/common/locales/tr'),
  nl: () => import('@angular/common/locales/nl'),
  zh: () => import('@angular/common/locales/zh')
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly languages = LANGUAGES;
  private readonly languageSubject = new BehaviorSubject<LanguageOption>(languageOption(DEFAULT_LANGUAGE));
  /** Emits after the translations and locale data of the new language are loaded. */
  readonly language$ = this.languageSubject.asObservable();
  private readonly registeredLocales = new Set<string>(['en']);

  constructor(private translate: TranslateService, @Inject(DOCUMENT) private document: Document) {
    translate.setDefaultLang(DEFAULT_LANGUAGE);
  }

  get current(): LanguageCode {
    return this.languageSubject.value.code;
  }

  /** Angular locale id for formatDate / formatNumber / formatCurrency. */
  get locale(): string {
    return this.languageSubject.value.locale;
  }

  /** Language to show before the user's saved preference is known: local cache, then browser, then English. */
  initialLanguage(): LanguageCode {
    const cached = this.readCache();
    if (isLanguageCode(cached)) return cached;
    const browser = this.document.defaultView?.navigator?.languages ?? [];
    for (const tag of browser) {
      const code = tag.toLowerCase().split('-')[0];
      if (isLanguageCode(code)) return code;
    }
    return DEFAULT_LANGUAGE;
  }

  /** Switches the UI language at runtime: translations, locale data, <html lang/dir> and local cache. */
  async use(code: LanguageCode): Promise<void> {
    if (!isLanguageCode(code)) return;
    const option = languageOption(code);
    this.applyDocument(option);
    this.writeCache(code);
    await Promise.all([this.loadLocale(option.locale, code), firstValueFrom(this.translate.use(code)).catch(() => undefined)]);
    // A quicker later call may have won the race; only announce the language that is still active.
    if (this.translate.currentLang === code) this.languageSubject.next(option);
  }

  private applyDocument(option: LanguageOption): void {
    const root = this.document.documentElement;
    root.setAttribute('lang', option.code === 'zh' ? 'zh-Hans' : option.code);
    root.setAttribute('dir', option.dir);
  }

  private async loadLocale(locale: string, code: LanguageCode): Promise<void> {
    if (this.registeredLocales.has(locale) || code === 'en') return;
    try {
      const data = await LOCALE_LOADERS[code]();
      registerLocaleData(data.default, locale);
      this.registeredLocales.add(locale);
    } catch {
      // keep English formatting if the locale chunk cannot be loaded
    }
  }

  private readCache(): string | null {
    try {
      return this.document.defaultView?.localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private writeCache(code: LanguageCode): void {
    try {
      this.document.defaultView?.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      // storage unavailable: the language still applies for this session
    }
  }
}
