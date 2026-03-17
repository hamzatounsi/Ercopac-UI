import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-gm-workspaces-page',
  templateUrl: './gm-workspaces-page.component.html',
  styleUrls: ['./gm-workspaces-page.component.scss']
})
export class GmWorkspacesPageComponent {
  constructor(private router: Router) {}

  openProjectum(): void {
    this.router.navigate(['/gm/projectum']);
  }
}