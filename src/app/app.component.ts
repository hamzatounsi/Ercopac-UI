import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  // ThemeService is injected here so the theme is owned by Angular from the first view on.
  constructor(router: Router, title: Title, _theme: ThemeService) {
    router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
      const url = (event as NavigationEnd).urlAfterRedirects;
      title.setTitle(this.titleFor(url));
    });
  }

  private titleFor(url: string): string {
    if (url === '/') return 'Projectum | Project & Resource Management';
    if (url.startsWith('/login')) return 'Login | Projectum';
    if (url.startsWith('/workspace')) return 'Workspace | Projectum';
    if (url.includes('/command-center')) return 'Command Center | Projectum';
    if (url.includes('/milestones')) return 'Milestones | Projectum';
    return 'Projectum | Project & Resource Management';
  }
}
