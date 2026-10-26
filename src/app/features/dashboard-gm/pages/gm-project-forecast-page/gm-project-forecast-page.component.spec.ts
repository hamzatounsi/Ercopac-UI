import { GmProjectForecastPageComponent } from './gm-project-forecast-page.component';

describe('Forecast views and scrolling', () => {
  let component: GmProjectForecastPageComponent;
  beforeEach(() => {
    component = new GmProjectForecastPageComponent({} as any, {} as any, {} as any, {} as any, {} as any);
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
});
