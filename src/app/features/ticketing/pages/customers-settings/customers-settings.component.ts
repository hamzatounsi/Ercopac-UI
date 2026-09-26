import { Component, OnInit } from '@angular/core';
import { TicketConfigService, AppUser } from '../../services/ticket-config.service';

@Component({
  selector: 'app-customers-settings',
  templateUrl: './customers-settings.component.html',
  styleUrls: ['./customers-settings.component.scss']
})
export class CustomersSettingsComponent implements OnInit {
  users: AppUser[] = [];

  constructor(private service: TicketConfigService) {}

  ngOnInit() {
    this.service.getCustomers().subscribe({
      next: (data) => this.users = data,
      error: (err) => console.error('Error loading customers:', err)
    });
  }
}