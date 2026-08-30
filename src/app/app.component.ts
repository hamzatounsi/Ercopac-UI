import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(router: Router, title: Title) {
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
