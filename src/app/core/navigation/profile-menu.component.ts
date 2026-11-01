import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { NgFor, NgIf, UpperCasePipe } from '@angular/common';
import { NavigationStart, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { LanguageService } from '../i18n/language.service';
import { LanguageCode } from '../i18n/languages';
import { ThemeName, ThemeService, THEMES } from '../services/theme.service';
import { PreferencesService } from '../services/preferences.service';

let nextMenuId = 0;

/**
 * Account menu shown at the top right of every application: identity, language, theme and sign out.
 * Keyboard: Enter/Space/ArrowDown open it, arrows/Home/End move between items, Esc closes it and Tab leaves it.
 */
@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [NgIf, NgFor, UpperCasePipe, TranslateModule],
  templateUrl: './profile-menu.component.html',
  styleUrls: ['./profile-menu.component.scss']
})
export class ProfileMenuComponent implements OnInit, OnDestroy {
  /** Route opened after sign out. */
  @Input() logoutRoute = '/login';
  /** Opens the panel above the trigger (for a menu placed at the bottom of a sidebar). */
  @Input() placement: 'bottom' | 'top' = 'bottom';
  /** Light text for dark sidebars and headers. */
  @Input() tone: 'default' | 'inverse' = 'default';

  @ViewChild('trigger', { static: true }) trigger!: ElementRef<HTMLButtonElement>;
  @ViewChildren('item') items!: QueryList<ElementRef<HTMLElement>>;

  readonly menuId = `pm-profile-menu-${++nextMenuId}`;
  readonly themes = THEMES;
  open = false;
  private routerSub?: Subscription;

  constructor(
    private host: ElementRef<HTMLElement>,
    private router: Router,
    private auth: AuthService,
    readonly language: LanguageService,
    readonly theme: ThemeService,
    private preferences: PreferencesService
  ) {}

  get name(): string { return this.auth.getCurrentUsername(); }
  get email(): string { return this.auth.getCurrentEmail(); }
  get roles(): string[] { return this.auth.getRoles(); }
  get primaryRole(): string { return this.roles[0] || ''; }
  get initials(): string {
    const words = (this.name || '').replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
    return (words.slice(0, 2).map(w => w[0]).join('') || '?').toUpperCase();
  }

  ngOnInit(): void {
    this.routerSub = this.router.events.pipe(filter(e => e instanceof NavigationStart)).subscribe(() => this.close(false));
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  toggle(): void {
    this.open ? this.close() : this.show();
  }

  show(focus: 'first' | 'last' = 'first'): void {
    this.open = true;
    // the panel is rendered on the next change detection
    setTimeout(() => {
      const list = this.items.toArray();
      if (!list.length) return;
      (focus === 'last' ? list[list.length - 1] : list[0]).nativeElement.focus();
    });
  }

  close(returnFocus = true): void {
    if (!this.open) return;
    this.open = false;
    if (returnFocus) this.trigger.nativeElement.focus();
  }

  setLanguage(code: LanguageCode): void {
    this.preferences.setLanguage(code);
  }

  setTheme(theme: ThemeName): void {
    this.preferences.setTheme(theme);
  }

  logout(): void {
    this.open = false;
    this.auth.logout();
    void this.router.navigate([this.logoutRoute]);
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.show(event.key === 'ArrowUp' ? 'last' : 'first');
    }
  }

  onMenuKeydown(event: KeyboardEvent): void {
    const list = this.items.toArray().map(i => i.nativeElement);
    const index = list.indexOf(event.target as HTMLElement);
    const move = (to: number) => { event.preventDefault(); list[(to + list.length) % list.length]?.focus(); };
    switch (event.key) {
      case 'ArrowDown': move(index + 1); break;
      case 'ArrowUp': move(index - 1); break;
      case 'Home': move(0); break;
      case 'End': move(list.length - 1); break;
      case 'Escape': event.preventDefault(); this.close(); break;
      case 'Tab': this.close(false); break;
    }
  }

  @HostListener('document:mousedown', ['$event'])
  @HostListener('document:touchstart', ['$event'])
  onDocumentPointer(event: Event): void {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) this.close(false);
  }
}
