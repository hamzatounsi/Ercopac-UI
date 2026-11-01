import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Location, NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

/**
 * Navigation buttons shown in the header of every application (Projectum, Command Center, CRM, Ticketing,
 * My Department, Employee):
 * - "Workspaces" always goes back to the workspace page (application tiles);
 * - "Back" is shown on every page except the application's main page(s) and returns to the previous page,
 *   or to the main page when the page was opened directly (no previous page in the app).
 */
@Component({
  selector: 'app-nav-buttons',
  standalone: true,
  imports: [NgIf, TranslateModule],
  template: `
    <button *ngIf="!isHome" type="button" class="nav-btn" (click)="back()" [title]="'common.backToPrevious' | translate">
      <span class="material-symbols-outlined nav-flip" aria-hidden="true">arrow_back</span>{{ 'common.back' | translate }}
    </button>
    <button type="button" class="nav-btn" (click)="workspace()" [title]="'common.backToWorkspace' | translate">
      <span class="material-symbols-outlined" aria-hidden="true">apps</span>{{ 'common.workspaces' | translate }}
    </button>
  `,
  styles: [`
    :host { display:inline-flex; align-items:center; gap:8px; flex-shrink:0; }
    .nav-btn { display:inline-flex; align-items:center; gap:5px; height:32px; padding:0 11px; border:1px solid var(--pm-border);
      border-radius:7px; background:var(--pm-surface); color:var(--pm-text); font:inherit; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap; }
    .nav-btn:hover { background:var(--pm-surface-muted); color:var(--pm-text); }
    .nav-btn .material-symbols-outlined { font-size:17px; }
    :host-context([dir="rtl"]) .nav-flip { transform:scaleX(-1); }
  `]
})
export class AppNavButtonsComponent implements OnInit, OnDestroy {
  /** Main page(s) of the application; the first one is where "Back" goes when there is no previous page. */
  @Input() homes: string[] = [];

  isHome = false;
  private sub?: Subscription;

  constructor(private router: Router, private location: Location) {}

  ngOnInit(): void {
    this.update();
    this.sub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) this.update();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  back(): void {
    // The router numbers its navigations: 1 means this page was opened directly (no previous page in the app)
    const navigationId = (history.state as { navigationId?: number } | null)?.navigationId ?? 1;
    if (navigationId > 1) {
      this.location.back();
    } else {
      void this.router.navigateByUrl(this.homes[0] || '/workspace');
    }
  }

  workspace(): void {
    void this.router.navigate(['/workspace']);
  }

  private update(): void {
    const path = this.router.url.split(/[?#]/)[0].replace(/\/$/, '');
    this.isHome = this.homes.some(home => home.replace(/\/$/, '') === path);
  }
}
