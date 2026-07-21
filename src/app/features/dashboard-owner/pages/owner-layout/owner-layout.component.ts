import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
  selector: 'app-owner-layout',
  templateUrl: './owner-layout.component.html',
  styleUrls: ['./owner-layout.component.scss']
})
export class OwnerLayoutComponent {

  constructor(private auth: AuthService, private router: Router) {}

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
