export type SortDirection = 'asc' | 'desc';

export interface ClientTableConfig<T, K extends string> {
  /** Values compared when sorting by each column key. */
  sortValue: Record<K, (row: T) => string | number | null | undefined>;
  /** Text searched by the global search box. */
  searchText: (row: T) => string;
  initialSort: K;
  initialDirection?: SortDirection;
  pageSize?: number;
}

/**
 * Search, filters, sorting and pagination for small in-memory tables (My Department lists).
 * Filters are predicates registered by name, so each table decides what "status" or "type" means.
 */
export class ClientTable<T, K extends string> {
  readonly pageSizes = [10, 25, 50];

  search = '';
  sort: K;
  direction: SortDirection;
  page = 0;
  pageSize: number;

  private rows: T[] = [];
  private filters = new Map<string, (row: T) => boolean>();
  private filtered: T[] = [];

  constructor(private readonly config: ClientTableConfig<T, K>) {
    this.sort = config.initialSort;
    this.direction = config.initialDirection ?? 'asc';
    this.pageSize = config.pageSize ?? 10;
  }

  setRows(rows: T[]): void {
    this.rows = rows ?? [];
    this.refresh(false);
  }

  setSearch(value: string): void {
    this.search = value ?? '';
    this.refresh(true);
  }

  /** Adds, replaces or (with null) removes a named filter. */
  setFilter(name: string, predicate: ((row: T) => boolean) | null): void {
    if (predicate) {
      this.filters.set(name, predicate);
    } else {
      this.filters.delete(name);
    }
    this.refresh(true);
  }

  clearFilters(): void {
    this.search = '';
    this.filters.clear();
    this.refresh(true);
  }

  get hasFilters(): boolean {
    return !!this.search.trim() || this.filters.size > 0;
  }

  setSort(key: K): void {
    if (this.sort === key) {
      this.direction = this.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sort = key;
      this.direction = 'asc';
    }
    this.refresh(false);
  }

  ariaSort(key: K): 'ascending' | 'descending' | 'none' {
    if (this.sort !== key) {
      return 'none';
    }
    return this.direction === 'asc' ? 'ascending' : 'descending';
  }

  sortIcon(key: K): string {
    if (this.sort !== key) {
      return 'unfold_more';
    }
    return this.direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  setPageSize(value: number | string): void {
    const size = Number(value);
    this.pageSize = this.pageSizes.includes(size) ? size : this.pageSize;
    this.page = 0;
  }

  previousPage(): void {
    this.page = Math.max(0, this.page - 1);
  }

  nextPage(): void {
    this.page = Math.min(this.pageCount - 1, this.page + 1);
  }

  /** Rows of the current page. */
  get view(): T[] {
    const start = this.page * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get total(): number {
    return this.filtered.length;
  }

  get totalUnfiltered(): number {
    return this.rows.length;
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get rangeStart(): number {
    return this.total === 0 ? 0 : this.page * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.total, (this.page + 1) * this.pageSize);
  }

  private refresh(resetPage: boolean): void {
    const query = this.search.trim().toLocaleLowerCase();
    const predicates = [...this.filters.values()];
    const accessor = this.config.sortValue[this.sort];
    const factor = this.direction === 'asc' ? 1 : -1;

    this.filtered = this.rows
      .filter(row => !query || this.config.searchText(row).toLocaleLowerCase().includes(query))
      .filter(row => predicates.every(predicate => predicate(row)))
      .sort((a, b) => compareRows(accessor(a), accessor(b), factor));

    if (resetPage || this.page >= this.pageCount) {
      this.page = resetPage ? 0 : Math.max(0, this.pageCount - 1);
    }
  }
}

/** Empty values always go last; the direction factor only applies to real values. */
function compareRows(a: string | number | null | undefined, b: string | number | null | undefined, factor: number): number {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty || bEmpty) {
    return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return factor * (a - b);
  }
  return factor * String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}
