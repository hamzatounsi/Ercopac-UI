import * as XLSX from 'xlsx';

export const MAX_SPREADSHEET_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_SPREADSHEET_SHEETS = 20;
export const MAX_SPREADSHEET_ROWS = 10000;

export function assertSpreadsheetFile(file: File, allowedExtensions: readonly string[]): void {
  const name = file.name.toLowerCase();
  if (!allowedExtensions.some(extension => name.endsWith(extension))) {
    throw new Error('Invalid or unsupported spreadsheet file.');
  }
  if (file.size <= 0 || file.size > MAX_SPREADSHEET_FILE_SIZE_BYTES) {
    throw new Error('Spreadsheet file must be between 1 byte and 5 MB.');
  }
}

export function assertValidWorkbook(workbook: XLSX.WorkBook): string {
  if (!workbook || !Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
    throw new Error('Invalid or unsupported spreadsheet file.');
  }
  if (workbook.SheetNames.length > MAX_SPREADSHEET_SHEETS || !workbook.Sheets) {
    throw new Error('Spreadsheet contains too many worksheets.');
  }
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName || !workbook.Sheets[firstSheetName]) {
    throw new Error('Invalid or unsupported spreadsheet file.');
  }
  return firstSheetName;
}

export function assertSpreadsheetRowLimit(rows: readonly unknown[]): void {
  if (rows.length > MAX_SPREADSHEET_ROWS) {
    throw new Error('Spreadsheet contains more than 10,000 rows.');
  }
}
