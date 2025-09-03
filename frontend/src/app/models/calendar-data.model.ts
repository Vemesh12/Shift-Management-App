import { Shift } from './shift.model';
import { BlockedTime } from './blocked-time.model';

export interface CalendarData {
  shifts: Shift[];
  blockedTimes: BlockedTime[];
}
