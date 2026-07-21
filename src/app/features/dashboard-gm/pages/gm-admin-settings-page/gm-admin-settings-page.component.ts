import { Component } from '@angular/core';

type Tab =
  | 'resources'
  | 'licences'
  | 'categories'
  | 'types'
  | 'customers'
  | 'security';

@Component({
  selector: 'app-gm-admin-settings-page',
  templateUrl: './gm-admin-settings-page.component.html',
  styleUrls: ['./gm-admin-settings-page.component.scss']
})
export class GmAdminSettingsPageComponent {
  activeTab: Tab = 'resources';

  setTab(tab: Tab): void {
    this.activeTab = tab;
  }
}