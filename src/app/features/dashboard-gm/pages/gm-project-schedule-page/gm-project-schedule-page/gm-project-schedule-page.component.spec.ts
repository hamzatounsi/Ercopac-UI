import { of, throwError } from 'rxjs';
import { GmProjectSchedulePageComponent } from './gm-project-schedule-page.component';
import { GmProjectScheduleTask } from '../../../models/gm-project-schedule-task.model';

describe('Gantt display and name editing regressions', () => {
  let component: GmProjectSchedulePageComponent;

  beforeEach(() => {
    const dependencies = Array.from({ length: 13 }, () => ({}));
    dependencies[9] = { getCurrentUserId: () => 7 };
    component = new GmProjectSchedulePageComponent(
      ...dependencies as ConstructorParameters<typeof GmProjectSchedulePageComponent>
    );
    component.projectId = 1;
  });

  it('defaults to Actual when opening a project without saved preferences', () => {
    spyOn(localStorage, 'getItem').and.returnValue(null);
    expect(component.activeMode).toBe('actual');
    component.activeMode = 'baseline';
    component.projectId = 2;
    component['restoreGanttDisplayPreferences']();
    expect(component.activeMode).toBe('actual');
  });

  it('restores only the current project preference and still permits switching', () => {
    spyOn(localStorage, 'getItem').and.callFake(key => key.endsWith(':1')
      ? JSON.stringify({ version: 1, activeMode: 'baseline' }) : null);
    spyOn(localStorage, 'setItem');
    component['restoreGanttDisplayPreferences']();
    expect(component.activeMode).toBe('baseline');
    component.setMode('actual');
    expect(component.activeMode).toBe('actual');
    component.setMode('baseline');
    expect(component.activeMode).toBe('baseline');
    component.projectId = 2;
    component['restoreGanttDisplayPreferences']();
    expect(component.activeMode).toBe('actual');
  });

  it('uses the row center for activity, summary and milestone anchors', () => {
    expect(component.activityBarTop + component.activityBarHeight / 2).toBe(component.rowHeight / 2);
    expect(component.summaryBarTop + component.summaryBarHeight / 2).toBe(component.rowHeight / 2);
    expect(component.milestoneTop + component.milestoneSize / 2).toBe(component.rowHeight / 2);
  });

  it('saves a long name through the existing update path only once', () => {
    const task = { id: 1, name: 'Original' } as GmProjectScheduleTask;
    const update = spyOn(component, 'updateLocalTaskField');
    const save = spyOn(component, 'saveInlineTask');
    const name = 'A long activity name covering engineering, procurement and commissioning';
    component.beginInlineNameEdit(task);
    component.updateInlineNameDraft(task, name);
    component.nameEditorTask = task;
    component.closeNameEditor(true);
    component.closeNameEditor(true);
    expect(update).toHaveBeenCalledOnceWith(task, 'name', name, false);
    expect(save).toHaveBeenCalledOnceWith(task);
  });

  it('cancels a draft without mutating or saving the task', () => {
    const task = { id: 1, name: 'Original' } as GmProjectScheduleTask;
    const save = spyOn(component, 'saveInlineTask');
    component.beginInlineNameEdit(task);
    component.updateInlineNameDraft(task, 'Unsaved change');
    component.nameEditorTask = task;
    component.closeNameEditor(false);
    expect(component.getInlineNameValue(task)).toBe('Original');
    expect(save).not.toHaveBeenCalled();
  });

  it('retains the original name when an empty draft is submitted', () => {
    const task = { id: 1, name: 'Original' } as GmProjectScheduleTask;
    const save = spyOn(component, 'saveInlineTask');
    component.beginInlineNameEdit(task);
    component.updateInlineNameDraft(task, '   ');
    component.nameEditorTask = task;
    component.closeNameEditor(true);
    expect(component.getInlineNameValue(task)).toBe('Original');
    expect(save).not.toHaveBeenCalled();
  });

  it('keeps both horizontal headers current during consecutive pane scrolls', () => {
    const element = (top = 0, left = 0) => ({ nativeElement: { scrollTop: top, scrollLeft: left } } as any);
    component.tableBodyScroll = element(70, 120);
    component.ganttBodyScroll = element(0, 250);
    component.leftHeaderScroll = element();
    component.monthHeaderScroll = element();
    component.timelineHeaderScroll = element();
    component.onTableScroll();
    component.onGanttScroll();
    expect(component.ganttBodyScroll.nativeElement.scrollTop).toBe(70);
    expect(component.leftHeaderScroll.nativeElement.scrollLeft).toBe(120);
    expect(component.monthHeaderScroll.nativeElement.scrollLeft).toBe(250);
    expect(component.timelineHeaderScroll.nativeElement.scrollLeft).toBe(250);
    component.ganttBodyScroll.nativeElement.scrollTop = 140;
    component.onGanttScroll();
    expect(component.tableBodyScroll.nativeElement.scrollTop).toBe(140);
  });

  it('rejects impossible dates and reversed ranges before normalization', () => {
    expect(() => component['importDate']('2026-02-30', 1)).toThrowError(/date is invalid/);
    expect(() => component['toImportedTaskPayload']({ Name: 'Task', WBS: '1', Start: '2026-10-23', End: '2026-10-20' }, 0))
      .toThrowError(/end date cannot be before/);
    expect(component['importDate']('2024-02-29', 1)).toBe('2024-02-29');
  });

  it('validates JSON task objects and enforces the row limit', async () => {
    await expectAsync(component['readImportRows'](new File(['[null]'], 'tasks.json')))
      .toBeRejectedWithError(/JSON object/);
    await expectAsync(component['readImportRows'](new File([JSON.stringify(Array(10001).fill({ Name: 'Task' }))], 'tasks.json')))
      .toBeRejectedWithError(/10,000/);
  });

  it('reads legacy HTML XLS and real Excel files with the same mapping', async () => {
    const html = '<table><tr><th>Task</th><th>WBS</th></tr><tr><td>Design</td><td>1</td></tr></table>';
    const rows = await component['readImportRows'](new File([html], 'tasks.xls'));
    expect(rows[0]['Task']).toBe('Design');
    const XLSX = await import('xlsx');
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet([{ Task: 'Build', WBS: '1' }]), 'Tasks');
    const data = XLSX.write(book, { type: 'array', bookType: 'xlsx' });
    const excelRows = await component['readImportRows'](new File([data], 'tasks.xlsx'));
    expect(excelRows[0]['Task']).toBe('Build');
  });

  it('exports an importable Excel workbook with hierarchy, dates, type and progress', async () => {
    component.exportScope = 'ALL';
    component.tasks = [
      { id: 1, wbsCode: '1', name: 'Summary', taskType: 'SUMMARY', plannedStart: '2026-10-20', plannedEnd: '2026-10-23' },
      { id: 2, wbsCode: '1.1', name: 'Design', taskType: 'ACTIVITY', plannedStart: '2026-10-20',
        plannedEnd: '2026-10-22', baselineStart: '2026-10-19', baselineEnd: '2026-10-23', percentComplete: 40 }
    ] as GmProjectScheduleTask[];
    const download = spyOn<any>(component, 'downloadBlob');
    component.exportAsExcelCsv();
    expect(download.calls.mostRecent().args[1]).toMatch(/\.xlsx$/);
    const blob = download.calls.mostRecent().args[0] as Blob;
    const rows = await component['readImportRows'](new File([blob], 'schedule.xlsx'));
    expect(rows.map(row => row['WBS'])).toEqual(['1', '1.1']);
    expect(rows[1]['Task Name']).toBe('Design');
    expect(rows[1]['Type']).toBe('ACTIVITY');
    expect(rows[1]['Start Date']).toBe('2026-10-20');
    expect(rows[1]['Baseline Start']).toBe('2026-10-19');
    expect(rows[1]['Progress']).toBe(40);
  });

  it('rejects duplicate WBS codes before sending an import', () => {
    spyOn<any>(component, 'toImportedTaskPayload').and.returnValue({ name: 'Task', wbsCode: '1' });
    expect(() => component['prepareImportedTasks']([{}, {}])).toThrowError(/duplicate WBS/);
  });

  it('blocks another file submission while an import is pending', async () => {
    component.saving = true;
    const read = spyOn<any>(component, 'readImportRows');
    await component.importScheduleFile({ target: { files: [new File(['[]'], 'tasks.json')] } } as any);
    expect(read).not.toHaveBeenCalled();
  });

  it('sends the mapped import once and reloads after success', async () => {
    const payload = [{ name: 'Design', taskType: 'ACTIVITY' }];
    const request = jasmine.createSpy().and.returnValue(of([{ id: 1 }]));
    component['service'] = { importSchedule: request } as any;
    spyOn<any>(component, 'readImportRows').and.resolveTo([{ Name: 'Design' }]);
    spyOn<any>(component, 'prepareImportedTasks').and.returnValue(payload);
    const reload = spyOn(component, 'loadSchedule');
    const input = { files: [new File(['[]'], 'tasks.json')], value: 'tasks.json' };
    await component.importScheduleFile({ target: input } as any);
    expect(request).toHaveBeenCalledOnceWith(1, payload);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(component.saving).toBeFalse();
    expect(component.importStatus).toBe('1 task imported.');
    expect(input.value).toBe('');
  });

  it('releases the busy state and shows backend validation errors without reloading', async () => {
    component['service'] = { importSchedule: () => throwError(() => ({ error: { message: 'Invalid department' } })) } as any;
    spyOn<any>(component, 'readImportRows').and.resolveTo([{}]);
    spyOn<any>(component, 'prepareImportedTasks').and.returnValue([{ name: 'Design' }]);
    const reload = spyOn(component, 'loadSchedule');
    spyOn(window, 'alert');
    spyOn(console, 'error');
    await component.importScheduleFile({ target: { files: [new File(['[]'], 'tasks.json')], value: '' } } as any);
    expect(component.saving).toBeFalse();
    expect(window.alert).toHaveBeenCalledWith('Invalid department');
    expect(reload).not.toHaveBeenCalled();
  });
});
