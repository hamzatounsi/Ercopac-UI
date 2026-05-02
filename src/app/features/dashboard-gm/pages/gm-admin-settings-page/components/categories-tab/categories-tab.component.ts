import { Component, OnInit } from '@angular/core';
import { GmAdminService } from 'src/app/features/dashboard-gm/services/gm-admin.service';

@Component({
  selector: 'app-categories-tab',
  templateUrl: './categories-tab.component.html',
  styleUrls: ['./categories-tab.component.scss']
})
export class CategoriesTabComponent implements OnInit {

  categories: any[] = [];

  modalOpen = false;
  editingId: number | null = null;

  form = {
    name: '',
    code: '',
    description: '',
    icon: '📊',
    color: '#1565c0',
    active: true
  };

  colors = [
    '#1565c0', '#0891b2', '#7c3aed', '#059669', '#d97706',
    '#dc2626', '#db2777', '#16a34a', '#4f46e5', '#0f766e'
  ];

  icons = ['📊', '🏗️', '🔧', '💻', '🔬', '💡', '🛠️', '🌍', '⚙️', '💼'];

  constructor(private adminService: GmAdminService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.adminService.getCategories().subscribe(res => {
      this.categories = res || [];
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.form = {
      name: '',
      code: '',
      description: '',
      icon: '📊',
      color: '#1565c0',
      active: true
    };
    this.modalOpen = true;
  }

  openEdit(category: any): void {
    this.editingId = category.id;
    this.form = {
      name: category.name || '',
      code: category.code || '',
      description: category.description || '',
      icon: category.icon || '📊',
      color: category.color || '#1565c0',
      active: category.active !== false
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
      this.adminService.updateCategory(this.editingId, payload).subscribe(() => {
        this.closeModal();
        this.load();
      });
    } else {
      this.adminService.createCategory(payload).subscribe(() => {
        this.closeModal();
        this.load();
      });
    }
  }

  delete(category: any): void {
    if (!confirm(`Delete category "${category.name}"?`)) {
      return;
    }

    this.adminService.deleteCategory(category.id).subscribe(() => {
      this.load();
    });
  }
}