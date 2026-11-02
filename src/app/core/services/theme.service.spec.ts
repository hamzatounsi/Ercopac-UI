import { fakeAsync, tick } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeName, ThemeService, isThemeName } from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;
  let savedAttr: string | null;
  let savedCache: string | null;

  beforeEach(() => {
    savedAttr = root.getAttribute('data-theme');
    savedCache = localStorage.getItem(THEME_STORAGE_KEY);
    root.removeAttribute('data-theme');
    localStorage.removeItem(THEME_STORAGE_KEY);
  });

  afterEach(() => {
    savedAttr === null ? root.removeAttribute('data-theme') : root.setAttribute('data-theme', savedAttr);
    savedCache === null ? localStorage.removeItem(THEME_STORAGE_KEY) : localStorage.setItem(THEME_STORAGE_KEY, savedCache);
    root.classList.remove('pm-theme-switching');
  });

  it('keeps the theme already applied by the index.html script', () => {
    root.setAttribute('data-theme', 'dim');
    expect(new ThemeService(document).theme).toBe('dim');
  });

  it('falls back to the cached theme, then to the system preference', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(new ThemeService(document).theme).toBe('dark');

    root.removeAttribute('data-theme');
    localStorage.setItem(THEME_STORAGE_KEY, 'not-a-theme');
    const service = new ThemeService(document);
    expect(service.theme).toBe(service.systemTheme());
  });

  it('applies, caches and emits a new theme with a temporary transition class', fakeAsync(() => {
    const service = new ThemeService(document);
    service.setTheme('light', { animate: false });
    const seen: ThemeName[] = [];
    service.theme$.subscribe(t => seen.push(t));

    service.setTheme('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(root.classList).toContain('pm-theme-switching');
    tick(300);
    expect(root.classList).not.toContain('pm-theme-switching');
    expect(seen).toEqual(['light', 'dark']);
  }));

  it('ignores unknown theme names', () => {
    const service = new ThemeService(document);
    service.setTheme('light', { animate: false });
    service.setTheme('neon' as ThemeName);
    expect(service.theme).toBe('light');
    expect(isThemeName('dim')).toBeTrue();
    expect(isThemeName('neon')).toBeFalse();
  });
});
