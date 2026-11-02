import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { AppComponent } from './app.component';
import { PreferencesService } from './core/services/preferences.service';

describe('AppComponent', () => {
  const saveFailed = new BehaviorSubject(false);
  const preferences = { loadFromServer: jasmine.createSpy('loadFromServer'), saveFailed$: saveFailed, dismissSaveError: () => saveFailed.next(false) };

  beforeEach(() => TestBed.configureTestingModule({
    imports: [RouterTestingModule, TranslateModule.forRoot()],
    declarations: [AppComponent],
    providers: [{ provide: PreferencesService, useValue: preferences }]
  }));

  it('should create the app and load the saved preferences', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
    expect(preferences.loadFromServer).toHaveBeenCalled();
  });

  it('should render the routed application shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('shows a dismissible notice when a preference could not be saved', () => {
    const fixture = TestBed.createComponent(AppComponent);
    saveFailed.next(true);
    fixture.detectChanges();
    const notice = (fixture.nativeElement as HTMLElement).querySelector('.pm-pref-toast');
    expect(notice).toBeTruthy();
    notice!.querySelector('button')!.click();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.pm-pref-toast')).toBeNull();
  });
});
