import { Component } from '@angular/core';
import { AuthService } from 'src/app/core/auth/auth.service'; // Vérifie que ce chemin est bon

@Component({
  selector: 'app-ticketing-layout',
  templateUrl: './ticketing-layout.component.html',
  styleUrls: ['./ticketing-layout.component.scss']
})
export class TicketingLayoutComponent {
  constructor(public auth: AuthService) {}

  // Méthode sécurisée pour obtenir le nom (à adapter si ton AuthService a une propriété différente)
  getUserName(): string {
    // 👇 ADAPTE ICI si ton service utilise un autre nom, ex: this.auth.user?.fullName
    // Pour l'instant, on met une valeur par défaut pour que ça compile.
    return 'Utilisateur'; 
  }

  getUserInitials(): string {
    const name = this.getUserName();
    return name.charAt(0).toUpperCase();
  }
}