import { Injectable } from '@angular/core';
import { formatDate } from '@angular/common';
import { I18nService } from 'src/app/core/i18n/i18n.service';
import { LanguageService } from 'src/app/core/i18n/language.service';
import { ORIGIN_LABELS, TicketDetails } from '../models/ticket.models';
import { TicketSettingsService, humanize } from './ticket-settings.service';

// Ticket report as PDF: details, problem statement, public conversation and assignment history.
// Internal notes are left out so the file can be shared with the customer.
// jsPDF's standard fonts only cover Latin-1, so Arabic, Turkish and Chinese reports keep the English labels.
const LATIN1_LANGUAGES = ['en', 'fr', 'de', 'it', 'es', 'pt', 'nl'];
@Injectable({ providedIn: 'root' })
export class TicketPdfService {
  constructor(private labels: TicketSettingsService, private i18n: I18nService, private language: LanguageService) {}

  async download(d: TicketDetails): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const left = 18, right = 192, width = right - left;
    let y = 22;
    const page = (needed = 6): void => { if (y + needed > 280) { pdf.addPage(); y = 22; } };
    const latin = LATIN1_LANGUAGES.includes(this.language.current);
    const locale = latin ? this.language.locale : 'en-US';
    const tx = (key: string, english: string, params?: Record<string, unknown>): string =>
      latin ? this.i18n.t('ticketing.pdf.' + key, params) : english.replace(/\{\{(\w+)\}\}/g, (_, n) => String(params?.[n] ?? ''));
    const date = (v?: string): string => v ? formatDate(v, 'medium', locale) : '—';

    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17); pdf.setTextColor(23, 34, 59);
    pdf.text(tx('title', 'Ticket {{number}}', { number: d.ticket.ticketNumber }), left, y); y += 8;
    pdf.setFontSize(12);
    for (const line of pdf.splitTextToSize(this.safe(d.ticket.subject), width)) { pdf.text(line, left, y); y += 6; }
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(113, 128, 154);
    pdf.text(tx('exported', 'Exported {{date}}', { date: date(new Date().toISOString()) }), left, y); y += 10;

    const heading = (text: string): void => {
      page(14); y += 2;
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(38, 63, 143);
      pdf.text(text, left, y); y += 2;
      pdf.setDrawColor(227, 231, 241); pdf.line(left, y, right, y); y += 6;
    };
    const row = (label: string, value?: string | null): void => {
      if (!value) return;
      const lines = pdf.splitTextToSize(this.safe(value), width - 45);
      page(lines.length * 5 + 1);
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(113, 128, 154); pdf.text(label.toUpperCase(), left, y);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(23, 34, 59);
      lines.forEach((l: string, i: number) => pdf.text(l, left + 45, y + i * 5));
      y += lines.length * 5 + 1.5;
    };
    const paragraph = (text: string): void => {
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(23, 34, 59);
      for (const line of pdf.splitTextToSize(this.safe(text), width)) { page(); pdf.text(line, left, y); y += 5; }
      y += 2;
    };

    const t = d.ticket;
    heading(tx('ticketDetails', 'Ticket details'));
    row(tx('status', 'Status'), this.labels.statusLabel(t.status));
    row(tx('priority', 'Priority'), this.labels.priorityLabel(t.priority));
    row(tx('category', 'Category'), latin ? this.i18n.t('ticketing.categories.' + t.category) : humanize(t.category));
    row(tx('origin', 'Origin'), latin ? this.i18n.t(ORIGIN_LABELS[d.origin]) : humanize(d.origin));
    row(tx('customer', 'Customer'), t.customer?.name ?? t.organisationName);
    row(tx('site', 'Site'), t.site);
    row(tx('project', 'Project'), t.project?.name);
    row(tx('equipment', 'Equipment'), d.equipment ? `${d.equipment.name}${d.equipment.serialNumber ? ' (S/N ' + d.equipment.serialNumber + ')' : ''}` : null);
    row(tx('contact', 'Contact'), t.client ? `${t.client.fullName} <${t.client.email}>` : null);
    row(tx('h24Agent', 'H24 agent'), t.assignee?.fullName ?? tx('unassigned', 'Unassigned'));
    row(tx('l2Technician', 'L2 technician'), t.l2Technician?.fullName);
    row(tx('created', 'Created'), date(t.createdAt));
    row(tx('resolved', 'Resolved'), d.resolvedAt ? date(d.resolvedAt) : null);
    row(tx('closed', 'Closed'), d.closedAt ? date(d.closedAt) : null);

    heading(tx('description', 'Description'));
    paragraph(d.description || tx('noDescription', 'No description.'));

    heading(tx('problemStatement', 'Problem statement'));
    row(tx('problem', 'Problem'), d.problem || tx('notFilledIn', 'Not filled in'));
    row(tx('cause', 'Cause'), d.cause || tx('notFilledIn', 'Not filled in'));
    row(tx('solution', 'Solution'), d.solution || tx('notFilledIn', 'Not filled in'));

    const messages = d.messages.filter(m => !m.internalNote);
    heading(tx('conversation', 'Conversation ({{count}})', { count: messages.length }));
    if (!messages.length) paragraph(tx('noMessages', 'No messages.'));
    for (const m of messages) {
      page(12);
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(83, 104, 167);
      pdf.text(`${this.safe(m.sender.fullName)} · ${date(m.createdAt)}`, left, y); y += 5;
      paragraph(m.message);
    }

    const history = d.activities.filter(a => a.field === 'assignee' || a.field === 'l2Technician' || a.activityType === 'STATUS_CHANGED' || a.activityType === 'RESOLVED' || a.activityType === 'CLOSED' || a.activityType === 'ESCALATED' || a.activityType === 'REOPENED');
    heading(tx('history', 'History'));
    if (!history.length) paragraph(tx('noHistory', 'No assignment or status changes.'));
    for (const a of history) row(date(a.createdAt), `${a.description}${a.newValue ? ': ' + a.newValue : ''} (${a.actor?.fullName ?? tx('system', 'System')})`);

    pdf.save(`${t.ticketNumber}.pdf`);
  }

  // jsPDF's standard fonts only cover Latin-1
  private safe(v: string): string { return (v ?? '').replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '?'); }
}
