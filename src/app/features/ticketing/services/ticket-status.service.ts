import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/config/api.config';
import { STATUS_PALETTE, StatusColor, TicketStatusDef, TicketStatusRequest } from '../models/ticket.models';

const EMPTY: TicketStatusDef[] = [];

/**
 * Ticket statuses of the organisation (Ticketing settings > Statuses), shared by every ticketing page.
 * There are no built-in statuses: lists, filters and badges only show what leads created.
 * All statuses (inactive ones included) are kept for labels of older tickets; `active` feeds the dropdowns.
 */
@Injectable({ providedIn: 'root' })
export class TicketStatusService {
  private readonly base = `${API_BASE_URL}/tickets`;
  private readonly source = new BehaviorSubject<TicketStatusDef[] | null>(null);
  readonly statuses$ = this.source.asObservable();
  private requested = false;
  private activeCache: { key: unknown; list: TicketStatusDef[] } = { key: undefined, list: [] };

  constructor(private http: HttpClient) {}

  /** Loads the statuses once (TicketSettingsService.refresh also feeds them). */
  load(force = false): void {
    if (this.requested && !force) return;
    this.requested = true;
    this.refresh().subscribe({ error: () => { this.requested = false; } });
  }

  refresh(): Observable<TicketStatusDef[]> {
    return this.http.get<TicketStatusDef[]>(`${this.base}/statuses`).pipe(tap(list => this.set(list)));
  }

  /** Called with the statuses of GET /tickets/settings. */
  set(list: TicketStatusDef[] | null | undefined): void {
    this.requested = true;
    this.source.next([...(list ?? [])].sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id));
  }

  /** Every status in display order (stable array reference, safe in *ngFor). */
  get all(): TicketStatusDef[] { return this.source.value ?? EMPTY; }

  /** Active statuses, offered in dropdowns and filters (cached per loaded list). */
  get active(): TicketStatusDef[] {
    const all = this.source.value;
    if (this.activeCache.key !== all) this.activeCache = { key: all, list: (all ?? EMPTY).filter(s => s.active) };
    return this.activeCache.list;
  }

  get defaultStatus(): TicketStatusDef | undefined { return this.all.find(s => s.isDefault); }

  byCode(code: string | null | undefined): TicketStatusDef | undefined { return code ? this.all.find(s => s.code === code) : undefined; }
  byId(id: number | null | undefined): TicketStatusDef | undefined { return id == null ? undefined : this.all.find(s => s.id === id); }

  label(code: string | null | undefined): string { return this.byCode(code)?.name ?? (code ? humanizeCode(code) : ''); }
  color(code: string | null | undefined): string { return this.byCode(code)?.color ?? 'gray'; }
  isClosed(code: string | null | undefined): boolean { return !!this.byCode(code)?.isClosed; }

  // ---------- changes (support leads) ----------
  create(r: TicketStatusRequest): Observable<TicketStatusDef> { return this.http.post<TicketStatusDef>(`${this.base}/settings/statuses`, r).pipe(tap(() => this.load(true))); }
  update(id: number, r: TicketStatusRequest): Observable<TicketStatusDef> { return this.http.put<TicketStatusDef>(`${this.base}/settings/statuses/${id}`, r).pipe(tap(() => this.load(true))); }
  reorder(ids: number[]): Observable<TicketStatusDef[]> { return this.http.put<TicketStatusDef[]>(`${this.base}/settings/statuses/order`, { ids }).pipe(tap(list => this.set(list))); }
  /** Without reassignTo a status in use answers 409 { code: 'STATUS_IN_USE', ticketCount }. */
  delete(id: number, reassignTo?: number | null): Observable<void> {
    const params = reassignTo ? new HttpParams().set('reassignTo', reassignTo) : undefined;
    return this.http.delete<void>(`${this.base}/settings/statuses/${id}`, { params }).pipe(tap(() => this.load(true)));
  }
}

/** True for one of the palette names (CSS classes c-blue, c-amber, ...); otherwise the colour is a #RRGGBB value. */
export function isPaletteColor(color: string | null | undefined): color is StatusColor { return !!color && (STATUS_PALETTE as string[]).includes(color); }

/** Inline style for a #RRGGBB status colour: tinted background, coloured text and border. Null for palette colours. */
export function hexStatusStyle(color: string | null | undefined): Record<string, string> | null {
  if (!color || isPaletteColor(color) || !/^#[0-9a-fA-F]{6}$/.test(color)) return null;
  return { background: color + '22', color, 'box-shadow': 'inset 0 0 0 1px ' + color + '55' };
}

function humanizeCode(v: string): string { return v.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()); }
