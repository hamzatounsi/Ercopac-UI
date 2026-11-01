export type LanguageCode = 'en' | 'fr' | 'de' | 'ar' | 'it' | 'es' | 'pt' | 'tr' | 'nl' | 'zh';

export interface LanguageOption {
  code: LanguageCode;
  /** Name of the language in that language, as shown in the selector. */
  nativeName: string;
  dir: 'ltr' | 'rtl';
  /** Angular locale used for dates, numbers and currencies. */
  locale: string;
}

export const DEFAULT_LANGUAGE: LanguageCode = 'en';
/** Same key as the inline script in index.html. */
export const LANGUAGE_STORAGE_KEY = 'pm.lang';

export const LANGUAGES: readonly LanguageOption[] = [
  { code: 'en', nativeName: 'English', dir: 'ltr', locale: 'en' },
  { code: 'fr', nativeName: 'Français', dir: 'ltr', locale: 'fr' },
  { code: 'de', nativeName: 'Deutsch', dir: 'ltr', locale: 'de' },
  { code: 'ar', nativeName: 'العربية', dir: 'rtl', locale: 'ar' },
  { code: 'it', nativeName: 'Italiano', dir: 'ltr', locale: 'it' },
  { code: 'es', nativeName: 'Español', dir: 'ltr', locale: 'es' },
  { code: 'pt', nativeName: 'Português', dir: 'ltr', locale: 'pt' },
  { code: 'tr', nativeName: 'Türkçe', dir: 'ltr', locale: 'tr' },
  { code: 'nl', nativeName: 'Nederlands', dir: 'ltr', locale: 'nl' },
  { code: 'zh', nativeName: '简体中文', dir: 'ltr', locale: 'zh' }
];

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && LANGUAGES.some(l => l.code === value);
}

export function languageOption(code: LanguageCode): LanguageOption {
  return LANGUAGES.find(l => l.code === code) ?? LANGUAGES[0];
}
