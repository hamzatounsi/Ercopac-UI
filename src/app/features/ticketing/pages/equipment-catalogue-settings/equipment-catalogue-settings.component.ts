import { Component, OnInit } from '@angular/core';
import { TicketConfigService, EquipmentType } from '../../services/ticket-config.service';

@Component({
  selector: 'app-equipment-catalogue-settings',
  templateUrl: './equipment-catalogue-settings.component.html',
  styleUrls: ['./equipment-catalogue-settings.component.scss']
})
export class EquipmentCatalogueSettingsComponent implements OnInit {
  equipmentList: EquipmentType[] = [];
  newEqName: string = '';
  newEqCode: string = '';
  newEqIcon: string = '🖥️';

  constructor(private service: TicketConfigService) {}

  ngOnInit() {
    this.loadEquipment();
  }

  loadEquipment() {
    this.service.getEquipment().subscribe({
      next: (data) => this.equipmentList = data,
      error: (err) => console.error('Error loading equipment:', err)
    });
  }

  createEquipment() {
    if (!this.newEqName.trim()) return;

    const equipment: EquipmentType = {
      id: 0,
      name: this.newEqName,
      code: this.newEqCode || undefined,
      icon: this.newEqIcon,
      active: true
    };

    this.service.createEquipment(equipment).subscribe({
      next: () => {
        this.newEqName = '';
        this.newEqCode = '';
        this.newEqIcon = '🖥️';
        this.loadEquipment();
      },
      error: (err) => console.error('Error creating equipment:', err)
    });
  }

  deleteEquipment(id: number) {
    if (confirm('Are you sure you want to delete this equipment type?')) {
      this.service.deleteEquipment(id).subscribe({
        next: () => this.loadEquipment(),
        error: (err) => console.error('Error deleting equipment:', err)
      });
    }
  }
}