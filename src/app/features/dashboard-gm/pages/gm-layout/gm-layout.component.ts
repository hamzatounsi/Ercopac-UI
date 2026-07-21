import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-gm-layout',
  templateUrl: './gm-layout.component.html',
  styleUrls: ['./gm-layout.component.scss']
})
export class GmLayoutComponent implements OnInit, OnDestroy {
  showSharedHeader = true;
  private navigationSubscription?: Subscription;

  constructor(private readonly router: Router) {}

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
    // The workspace launcher has its own authenticated account header.
    this.showSharedHeader = path !== '/gm';
  }
}
