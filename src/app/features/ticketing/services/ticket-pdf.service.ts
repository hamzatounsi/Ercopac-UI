import { Injectable } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ORIGIN_LABELS, TicketDetails } from '../models/ticket.models';
import { TicketSettingsService, humanize } from './ticket-settings.service';

// Ticket report as PDF: details, problem statement, public conversation and assignment history.
// Internal notes are left out so the file can be shared with the customer.
@Injectable({ providedIn: 'root' })
export class TicketPdfService {
  private readonly dates = new DatePipe('en-US');

  constructor(private labels: TicketSettingsService) {}

  async download(d: TicketDetails): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const left = 18, right = 192, width = right - left;
    let y = 22;
    const page = (needed = 6): void => { if (y + needed > 280) { pdf.addPage(); y = 22; } };
    const date = (v?: string): string => v ? this.dates.transform(v, 'medium') ?? v : '—';

    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17); pdf.setTextColor(23, 34, 59);
    pdf.text(`Ticket ${d.ticket.ticketNumber}`, left, y); y += 8;
    pdf.setFontSize(12);
    for (const line of pdf.splitTextToSize(this.safe(d.ticket.subject), width)) { pdf.text(line, left, y); y += 6; }
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(113, 128, 154);
    pdf.text(`Exported ${date(new Date().toISOString())}`, left, y); y += 10;

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
    heading('Ticket details');
    row('Status', this.labels.statusLabel(t.status));
    row('Priority', this.labels.priorityLabel(t.priority));
    row('Category', humanize(t.category));
    row('Origin', ORIGIN_LABELS[d.origin]);
    row('Customer', t.customer?.name ?? t.organisationName);
    row('Site', t.site);
    row('Project', t.project?.name);
    row('Equipment', d.equipment ? `${d.equipment.name}${d.equipment.serialNumber ? ' (S/N ' + d.equipment.serialNumber + ')' : ''}` : null);
    row('Contact', t.client ? `${t.client.fullName} <${t.client.email}>` : null);
    row('H24 agent', t.assignee?.fullName ?? 'Unassigned');
    row('L2 technician', t.l2Technician?.fullName);
    row('Created', date(t.createdAt));
    row('Resolved', d.resolvedAt ? date(d.resolvedAt) : null);
    row('Closed', d.closedAt ? date(d.closedAt) : null);

    heading('Description');
    paragraph(d.description || 'No description.');

    heading('Problem statement');
    row('Problem', d.problem || 'Not filled in');
    row('Cause', d.cause || 'Not filled in');
    row('Solution', d.solution || 'Not filled in');

    const messages = d.messages.filter(m => !m.internalNote);
    heading(`Conversation (${messages.length})`);
    if (!messages.length) paragraph('No messages.');
    for (const m of messages) {
      page(12);
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(83, 104, 167);
      pdf.text(`${this.safe(m.sender.fullName)} · ${date(m.createdAt)}`, left, y); y += 5;
      paragraph(m.message);
    }

    const history = d.activities.filter(a => a.field === 'assignee' || a.field === 'l2Technician' || a.activityType === 'STATUS_CHANGED' || a.activityType === 'RESOLVED' || a.activityType === 'CLOSED' || a.activityType === 'ESCALATED' || a.activityType === 'REOPENED');
    heading('History');
    if (!history.length) paragraph('No assignment or status changes.');
    for (const a of history) row(date(a.createdAt), `${a.description}${a.newValue ? ': ' + a.newValue : ''} (${a.actor?.fullName ?? 'System'})`);

    pdf.save(`${t.ticketNumber}.pdf`);
  }

  // jsPDF's standard fonts only cover Latin-1
  private safe(v: string): string { return (v ?? '').replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '?'); }
}
