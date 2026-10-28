import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AiPdfExportService {
  async download(projectName: string, question: string, answer: string): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const left = 20;
    const right = 190;
    let y = 24;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('Projectum AI Brief', left, y);
    y += 10;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(80, 95, 112);
    pdf.text(this.safe(projectName), left, y);
    y += 7;
    pdf.text(new Date().toLocaleDateString(), left, y);
    y += 14;

    const section = (heading: string, content: string): void => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(24, 49, 82);
      pdf.text(heading, left, y);
      y += 7;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(30, 41, 59);
      for (const line of pdf.splitTextToSize(this.safe(content), right - left)) {
        if (y > 275) { pdf.addPage(); y = 24; }
        pdf.text(line, left, y);
        y += 5.5;
      }
      y += 9;
    };

    section('Question', question);
    section('Answer', answer);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    if (y > 280) { pdf.addPage(); y = 24; }
    pdf.text('Generated from the project data available to your account.', left, y);

    const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'project';
    pdf.save(`projectum-ai-${slug}.pdf`);
  }

  private safe(value: string): string {
    return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2013\u2014]/g, '-').replace(/[^\x20-\x7e\n]/g, '?');
  }
}
