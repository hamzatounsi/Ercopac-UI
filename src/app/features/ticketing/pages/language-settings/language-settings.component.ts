import { Component, OnInit } from '@angular/core';
import { LANGUAGES, MySettings } from '../../models/ticket.models';
import { TicketSettingsService } from '../../services/ticket-settings.service';

// My language: the language I write in. Ticket conversations can translate the other side's
// messages into it, and translate my public replies into the other side's language.
@Component({
  selector: 'app-language-settings',
  templateUrl: './language-settings.component.html',
  styleUrls: ['./language-settings.component.scss']
})
export class LanguageSettingsComponent implements OnInit {
  me?: MySettings;
  language = 'en';
  loading = true;
  saving = false;
  error = '';
  notice = '';
  readonly languages = LANGUAGES;

  constructor(private settings: TicketSettingsService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.settings.me().subscribe({
      next: me => { this.me = me; this.language = me.preferredLanguage || 'en'; this.loading = false; },
      error: e => { this.loading = false; this.error = e.error?.message || 'Your settings could not be loaded.'; }
    });
  }

  save(language: string): void {
    this.language = language;
    this.saving = true;
    this.error = '';
    this.settings.setMyLanguage(language).subscribe({
      next: me => { this.me = me; this.saving = false; this.flash('Language updated'); },
      error: e => {
        this.saving = false;
        this.language = this.me?.preferredLanguage || 'en';
        this.error = e.error?.message || 'The language could not be saved.';
      }
    });
  }

  private flash(text: string): void { this.notice = text; setTimeout(() => this.notice = '', 2500); }
}
