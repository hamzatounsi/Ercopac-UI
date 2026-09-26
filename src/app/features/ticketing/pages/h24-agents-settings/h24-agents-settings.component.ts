import { Component, OnInit } from '@angular/core';
import { TicketConfigService, AppUser } from '../../services/ticket-config.service';

@Component({
  selector: 'app-h24-agents-settings',
  templateUrl: './h24-agents-settings.component.html',
  styleUrls: ['./h24-agents-settings.component.scss']
})
export class H24AgentsSettingsComponent implements OnInit {
  users: AppUser[] = [];

  constructor(private service: TicketConfigService) {}

  ngOnInit() {
    this.service.getH24Agents().subscribe({
      next: (data) => this.users = data,
      error: (err) => console.error('Error loading H24 agents:', err)
    });
  }

  // 👇 CORRECTION ICI : accepter 'string | undefined'
  getStatusClass(status: string | undefined): string {
    if (status === 'ONLINE') return 'badge-success';
    if (status === 'AWAY') return 'badge-warning';
    return 'badge-gray'; // Par défaut pour 'OFFLINE' ou undefined
  }
}