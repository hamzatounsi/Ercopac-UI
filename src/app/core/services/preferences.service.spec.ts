import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';
import { AuthService } from '../auth/auth.service';
import { LanguageService } from '../i18n/language.service';
import { PreferencesService } from './preferences.service';
import { ThemeService } from './theme.service';

describe('PreferencesService', () => {
  const url = `${environment.apiUrl}/users/me/preferences`;
  let service: PreferencesService;
  let http: HttpTestingController;
  let language: jasmine.SpyObj<LanguageService> & { current: string };
  let theme: jasmine.SpyObj<ThemeService> & { theme: string };
  let loggedIn: boolean;

  beforeEach(() => {
    loggedIn = true;
    language = Object.assign(jasmine.createSpyObj<LanguageService>('LanguageService', ['use']), { current: 'en' }) as any;
    language.use.and.callFake(async (code: any) => { language.current = code; });
    theme = Object.assign(jasmine.createSpyObj<ThemeService>('ThemeService', ['setTheme']), { theme: 'light' }) as any;
    theme.setTheme.and.callFake((t: any) => { theme.theme = t; });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: { isLoggedIn: () => loggedIn } },
        { provide: LanguageService, useValue: language },
        { provide: ThemeService, useValue: theme }
      ]
    });
    service = TestBed.inject(PreferencesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('applies the saved profile after login, over the local cache', () => {
    service.loadFromServer();
    http.expectOne({ method: 'GET', url }).flush({ language: 'ar', theme: 'dark', languageSaved: true, themeSaved: true });
    expect(language.use).toHaveBeenCalledWith('ar');
    expect(theme.setTheme).toHaveBeenCalledWith('dark', { animate: false });
  });

  it('stores the current local choice when the profile has none yet', () => {
    language.current = 'fr';
    service.loadFromServer();
    http.expectOne({ method: 'GET', url }).flush({ language: 'en', theme: 'light', languageSaved: false, themeSaved: false });
    const put = http.expectOne({ method: 'PUT', url });
    expect(put.request.body).toEqual({ language: 'fr', theme: 'light' });
    put.flush({});
    expect(language.use).not.toHaveBeenCalled();
  });

  it('applies a change instantly, then saves it', () => {
    service.setTheme('dim');
    expect(theme.setTheme).toHaveBeenCalledWith('dim');
    http.expectOne({ method: 'PUT', url }).flush({});
  });

  it('keeps the local change when saving fails, reports it, and retries with the next change', () => {
    const failures: boolean[] = [];
    service.saveFailed$.subscribe(v => failures.push(v));

    service.setLanguage('de');
    http.expectOne({ method: 'PUT', url }).flush({ code: 'INTERNAL_ERROR' }, { status: 500, statusText: 'Server Error' });
    expect(language.current).toBe('de');
    expect(failures[failures.length - 1]).toBeTrue();

    service.setTheme('dark');
    const retry = http.expectOne({ method: 'PUT', url });
    expect(retry.request.body).toEqual({ language: 'de', theme: 'dark' });
    retry.flush({});
    expect(failures[failures.length - 1]).toBeFalse();
  });

  it('does not call the API when signed out (login page)', () => {
    loggedIn = false;
    service.setLanguage('es');
    service.loadFromServer();
    expect(language.use).toHaveBeenCalledWith('es');
    http.expectNone(url);
  });
});
