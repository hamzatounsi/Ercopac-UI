import { Component, OnInit } from '@angular/core';
import { GmAdminService } from 'src/app/features/dashboard-gm/services/gm-admin.service';

@Component({
  selector: 'app-types-tab',
  templateUrl: './types-tab.component.html',
  styleUrls: ['./types-tab.component.scss']
})
export class TypesTabComponent implements OnInit {

  types: any[] = [];

  modalOpen = false;
  editingId: number | null = null;

  form = {
    name: '',
    code: '',
    description: '',
    icon: '📄',
    color: '#16a34a',
    billable: false,
    active: true
  };

  colors = [
    '#1565c0', '#0891b2', '#7c3aed', '#059669', '#d97706',
    '#dc2626', '#db2777', '#16a34a', '#4f46e5', '#0f766e'
  ];

  icons = ['📄', '🏢', '🔧', '💰', '⭐', '🤝', '🎯', '🚧', '📝', '🔍'];

  constructor(private adminService: GmAdminService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.adminService.getTypes().subscribe(res => {
      this.types = res || [];
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.form = {
      name: '',
      code: '',
      description: '',
      icon: '📄',
      color: '#16a34a',
      billable: false,
      active: true
    };
    this.modalOpen = true;
  }

  openEdit(type: any): void {
    this.editingId = type.id;
    this.form = {
      name: type.name || '',
      code: type.code || '',
      description: type.description || '',
      icon: type.icon || '📄',
      color: type.color || '#16a34a',
      billable: !!type.billable,
      active: type.active !== false
    };
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
  }

  save(): void {
    if (!this.form.name.trim() || !this.form.code.trim()) {
      alert('Name and code are required');
      return;
    }

    const payload = {
      ...this.form,
      code: this.form.code.trim().toUpperCase()
    };

    if (this.editingId) {
      this.adminService.updateType(this.editingId, payload).subscribe(() => {
        this.closeModal();
        this.load();
      });
    } else {
      this.adminService.createType(payload).subscribe(() => {
        this.closeModal();
        this.load();
      });
    }
  }

  delete(type: any): void {
    if (!confirm(`Delete project type "${type.name}"?`)) {
      return;
    }

    this.adminService.deleteType(type.id).subscribe(() => {
      this.load();
    });
  }
}