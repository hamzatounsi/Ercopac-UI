import { TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { LanguageService } from './language.service';
import { LANGUAGE_STORAGE_KEY } from './languages';

class FakeLoader implements TranslateLoader {
  getTranslation(lang: string) {
    return of({ profileMenu: { language: `language-${lang}` } });
  }
}

describe('LanguageService', () => {
  const root = document.documentElement;
  let service: LanguageService;
  let saved: { lang: string | null; dir: string | null; cache: string | null };

  beforeEach(() => {
    saved = { lang: root.getAttribute('lang'), dir: root.getAttribute('dir'), cache: localStorage.getItem(LANGUAGE_STORAGE_KEY) };
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeLoader } })]
    });
    service = TestBed.inject(LanguageService);
  });

  afterEach(() => {
    saved.lang === null ? root.removeAttribute('lang') : root.setAttribute('lang', saved.lang);
    saved.dir === null ? root.removeAttribute('dir') : root.setAttribute('dir', saved.dir);
    saved.cache === null ? localStorage.removeItem(LANGUAGE_STORAGE_KEY) : localStorage.setItem(LANGUAGE_STORAGE_KEY, saved.cache);
  });

  it('offers the ten supported languages by native name', () => {
    expect(service.languages.map(l => l.nativeName)).toEqual(
      ['English', 'Français', 'Deutsch', 'العربية', 'Italiano', 'Español', 'Português', 'Türkçe', 'Nederlands', '简体中文']);
  });

  it('prefers the cached language for the first paint', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'de');
    expect(service.initialLanguage()).toBe('de');
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'xx');
    expect(['en', 'fr', 'de', 'ar', 'it', 'es', 'pt', 'tr', 'nl', 'zh']).toContain(service.initialLanguage());
  });

  it('switches at runtime, caches the choice and sets lang/dir (RTL for Arabic)', async () => {
    await service.use('ar');
    expect(service.current).toBe('ar');
    expect(root.getAttribute('dir')).toBe('rtl');
    expect(root.getAttribute('lang')).toBe('ar');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ar');

    await service.use('fr');
    expect(root.getAttribute('dir')).toBe('ltr');
    expect(service.locale).toBe('fr');

    await service.use('zh');
    expect(root.getAttribute('lang')).toBe('zh-Hans');
  });

  it('ignores unsupported codes', async () => {
    await service.use('fr');
    await service.use('xx' as any);
    expect(service.current).toBe('fr');
  });
});
