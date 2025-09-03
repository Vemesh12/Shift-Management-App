import { Component, Input, OnInit, OnChanges, Output, EventEmitter } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Shift } from '../../models/shift.model';
import { BlockedTime } from '../../models/blocked-time.model';
import { MatSnackBar } from '@angular/material/snack-bar';

interface CalendarDay {
  date: Date;
  shifts: Shift[];
  blockedTimes: BlockedTime[];
  isToday: boolean;
  isCurrentMonth: boolean;
  isBlocked: boolean;
}

@Component({
  selector: 'app-calendar-view',
  templateUrl: './calendar-view.component.html',
  styleUrls: ['./calendar-view.component.css']
})
export class CalendarViewComponent implements OnInit, OnChanges {
  @Input() userId: string = '';
  @Output() shiftEditRequest = new EventEmitter<Shift>();

  currentDate = new Date();
  calendarDays: CalendarDay[] = [];
  shifts: Shift[] = [];
  blockedTimes: BlockedTime[] = [];
  isLoading = false;
  editingShiftId: string | null = null;

  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    if (this.userId) {
      this.loadCalendarData();
    }
  }

  ngOnChanges(): void {
    if (this.userId) {
      this.loadCalendarData();
    }
  }

  loadCalendarData(forceRefresh: boolean = false): void {
    this.isLoading = true;
    this.apiService.getCalendarData(this.userId, forceRefresh).subscribe({
      next: (data) => {
        // Filter out deleted shifts (soft delete)
  this.shifts = (data.shifts || []).filter((shift: any) => !shift.deleted);
        this.blockedTimes = data.blockedTimes || [];
        this.generateCalendar();
        this.isLoading = false;
      },
      error: (error) => {
        this.snackBar.open('Error loading calendar data: ' + error.message, 'Close', {
          duration: 5000
        });
        this.isLoading = false;
      }
    });
  }

  generateCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const today = new Date();
    
    // Get first day of month and calculate starting date
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Generate 42 days (6 weeks)
    this.calendarDays = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayShifts = this.shifts.filter(shift => 
        this.isSameDay(new Date(shift.date), date)
      );
      
      const dayBlockedTimes = this.blockedTimes.filter(blocked => 
        this.isSameDay(new Date(blocked.date), date)
      );
      
      const isBlocked = dayBlockedTimes.length > 0;
      
      this.calendarDays.push({
        date: new Date(date),
        shifts: dayShifts,
        blockedTimes: dayBlockedTimes,
        isToday: this.isSameDay(date, today),
        isCurrentMonth: date.getMonth() === month,
        isBlocked: isBlocked
      });
    }
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  isDateBlocked(date: Date): boolean {
    return this.blockedTimes.some(blocked => 
      this.isSameDay(new Date(blocked.date), date)
    );
  }

  editShift(shift: Shift): void {
    this.editingShiftId = shift._id || null;
    // Emit event to parent component to open edit form
    this.shiftEditRequest.emit(shift);
  }

  previousMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.generateCalendar();
  }

  goToToday(): void {
    this.currentDate = new Date();
    this.generateCalendar();
  }

  deleteShift(shiftId: string): void {
    if (confirm('Are you sure you want to delete this shift?')) {
      this.apiService.deleteShift(shiftId, this.userId).subscribe({
        next: () => {
          this.snackBar.open('Shift deleted successfully!', 'Close', {
            duration: 3000
          });
          this.loadCalendarData();
        },
        error: (error) => {
          this.snackBar.open('Error deleting shift: ' + error.message, 'Close', {
            duration: 5000
          });
        }
      });
    }
  }

  deleteBlockedTime(blockedTimeId: string): void {
    if (confirm('Are you sure you want to unblock this day?')) {
      this.apiService.deleteBlockedTime(blockedTimeId, this.userId).subscribe({
        next: () => {
          this.snackBar.open('Blocked day deleted successfully!', 'Close', {
            duration: 3000
          });
          this.loadCalendarData();
        },
        error: (error) => {
          this.snackBar.open('Error deleting blocked day: ' + error.message, 'Close', {
            duration: 5000
          });
        }
      });
    }
  }

  getMonthYearString(): string {
    return this.currentDate.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  }

  getDayClass(day: CalendarDay): string {
    let classes = 'calendar-day';
    if (day.isToday) classes += ' today';
    if (day.isBlocked) classes += ' blocked-day';
    if (day.shifts.length > 0 && !day.isBlocked) day.shifts.forEach(shift => {
      classes += ' has-shifts';
    });
    if (!day.isCurrentMonth) classes += ' other-month';
    return classes;
  }
}
