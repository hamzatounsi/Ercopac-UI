import { Component, Input } from '@angular/core';
import { HealthStatus } from '../../../models/health-status.model';


@Component({
  selector: 'app-health-badge',
  templateUrl: './health-badge.component.html',
  styleUrls: ['./health-badge.component.scss']
})
export class HealthBadgeComponent {
  @Input() value: HealthStatus = 'NA';

  cssClass(): string {
    return `badge ${this.value.toLowerCase()}`;
  }

  label(): string {
    switch (this.value) {
      case 'GREEN': return 'On track';
      case 'YELLOW': return 'Attention';
      case 'RED': return 'Delayed';
      default: return 'N/A';
    }
  }
}