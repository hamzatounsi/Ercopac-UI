import { Injectable } from '@angular/core';
import { LanguageService } from '../i18n/language.service';
import { LanguageCode } from '../i18n/languages';
import { ThemeName, ThemeService } from './theme.service';

/** Applies the user's language and theme. Changes take effect immediately and are cached locally. */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  constructor(private language: LanguageService, private theme: ThemeService) {}

  setLanguage(code: LanguageCode): void {
    void this.language.use(code);
  }

  setTheme(theme: ThemeName): void {
    this.theme.setTheme(theme);
  }
}
