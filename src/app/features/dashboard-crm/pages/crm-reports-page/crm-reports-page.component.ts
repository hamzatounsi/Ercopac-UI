import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { feature as topojsonFeature } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import { CrmOpportunity } from '../../models/crm-opportunity.model';
import { CrmReports } from '../../models/crm-detail.model';
import { CrmEquipmentReport } from '../../models/crm-equipment.model';
import { CrmService } from '../../services/crm.service';
import { CrmCountryService } from '../../services/crm-country.service';
import * as XLSX from 'xlsx';

type ReportId = 'map' | 'country' | 'timeline' | 'value' | 'tf' | 'expected' | 'cs' | 'bp' | 'monthly' | 'resale' | 'equipment' | 'shipment';
interface ReportCard { id: ReportId; title: string; description: string; category: 'Opportunity reports' | 'Value reports'; icon: string; tone: string; }
interface Slice { key: string; value: number; count: number; color: string; }

@Component({ selector: 'app-crm-reports-page', templateUrl: './crm-reports-page.component.html', styleUrls: ['./crm-reports-page.component.scss'] })
export class CrmReportsPageComponent implements OnInit, AfterViewChecked, OnDestroy {
  orgId = this.crm.getOrgIdFromToken(); reports?: CrmReports; loading = true; error = ''; selected?: ReportId;
  type = 'all'; stage = 'all'; period = 'all'; month = 'all'; year = new Date().getFullYear();
  equipmentReport?: CrmEquipmentReport;
  readonly cards: ReportCard[] = [
    { id: 'map', title: 'World map', description: 'Opportunities plotted by country with bubble sizing by count', category: 'Opportunity reports', icon: '◎', tone: 'blue' },
    { id: 'country', title: 'By country', description: 'Donut chart breakdown of opportunities by country', category: 'Opportunity reports', icon: '◔', tone: 'green' },
    { id: 'timeline', title: 'Timeline', description: 'Opportunities plotted on a timeline by opening and closing dates', category: 'Opportunity reports', icon: '⌁', tone: 'amber' },
    { id: 'value', title: 'Value split', description: 'Material vs Services breakdown across all opportunities', category: 'Opportunity reports', icon: '▥', tone: 'purple' },
    { id: 'tf', title: 'Ercopac / TF split', description: 'Sales split between Ercopac and TF across opportunities', category: 'Value reports', icon: '✓', tone: 'blue' },
    { id: 'expected', title: 'Expected revenue by month', description: 'Monthly expected revenue (discounted value × probability) plotted by closing date for the current year', category: 'Value reports', icon: '↗', tone: 'green' },
    { id: 'cs', title: 'CS projects overview', description: 'All CS opportunities with owner, value, TF value, probability, closing and shipment dates', category: 'Opportunity reports', icon: '▤', tone: 'purple' },
    { id: 'bp', title: 'BP projects overview', description: 'All BP opportunities with owner, value, TF value, probability, closing and shipment dates', category: 'Opportunity reports', icon: '▤', tone: 'blue' },
    { id: 'monthly', title: 'Monthly overview', description: 'All opportunities with owner, value, TF value, probability, closing and shipment dates', category: 'Opportunity reports', icon: '▤', tone: 'green' },
    { id: 'resale', title: 'Ercopac / Resale split', description: 'Breakdown between direct Ercopac revenue and resale revenue', category: 'Value reports', icon: '→', tone: 'red' }
    ,{ id: 'equipment', title: 'Equipment overview', description: 'Equipment quantities across all opportunities, grouped by type', category: 'Opportunity reports', icon: 'EQ', tone: 'amber' },
    { id: 'shipment', title: 'Equipment shipment on time', description: 'Shipment dates versus closing dates for equipment opportunities', category: 'Opportunity reports', icon: 'OT', tone: 'green' }
  ];
  private readonly palette = ['#1a56db', '#0f7b4f', '#f59e0b', '#8b5cf6', '#0891b2', '#c0392b', '#6366f1'];
  @ViewChild('worldCanvas') worldCanvas?: ElementRef<HTMLCanvasElement>;
  mapBubbles: Array<Slice & { left: number; top: number }> = [];
  mapLoading = true; mapMessage = '';
  private mapFeatures: any[] = []; private renderedCanvas?: HTMLCanvasElement; private resizeObserver?: ResizeObserver;
  constructor(private crm: CrmService, public countries: CrmCountryService) {}
  ngOnInit(): void { this.crm.getReports(this.orgId).subscribe({ next: reports => { this.reports = reports; this.loading = false; }, error: error => { this.error = error?.error?.message || 'Unable to load reports.'; this.loading = false; } }); }
  open(id: ReportId): void { this.selected = id; this.type = this.stage = this.period = this.month = 'all'; this.year = new Date().getFullYear(); if(id==='equipment'||id==='shipment')this.loadEquipmentReport(); }
  loadEquipmentReport():void { this.crm.getEquipmentReport(this.orgId,this.stage,this.type).subscribe({next:r=>this.equipmentReport=r,error:e=>this.error=e?.error?.message||'Unable to load equipment report.'}); }
  get equipmentUnits():number{return (this.equipmentReport?.totals||[]).reduce((sum,item)=>sum+item.quantity,0);}
  get onTimeShipments():number{return (this.equipmentReport?.shipments||[]).filter(item=>item.status==='On Time').length;}
  get equipmentDetails(){return this.equipmentReport?.details||[];}
  get overviewOpportunities(){const map=new Map<number,typeof this.equipmentDetails>();this.equipmentDetails.forEach(row=>map.set(row.opportunityId,[...(map.get(row.opportunityId)||[]),row]));return [...map.values()];}
  get shipmentDetails(){return this.equipmentDetails.filter(row=>!!row.shipmentDate).sort((a,b)=>(a.shipmentDate||'').localeCompare(b.shipmentDate||''));}
  get shipmentOpportunityCount():number{return new Set(this.shipmentDetails.map(row=>row.opportunityId)).size;}
  get shipmentTypes(){return [...new Set(this.shipmentDetails.map(row=>row.equipmentName))];}
  get shipmentMonths(){return [...new Set(this.shipmentDetails.map(row=>row.shipmentDate.slice(0,7)))].sort();}
  shipmentQty(type:string,month:string):number{return this.shipmentDetails.filter(row=>row.equipmentName===type&&row.shipmentDate.slice(0,7)===month).reduce((sum,row)=>sum+row.quantity,0);}
  shipmentTotal(type:string):number{return this.shipmentDetails.filter(row=>row.equipmentName===type).reduce((sum,row)=>sum+row.quantity,0);}
  get shipmentTotalUnits():number{return this.shipmentDetails.reduce((sum,row)=>sum+row.quantity,0);}
  equipmentLabel(rows:any[]):string{return rows.map(row=>`${row.equipmentName} (${row.quantity})`).join(', ');}
  readonly equipmentColours=['#1a56db','#0f7b4f','#f59e0b','#c0392b','#8b5cf6','#0891b2','#6366f1','#d97706'];
  colour(index:number):string{return this.equipmentColours[index%this.equipmentColours.length];}
  get maxEquipmentUnits():number{return Math.max(1,...(this.equipmentReport?.totals||[]).map(item=>item.quantity));}
  totalBefore(index:number):number{return (this.equipmentReport?.totals||[]).slice(0,index+1).reduce((sum,item)=>sum+item.quantity,0);}
  get overviewTotalUnits():number{return this.equipmentUnits;}
  equipmentDonutGradient():string{let offset=0;const total=this.overviewTotalUnits||1;return (this.equipmentReport?.totals||[]).map((item,index)=>{const end=offset+item.quantity/total*100;const segment=`${this.colour(index)} ${offset}% ${end}%`;offset=end;return segment;}).join(',')||'#f0f2f7 0 100%';}
  monthLabel(month:string):string{return new Date(month+'-01T00:00:00').toLocaleString('en',{month:'short',year:'2-digit'});}
  isCurrentMonth(month:string):boolean{return month===new Date().toISOString().slice(0,7);}
  get maxShipmentQty():number{return Math.max(1,...this.shipmentTypes.flatMap(type=>this.shipmentMonths.map(month=>this.shipmentQty(type,month))));}
  groupTotal(rows:any[]):number{return rows.reduce((sum,row)=>sum+row.quantity,0);}
  monthlyTotal(month:string):number{return this.shipmentTypes.reduce((sum,type)=>sum+this.shipmentQty(type,month),0);}
  back(): void { this.selected = undefined; }
  ngAfterViewChecked(): void { if (this.selected === 'map' && this.worldCanvas && this.worldCanvas.nativeElement !== this.renderedCanvas) this.attachMap(this.worldCanvas.nativeElement); }
  ngOnDestroy(): void { this.resizeObserver?.disconnect(); }
  mapFiltersChanged(): void { setTimeout(() => this.drawWorldMap()); }
  filtersChanged(): void { if (this.selected === 'equipment' || this.selected === 'shipment') this.loadEquipmentReport(); this.mapFiltersChanged(); }
  get selectedCard(): ReportCard | undefined { return this.cards.find(card => card.id === this.selected); }
  get showsTypeFilter(): boolean { return !!this.selected && !['cs', 'bp', 'shipment'].includes(this.selected); }
  get showsStageFilter(): boolean { return !!this.selected && !['value', 'tf', 'resale', 'expected'].includes(this.selected); }
  get showsPeriodFilter(): boolean { return !!this.selected && ['map', 'country', 'monthly', 'cs', 'bp'].includes(this.selected); }
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
  get countrySlices(): Slice[] { return this.group(this.filtered, item => this.countries.displayName(item.accountCountry)); }
  get valueSlices(): Slice[] { return this.fixedSlices([['Material', this.total('materialValue')], ['Services', this.total('servicesValue')]]); }
  get tfSlices(): Slice[] { return this.fixedSlices([['Ercopac', this.total('ercopacMaterialValue')], ['TF', this.total('thirdPartyMaterialValue')]]); }
  get resaleSlices(): Slice[] { return this.fixedSlices([['Ercopac', this.total('ercopacResaleValue')], ['Resale', this.total('resaleValue')]]); }
  get weightedTotal(): number { return this.filtered.reduce((sum, item) => sum + this.expectedRevenue(item), 0); }
  get activeTotal(): number { return this.activeSlices.reduce((sum, item) => sum + item.value, 0); }
  get expectedMonths(): Slice[] {
    const values = Array.from({ length: 12 }, (_, index) => ({ key: new Date(this.year, index, 1).toLocaleString('en', { month: 'short' }), value: 0, count: 0, color: this.palette[0] }));
    this.filtered.forEach(item => { if (!item.closingDate) return; const date = this.localDate(item.closingDate); if (date.getFullYear() === this.year) { values[date.getMonth()].value += this.expectedRevenue(item); values[date.getMonth()].count++; } });
    return values;
  }
  get availableYears(): number[] { const values = new Set<number>([new Date().getFullYear()]); (this.reports?.opportunities || []).forEach(item => { if (item.closingDate) values.add(this.localDate(item.closingDate).getFullYear()); }); return [...values].sort((a, b) => b - a); }
  get maxExpectedValue(): number { return Math.max(1, ...this.expectedMonths.map(item => item.value)); }
  get projectRows(): CrmOpportunity[] { if (this.selected === 'cs') return this.filtered.filter(item => item.opportunityType === 'CS'); if (this.selected === 'bp') return this.filtered.filter(item => item.opportunityType === 'BP'); return this.filtered; }
  get unmappedCountries(): Slice[] { return this.countrySlices.filter(item => !this.mapBubbles.some(bubble => bubble.key === item.key)); }
  get maxCountry(): number { return Math.max(1, ...this.countrySlices.map(item => item.count)); }
  get maxValue(): number { return Math.max(1, ...this.activeSlices.map(item => item.value)); }
  get activeSlices(): Slice[] { return this.selected === 'value' ? this.valueSlices : this.selected === 'tf' ? this.tfSlices : this.selected === 'resale' ? this.resaleSlices : this.countrySlices; }
  total(field: keyof CrmOpportunity): number { return this.filtered.reduce((sum, item) => sum + (Number(item[field]) || 0), 0); }
  money(value: number, currency = 'EUR'): string { return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0); }
  percent(value: number, slices: Slice[]): number { const total = slices.reduce((sum, item) => sum + item.value, 0); return total ? value / total * 100 : 0; }
  donutGradient(slices: Slice[]): string { const total = slices.reduce((sum, item) => sum + item.value, 0); if (!total) return '#f0f2f7 0 100%'; let start = 0; return slices.map(item => { const end = start + item.value / total * 100; const part = `${item.color} ${start}% ${end}%`; start = end; return part; }).join(', '); }
  exportExcel(): void {
    const rows = this.exportRows();
    const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Message: 'No data matches the selected filters.' }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${this.exportName()}.xlsx`);
  }
  exportPdf(): void { window.print(); }
  private exportRows(): Record<string, string | number>[] {
    if (this.selected === 'equipment') return this.equipmentDetails.map(row => ({ Opportunity: row.opportunity, Account: row.account || '', Type: row.opportunityType || '', Stage: row.stage || '', Equipment: row.equipmentName, Code: row.equipmentCode, 'Total units': row.quantity }));
    if (this.selected === 'shipment') return this.shipmentDetails.map(row => ({ Opportunity: row.opportunity, Account: row.account || '', Stage: row.stage || '', Equipment: row.equipmentName, Qty: row.quantity, 'Shipment date': row.shipmentDate }));
    if (this.selected === 'map' || this.selected === 'country') return this.countrySlices.map(row => ({ Country: row.key, Opportunities: row.count, Value: row.value }));
    if (this.selected === 'value' || this.selected === 'tf' || this.selected === 'resale') return this.activeSlices.map(row => ({ Category: row.key, Value: row.value, Percentage: this.percent(row.value, this.activeSlices) }));
    if (this.selected === 'expected') return this.expectedMonths.map(row => ({ Month: row.key, Year: this.year, Opportunities: row.count, 'Expected revenue': row.value }));
    const source = this.selected === 'cs' || this.selected === 'bp' || this.selected === 'monthly' ? this.projectRows : this.filtered;
    return source.map(item => ({ Opportunity: item.name, Account: item.accountName || '', Owner: item.ownerName || '', Type: item.opportunityType || '', Stage: item.stageName || '', Value: item.value || 0, Discount: item.discount || 0, Currency: item.currency, Probability: item.probability, 'Expected revenue': this.expectedRevenue(item), 'Closing date': item.closingDate || '', 'Shipment date': item.shipmentDate || '' }));
  }
  private exportName(): string { return `projectum-${(this.selectedCard?.title || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`; }
  private group(items: CrmOpportunity[], key: (item: CrmOpportunity) => string): Slice[] { const result = new Map<string, Slice>(); items.forEach(item => { const name = key(item); const current = result.get(name) || { key: name, value: 0, count: 0, color: this.palette[result.size % this.palette.length] }; current.value += item.value || 0; current.count++; result.set(name, current); }); return [...result.values()].sort((a, b) => b.value - a.value); }
  private fixedSlices(values: Array<[string, number]>): Slice[] { return values.map(([key, value], index) => ({ key, value, count: 0, color: this.palette[index + 1] })); }
  expectedRevenue(item: CrmOpportunity): number { return item.expectedRevenue ?? (item.value || 0) * (1 - (item.discount || 0) / 100) * item.probability / 100; }
  private localDate(value: string): Date { const [year, month, day] = value.slice(0, 10).split('-').map(Number); return new Date(year, month - 1, day); }
  private attachMap(canvas: HTMLCanvasElement): void {
    this.renderedCanvas = canvas; this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => this.drawWorldMap()); this.resizeObserver.observe(canvas.parentElement as Element);
    this.loadMapData();
  }
  private loadMapData(): void {
    if (this.mapFeatures.length) { this.drawWorldMap(); return; }
    const countries = topojsonFeature(worldAtlas as any, (worldAtlas as any).objects.countries) as any;
    this.mapFeatures = countries.features || [];
    this.mapLoading = false;
    this.drawWorldMap();
  }
  private drawWorldMap(): void {
    const canvas = this.renderedCanvas; if (!canvas || !this.mapFeatures.length) return;
    const width = Math.max(320, canvas.parentElement?.clientWidth || 720); const height = Math.round(width / 2);
    canvas.width = width; canvas.height = height; canvas.style.height = `${height}px`;
    const context = canvas.getContext('2d'); if (!context) return;
    context.fillStyle = '#bfdbfe'; context.fillRect(0, 0, width, height);
    this.mapFeatures.forEach(feature => this.drawFeature(context, feature, width, height));
    const bubbles: Array<Slice & { left: number; top: number }> = [];
    this.countrySlices.forEach(slice => { const country = this.countries.canonical(slice.key); const feature = this.mapFeatures.find(value => this.countries.canonical(this.featureName(value)) === country); if (!feature) return; const [longitude, latitude] = this.featureCentre(feature); const [x, y] = this.projectEquirectangular(longitude, latitude, width, height); bubbles.push({ ...slice, left: x / width * 100, top: y / height * 100 }); });
    this.mapBubbles = bubbles; this.mapMessage = bubbles.length || !this.countrySlices.length ? '' : 'No stored countries could be matched to world map data.';
  }
  private drawFeature(context: CanvasRenderingContext2D, feature: any, width: number, height: number): void {
    const polygons = feature.geometry?.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry?.coordinates || [];
    context.fillStyle = '#d1fae5'; context.strokeStyle = '#6ee7b7'; context.lineWidth = .45;
    polygons.forEach((polygon: any[]) => polygon.forEach(ring => { context.beginPath(); ring.forEach((point: number[], index: number) => { const projected = this.projectEquirectangular(point[0], point[1], width, height); if (index) context.lineTo(projected[0], projected[1]); else context.moveTo(projected[0], projected[1]); }); context.closePath(); context.fill(); context.stroke(); }));
  }
  /** Standard geographic equirectangular projection fitted to the 2:1 map viewport. */
  private projectEquirectangular(longitude: number, latitude: number, width: number, height: number): [number, number] { return [(longitude + 180) / 360 * width, (90 - Math.max(-90, Math.min(90, latitude))) / 180 * height]; }
  private featureCentre(feature: any): [number, number] { const polygons = feature.geometry?.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry?.coordinates || []; let largest: number[][] | undefined; let largestArea = 0; polygons.forEach((polygon: number[][][]) => { const ring = polygon[0]; const area = Math.abs(this.ringArea(ring)); if (area > largestArea) { largest = ring; largestArea = area; } }); return largest ? this.ringCentroid(largest) : [0, 0]; }
  private ringArea(ring: number[][]): number { return ring.reduce((sum, point, index) => { const next = ring[(index + 1) % ring.length]; return sum + point[0] * next[1] - next[0] * point[1]; }, 0) / 2; }
  private ringCentroid(ring: number[][]): [number, number] { const area = this.ringArea(ring); if (!area) return ring[0] ? [ring[0][0], ring[0][1]] : [0, 0]; const [x, y] = ring.reduce(([sumX, sumY], point, index) => { const next = ring[(index + 1) % ring.length]; const cross = point[0] * next[1] - next[0] * point[1]; return [sumX + (point[0] + next[0]) * cross, sumY + (point[1] + next[1]) * cross]; }, [0, 0]); return [x / (6 * area), y / (6 * area)]; }
  private featureName(feature: any): string { return feature.properties?.name || feature.properties?.NAME || ''; }
}
