export interface Shift {
  _id?: string;
  userId: string;
  date: Date;
  fromTime: string;
  toTime: string;
  deleted?: boolean;
}
