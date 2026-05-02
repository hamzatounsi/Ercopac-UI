import { Component } from '@angular/core';

type Tab = 'licences' | 'categories' | 'types' | 'customers';

@Component({
  selector: 'app-gm-admin-settings-page',
  templateUrl: './gm-admin-settings-page.component.html',
  styleUrls: ['./gm-admin-settings-page.component.scss']
})
export class GmAdminSettingsPageComponent {
  activeTab: 'resources' | 'licences' | 'categories' | 'types' | 'customers' = 'resources';

  setTab(tab: 'resources' | 'licences' | 'categories' | 'types' | 'customers'): void {
    this.activeTab = tab;
  }
}