import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, NavigationStart } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { PreferencesService } from '../services/preferences.service';
import { ProfileMenuComponent } from './profile-menu.component';

describe('ProfileMenuComponent', () => {
  let fixture: ComponentFixture<ProfileMenuComponent>;
  let element: HTMLElement;
  let auth: jasmine.SpyObj<AuthService>;
  let preferences: jasmine.SpyObj<PreferencesService>;
  let routerEvents: Subject<unknown>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUsername', 'getCurrentEmail', 'getRoles', 'logout']);
    auth.getCurrentUsername.and.returnValue('Sara Ben Ali');
    auth.getCurrentEmail.and.returnValue('sara@example.com');
    auth.getRoles.and.returnValue(['H24_LEAD', 'EMPLOYEE']);
    preferences = jasmine.createSpyObj<PreferencesService>('PreferencesService', ['setLanguage', 'setTheme']);

    TestBed.configureTestingModule({
      imports: [ProfileMenuComponent, RouterTestingModule, TranslateModule.forRoot()],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: PreferencesService, useValue: preferences }
      ]
    });
    router = TestBed.inject(Router);
    routerEvents = new Subject();
    spyOnProperty(router, 'events').and.returnValue(routerEvents.asObservable() as any);
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(ProfileMenuComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  const trigger = () => element.querySelector<HTMLButtonElement>('.pm-trigger')!;
  const panel = () => element.querySelector<HTMLElement>('[role="menu"]');
  const items = () => Array.from(element.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
  const key = (target: HTMLElement, k: string) => target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

  it('shows initials and exposes the closed state to assistive technology', () => {
    expect(element.querySelector('.pm-avatar')!.textContent!.trim()).toBe('SB');
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(panel()).toBeNull();
  });

  it('opens with the keyboard, lists 10 languages and 3 themes, and moves focus with the arrows', fakeAsync(() => {
    key(trigger(), 'ArrowDown');
    fixture.detectChanges();
    tick();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelectorAll('.pm-option').length).toBe(10);
    expect(element.querySelectorAll('.pm-theme').length).toBe(3);
    expect(element.querySelector('.pm-email')!.textContent).toContain('sara@example.com');
    expect(document.activeElement).toBe(items()[0]);

    key(items()[0], 'ArrowUp');
    expect(document.activeElement).toBe(items()[items().length - 1]);
    key(document.activeElement as HTMLElement, 'Home');
    expect(document.activeElement).toBe(items()[0]);
  }));

  it('closes on Escape and returns focus to the trigger', fakeAsync(() => {
    trigger().click();
    fixture.detectChanges();
    tick();
    key(items()[0], 'Escape');
    fixture.detectChanges();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  }));

  it('closes on an outside click and on navigation', fakeAsync(() => {
    trigger().click();
    fixture.detectChanges();
    tick();
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();
    expect(panel()).toBeNull();

    trigger().click();
    fixture.detectChanges();
    tick();
    routerEvents.next(new NavigationStart(1, '/elsewhere'));
    fixture.detectChanges();
    expect(panel()).toBeNull();
  }));

  it('changes language and theme through the preferences service', fakeAsync(() => {
    trigger().click();
    fixture.detectChanges();
    tick();
    element.querySelector<HTMLButtonElement>('.pm-option[data-lang="ar"]')!.click();
    element.querySelectorAll<HTMLButtonElement>('.pm-theme')[2].click();
    expect(preferences.setLanguage).toHaveBeenCalledWith('ar');
    expect(preferences.setTheme).toHaveBeenCalledWith('dark');
  }));

  it('signs out with the existing AuthService logic', fakeAsync(() => {
    trigger().click();
    fixture.detectChanges();
    tick();
    element.querySelector<HTMLButtonElement>('.pm-signout')!.click();
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  }));
});
