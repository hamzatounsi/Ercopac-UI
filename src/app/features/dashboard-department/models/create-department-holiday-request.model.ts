export interface CreateDepartmentHolidayRequest {
  memberId: number;
  fromDate: string;
  toDate: string;
  note: string | null;
}