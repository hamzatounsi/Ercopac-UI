import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';
import { WorkspaceModule } from 'src/app/core/auth/role-module.config';

@Component({
  selector: 'app-gm-workspaces-page',
  templateUrl: './gm-workspaces-page.component.html',
  styleUrls: ['./gm-workspaces-page.component.scss']
})
export class GmWorkspacesPageComponent implements OnInit {
  currentOrganisationName = 'Projectum workspace';
  organisationLabel = 'Workspace';
  currentUserName = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const orgName = this.authService.getOrganisationName();

    if (orgName && orgName.trim()) {
      this.currentOrganisationName = orgName;
      this.organisationLabel = 'Organisation';
    }

    // ✅ FIX: affiche le nom réel de l'utilisateur connecté au lieu du
    // texte statique "Logged in".
    this.currentUserName = this.authService.getCurrentUsername() || 'Logged in';
  }

  get visibleLauncherApps(): WorkspaceModule[] {
    return this.authService.getAccessibleWorkspaceModules();
  }

  openApp(app: WorkspaceModule): void {
    void this.router.navigateByUrl(app.route);
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/']);
  }
}
