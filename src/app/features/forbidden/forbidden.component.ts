import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
  selector: 'app-forbidden',
  templateUrl: './forbidden.component.html',
  styleUrls: ['./forbidden.component.scss']
})
export class ForbiddenComponent {
  constructor(private auth: AuthService, private router: Router) {}

  goHome(): void {
    this.router.navigateByUrl(this.auth.getHomeRoute());
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
