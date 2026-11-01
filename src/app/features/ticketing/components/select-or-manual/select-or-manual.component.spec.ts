import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { SelectOrManualComponent } from './select-or-manual.component';

describe('SelectOrManualComponent', () => {
  let component: SelectOrManualComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FormsModule], declarations: [SelectOrManualComponent] });
    component = TestBed.createComponent(SelectOrManualComponent).componentInstance;
    component.options = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, label: `Customer ${i + 1}`, hint: i === 0 ? 'ACME' : undefined }));
  });

  it('offers a search box for long lists and filters by label or hint', () => {
    expect(component.searchable).toBeTrue();
    component.query = 'acme';
    expect(component.filtered.map(o => o.id)).toEqual([1]);
  });

  it('keeps the current choice visible when the search or the list no longer contains it', () => {
    component.selectedId = 5;
    component.query = 'Customer 1';
    expect(component.pinned?.label).toBe('Customer 5');

    component.query = '';
    component.selectedId = 99;
    component.selectedLabel = 'Archived customer';
    expect(component.pinned?.label).toBe('Archived customer');
  });

  it('shows loading, error and empty states in the placeholder', () => {
    component.loading = true;
    expect(component.placeholder).toBe('Loading…');
    component.loading = false;
    component.error = 'boom';
    expect(component.placeholder).toBe('List unavailable');
    component.error = '';
    component.options = [];
    component.emptyText = 'No customers yet';
    expect(component.placeholder).toBe('No customers yet');
  });

  it('switches between linked and manual entry', () => {
    const modes: boolean[] = [];
    component.manualChange.subscribe(m => modes.push(m));
    component.toggle();
    component.manual = true;
    component.toggle();
    expect(modes).toEqual([true, false]);
  });
});
