import { Component, OnInit } from '@angular/core';
import { CrmOpportunity } from '../../models/crm-opportunity.model';
import { CrmReports } from '../../models/crm-detail.model';
import { CrmService } from '../../services/crm.service';

type ReportId = 'map' | 'country' | 'timeline' | 'value' | 'tf' | 'expected' | 'cs' | 'bp' | 'monthly' | 'resale';
interface ReportCard { id: ReportId; title: string; description: string; category: 'Opportunity reports' | 'Value reports'; icon: string; tone: string; }
interface Slice { key: string; value: number; count: number; color: string; }

@Component({ selector: 'app-crm-reports-page', templateUrl: './crm-reports-page.component.html', styleUrls: ['./crm-reports-page.component.scss'] })
export class CrmReportsPageComponent implements OnInit {
  orgId = this.crm.getOrgIdFromToken(); reports?: CrmReports; loading = true; error = ''; selected?: ReportId;
  type = 'all'; stage = 'all'; period = 'all'; month = 'all';
  readonly cards: ReportCard[] = [
    { id: 'map', title: 'World map', description: 'Opportunities plotted by country with bubble sizing by count', category: 'Opportunity reports', icon: '◎', tone: 'blue' },
    { id: 'country', title: 'By country', description: 'Donut chart breakdown of opportunities by country', category: 'Opportunity reports', icon: '◔', tone: 'green' },
    { id: 'timeline', title: 'Timeline', description: 'Opportunities plotted on a timeline by opening and closing dates', category: 'Opportunity reports', icon: '⌁', tone: 'amber' },
    { id: 'value', title: 'Value split', description: 'Material vs Services breakdown across all opportunities', category: 'Opportunity reports', icon: '▥', tone: 'purple' },
    { id: 'tf', title: 'Ercopac / TF split', description: 'Sales split between Ercopac and TF across opportunities', category: 'Value reports', icon: '✓', tone: 'blue' },
    { id: 'expected', title: 'Expected revenue by month', description: 'Monthly expected revenue (value × probability) plotted by closing date for the current year', category: 'Value reports', icon: '↗', tone: 'green' },
    { id: 'cs', title: 'CS projects overview', description: 'All CS opportunities with owner, value, TF value, probability, closing and shipment dates', category: 'Opportunity reports', icon: '▤', tone: 'purple' },
    { id: 'bp', title: 'BP projects overview', description: 'All BP opportunities with owner, value, TF value, probability, closing and shipment dates', category: 'Opportunity reports', icon: '▤', tone: 'blue' },
    { id: 'monthly', title: 'Monthly overview', description: 'All opportunities with owner, value, TF value, probability, closing and shipment dates', category: 'Opportunity reports', icon: '▤', tone: 'green' },
    { id: 'resale', title: 'Ercopac / Resale split', description: 'Breakdown between direct Ercopac revenue and resale revenue', category: 'Value reports', icon: '→', tone: 'red' }
  ];
  private readonly palette = ['#1a56db', '#0f7b4f', '#f59e0b', '#8b5cf6', '#0891b2', '#c0392b', '#6366f1'];
  private readonly countryCoordinates: Record<string, [number, number]> = {
    'United States': [-98, 39], 'Canada': [-106, 57], 'Brazil': [-52, -10], 'United Kingdom': [-3, 55], 'France': [2, 46], 'Germany': [10, 51], 'Italy': [12, 42], 'Spain': [-4, 40], 'Poland': [20, 52], 'Turkey': [35, 39], 'Tunisia': [9, 34], 'Egypt': [30, 27], 'Saudi Arabia': [45, 24], 'UAE': [54, 24], 'Qatar': [51, 25], 'Kuwait': [48, 29], 'Bahrain': [50, 26], 'Oman': [57, 21], 'Morocco': [-6, 32], 'Algeria': [2, 28], 'South Africa': [25, -29], 'Nigeria': [8, 9], 'India': [79, 22], 'China': [104, 35], 'Japan': [138, 37], 'Australia': [134, -25], 'Indonesia': [118, -2], 'Malaysia': [102, 4], 'Pakistan': [69, 30]
  };
  constructor(private crm: CrmService) {}
  ngOnInit(): void { this.crm.getReports(this.orgId).subscribe({ next: reports => { this.reports = reports; this.loading = false; }, error: error => { this.error = error?.error?.message || 'Unable to load reports.'; this.loading = false; } }); }
  open(id: ReportId): void { this.selected = id; this.type = this.stage = this.period = this.month = 'all'; }
  back(): void { this.selected = undefined; }
  get selectedCard(): ReportCard | undefined { return this.cards.find(card => card.id === this.selected); }
  get opportunityCards(): ReportCard[] { return this.cards.filter(card => card.category === 'Opportunity reports'); }
  get valueCards(): ReportCard[] { return this.cards.filter(card => card.category === 'Value reports'); }
  get stages(): string[] { return [...new Set((this.reports?.opportunities || []).map(item => item.stageName).filter((value): value is string => !!value))]; }
  get filtered(): CrmOpportunity[] {
    const now = new Date();
    return (this.reports?.opportunities || []).filter(item => {
      if (this.type !== 'all' && item.opportunityType !== this.type) return false;
      if (this.stage !== 'all' && item.stageName !== this.stage) return false;
      if (this.month !== 'all' && (!item.closingDate || Number(item.closingDate.slice(5, 7)) !== Number(this.month))) return false;
      if (!item.closingDate || this.period === 'all') return true;
      const date = this.localDate(item.closingDate);
      if (this.period === 'month') return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      if (this.period === 'quarter') return date.getFullYear() === now.getFullYear() && Math.floor(date.getMonth() / 3) === Math.floor(now.getMonth() / 3);
      return date.getFullYear() === now.getFullYear();
    });
  }
  get countrySlices(): Slice[] { return this.group(this.filtered, item => item.accountCountry || 'Unspecified'); }
  get valueSlices(): Slice[] { return this.fixedSlices([['Material', this.total('materialValue')], ['Services', this.total('servicesValue')]]); }
  get tfSlices(): Slice[] { return this.fixedSlices([['Ercopac', this.total('ercopacMaterialValue')], ['TF', this.total('thirdPartyMaterialValue')]]); }
  get resaleSlices(): Slice[] { return this.fixedSlices([['Ercopac', this.total('ercopacResaleValue')], ['Resale', this.total('resaleValue')]]); }
  get weightedTotal(): number { return this.expectedMonths.reduce((sum, item) => sum + item.value, 0); }
  get activeTotal(): number { return this.activeSlices.reduce((sum, item) => sum + item.value, 0); }
  get expectedMonths(): Slice[] {
    const year = new Date().getFullYear(); const values = Array.from({ length: 12 }, (_, index) => ({ key: new Date(year, index, 1).toLocaleString('en', { month: 'short' }), value: 0, count: 0, color: this.palette[0] }));
    this.filtered.forEach(item => { if (!item.closingDate) return; const date = this.localDate(item.closingDate); if (date.getFullYear() === year) { values[date.getMonth()].value += (item.value || 0) * item.probability / 100; values[date.getMonth()].count++; } });
    return values;
  }
  get projectRows(): CrmOpportunity[] { if (this.selected === 'cs') return this.filtered.filter(item => item.opportunityType === 'CS'); if (this.selected === 'bp') return this.filtered.filter(item => item.opportunityType === 'BP'); return this.filtered; }
  get mapBubbles(): Array<Slice & { left: number; top: number }> { return this.countrySlices.filter(item => this.countryCoordinates[item.key]).map(item => { const [longitude, latitude] = this.countryCoordinates[item.key]; return { ...item, left: (longitude + 180) / 360 * 100, top: (90 - latitude) / 180 * 100 }; }); }
  get unmappedCountries(): Slice[] { return this.countrySlices.filter(item => !this.countryCoordinates[item.key]); }
  get maxCountry(): number { return Math.max(1, ...this.countrySlices.map(item => item.count)); }
  get maxValue(): number { return Math.max(1, ...this.activeSlices.map(item => item.value)); }
  get activeSlices(): Slice[] { return this.selected === 'value' ? this.valueSlices : this.selected === 'tf' ? this.tfSlices : this.selected === 'resale' ? this.resaleSlices : this.countrySlices; }
  total(field: keyof CrmOpportunity): number { return this.filtered.reduce((sum, item) => sum + (Number(item[field]) || 0), 0); }
  money(value: number, currency = 'EUR'): string { return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0); }
  percent(value: number, slices: Slice[]): number { const total = slices.reduce((sum, item) => sum + item.value, 0); return total ? value / total * 100 : 0; }
  donutGradient(slices: Slice[]): string { const total = slices.reduce((sum, item) => sum + item.value, 0); if (!total) return '#f0f2f7 0 100%'; let start = 0; return slices.map(item => { const end = start + item.value / total * 100; const part = `${item.color} ${start}% ${end}%`; start = end; return part; }).join(', '); }
  private group(items: CrmOpportunity[], key: (item: CrmOpportunity) => string): Slice[] { const result = new Map<string, Slice>(); items.forEach(item => { const name = key(item); const current = result.get(name) || { key: name, value: 0, count: 0, color: this.palette[result.size % this.palette.length] }; current.value += item.value || 0; current.count++; result.set(name, current); }); return [...result.values()].sort((a, b) => b.value - a.value); }
  private fixedSlices(values: Array<[string, number]>): Slice[] { return values.map(([key, value], index) => ({ key, value, count: 0, color: this.palette[index + 1] })); }
  private localDate(value: string): Date { const [year, month, day] = value.slice(0, 10).split('-').map(Number); return new Date(year, month - 1, day); }
}
