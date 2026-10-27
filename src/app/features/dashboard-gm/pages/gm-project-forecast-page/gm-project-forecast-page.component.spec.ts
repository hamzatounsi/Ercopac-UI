import { GmProjectForecastPageComponent } from './gm-project-forecast-page.component';

describe('Forecast views and scrolling', () => {
  let component: GmProjectForecastPageComponent;
  beforeEach(() => {
    component = new GmProjectForecastPageComponent({} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  });

  it('opens in Week and retains the Month switch', () => {
    spyOn(component, 'loadData');
    expect(component.viewMode).toBe('week');
    expect(component.periodType).toBe('week');
    component.setViewMode('month');
    expect(component.viewMode).toBe('month');
    expect(component.periodType).toBe('month');
    component.setViewMode('week');
    expect(component.viewMode).toBe('week');
  });

  it('synchronizes rows and each pane header independently', () => {
    const element = (top = 0, left = 0) => ({ nativeElement: { scrollTop: top, scrollLeft: left } } as any);
    component.wbsBody = element(86, 140);
    component.calBody = element(0, 228);
    component.wbsHeader = element();
    component.calHeader = element();
    component.onWbsScroll(new Event('scroll'));
    component.onCalScroll(new Event('scroll'));
    expect(component.calBody.nativeElement.scrollTop).toBe(86);
    expect(component.wbsHeader.nativeElement.scrollLeft).toBe(140);
    expect(component.calHeader.nativeElement.scrollLeft).toBe(228);
  });

  const row = (id: number, parentId: number | null, extra: any = {}) => ({
    financeEntryId: id, parentId, wbsCode: `W${id}`, description: `Row ${id}`, level: 1, rowType: 'COST',
    budget: 0, actualCost: 0, totalForecast: 0, periods: [], ...extra
  } as any);

  it('displays the remaining forecast calculated by the backend without recalculating it', () => {
    const hours = row(2, 1, { rowType: 'HOUR', leaf: true, totalForecast: 10, hourRate: 50, remainingForecastCost: 500 });
    const parent = row(1, null, { leaf: false, totalForecast: 500, remainingForecastCost: 500 });
    component.rows = [parent, hours];
    expect(component.formatRemainingOrHours(hours)).toBe(component.formatMoney(500));
    expect(component.formatTotalForecast(hours)).toBe('10h');
    expect(component.formatTotalForecast(parent)).toBe(component.formatMoney(500));
  });

  it('offers Delete forecast entry only on leaf rows with a forecast for users with write permission', () => {
    const leaf = row(2, 1, { leaf: true, totalForecast: 500 });
    const parent = row(1, null, { leaf: false, totalForecast: 500 });
    component.rows = [parent, leaf];
    component.canWriteForecast = false;
    expect(component.canDeleteForecastEntry(leaf)).toBeFalse();
    component.canWriteForecast = true;
    expect(component.canDeleteForecastEntry(leaf)).toBeTrue();
    expect(component.canDeleteForecastEntry(parent)).toBeFalse();
    expect(component.canDeleteForecastEntry(row(3, 1, { leaf: true, totalForecast: 0 }))).toBeFalse();
  });

  it('deletes the forecast entry after confirmation and reloads the totals', () => {
    const deleteForecastEntry = jasmine.createSpy('deleteForecastEntry').and.returnValue({ subscribe: (o: any) => o.next() });
    component = new GmProjectForecastPageComponent({} as any, {} as any, { deleteForecastEntry } as any, {} as any, {} as any, {} as any);
    component.projectId = 7;
    component.canWriteForecast = true;
    const leaf = row(2, 1, { leaf: true, totalForecast: 500 });
    component.rows = [leaf];
    spyOn(component, 'loadData');
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);

    component.deleteForecastEntry(leaf);
    expect(deleteForecastEntry).not.toHaveBeenCalled();

    confirmSpy.and.returnValue(true);
    component.deleteForecastEntry(leaf);
    expect(confirmSpy.calls.mostRecent().args[0]).toContain('Delete forecast entry');
    expect(confirmSpy.calls.mostRecent().args[0]).toContain('The WBS node itself stays');
    expect(deleteForecastEntry).toHaveBeenCalledWith(7, 2);
    expect(component.loadData).toHaveBeenCalled();
  });
});
