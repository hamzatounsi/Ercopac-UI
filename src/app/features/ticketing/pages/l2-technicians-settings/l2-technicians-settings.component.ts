import { Component, OnInit } from '@angular/core';
import { TicketConfigService, AppUser } from '../../services/ticket-config.service';

@Component({
  selector: 'app-l2-technicians-settings',
  templateUrl: './l2-technicians-settings.component.html',
  styleUrls: ['./l2-technicians-settings.component.scss']
})
export class L2TechniciansSettingsComponent implements OnInit {
  users: AppUser[] = [];

  constructor(private service: TicketConfigService) {}

  ngOnInit() {
    this.service.getL2Technicians().subscribe({
      next: (data) => this.users = data,
      error: (err) => console.error('Error loading L2 technicians:', err)
    });
  }
}