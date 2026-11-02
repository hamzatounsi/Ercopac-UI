import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../auth/auth.service';
import { LanguageService } from '../i18n/language.service';
import { LanguageCode, isLanguageCode } from '../i18n/languages';
import { ThemeName, ThemeService, isThemeName } from './theme.service';

export interface UserPreferences {
  language: LanguageCode;
  theme: ThemeName;
  languageSaved: boolean;
  themeSaved: boolean;
}

type PreferenceChange = Partial<Pick<UserPreferences, 'language' | 'theme'>>;

/**
 * The user's language and theme. A change applies immediately, is cached locally (first paint, login page),
 * then saved to the profile. A failed save keeps the local change, raises saveFailed$, and is retried
 * together with the next change.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly url = `${environment.apiUrl}/users/me/preferences`;
  private pending: PreferenceChange = {};
  private saving = false;
  private readonly saveFailedSubject = new BehaviorSubject<boolean>(false);
  readonly saveFailed$ = this.saveFailedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private language: LanguageService,
    private theme: ThemeService
  ) {}

  /** Called on app start (when signed in) and after login: the saved profile wins over the local cache. */
  loadFromServer(): void {
    if (!this.auth.isLoggedIn()) return;
    this.http.get<UserPreferences>(this.url).subscribe({
      next: prefs => {
        if (prefs.languageSaved && isLanguageCode(prefs.language)) void this.language.use(prefs.language);
        else this.pending.language = this.language.current;
        if (prefs.themeSaved && isThemeName(prefs.theme)) this.theme.setTheme(prefs.theme, { animate: false });
        else this.pending.theme = this.theme.theme;
        // nothing chosen yet on the server: keep what the user sees now (cached or browser/system choice)
        this.flush();
      },
      error: () => { /* keep the local choice; the next change retries */ }
    });
  }

  setLanguage(code: LanguageCode): void {
    void this.language.use(code);
    this.queue({ language: code });
  }

  setTheme(theme: ThemeName): void {
    this.theme.setTheme(theme);
    this.queue({ theme });
  }

  dismissSaveError(): void {
    this.saveFailedSubject.next(false);
  }

  private queue(change: PreferenceChange): void {
    this.pending = { ...this.pending, ...change };
    this.flush();
  }

  private flush(): void {
    if (this.saving || !this.auth.isLoggedIn() || (!this.pending.language && !this.pending.theme)) return;
    const body = this.pending;
    this.pending = {};
    this.saving = true;
    this.http.put<UserPreferences>(this.url, body).subscribe({
      next: () => {
        this.saving = false;
        this.saveFailedSubject.next(false);
        this.flush();
      },
      error: () => {
        this.saving = false;
        // newer changes made while saving take precedence over the failed ones
        this.pending = { ...body, ...this.pending };
        this.saveFailedSubject.next(true);
      }
    });
  }
}
