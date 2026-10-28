import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
  selector: 'app-gm-layout',
  templateUrl: './gm-layout.component.html',
  styleUrls: ['./gm-layout.component.scss']
})
export class GmLayoutComponent implements OnInit, OnDestroy {
  showSharedHeader = true;
  // Main page(s) of the application shown in this layout (no "Back" button there)
  homes: string[] = ['/gm/projectum'];
  private navigationSubscription?: Subscription;

  constructor(
    private readonly router: Router,
    readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.updateHeaderVisibility(this.router.url);
    this.navigationSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateHeaderVisibility(event.urlAfterRedirects);
      }
    });
  }

  ngOnDestroy(): void {
    this.navigationSubscription?.unsubscribe();
  }


  private updateHeaderVisibility(url: string): void {
    const path = url.split('?')[0].replace(/\/$/, '');
    // Projectum pages own a Workspace header including account actions.
    const hasWorkspaceHeader = /^\/gm\/(projectum(?:\/|$)|projects\/|milestones$)/.test(path);
    this.showSharedHeader = path !== '/gm' && !hasWorkspaceHeader;
    this.homes = /^\/gm\/(company-dashboard|command-center)/.test(path) ? ['/gm/company-dashboard', '/gm/command-center']
      : path.startsWith('/gm/my-department') ? ['/gm/my-department']
      : path.startsWith('/gm/my-cs') ? ['/gm/my-cs']
      : ['/gm/projectum'];
  }
}
