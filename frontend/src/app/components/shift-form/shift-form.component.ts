import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BlockedTime } from '../../models/blocked-time.model';
import { Shift } from '../../models/shift.model';

@Component({
  selector: 'app-shift-form',
  templateUrl: './shift-form.component.html',
  styleUrls: ['./shift-form.component.css']
})
export class ShiftFormComponent implements OnInit, OnChanges {
  @Input() userId: string = '';
  @Input() editingShift: Shift | null = null;
  @Output() editComplete = new EventEmitter<void>();
  
  shiftForm: FormGroup;
  isSubmitting = false;
  blockedTimes: BlockedTime[] = [];
  shifts: Shift[] = [];
  editingShiftId: string | null = null;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) {
    this.shiftForm = this.fb.group({
      date: ['', Validators.required],
      fromTime: ['', Validators.required],
      toTime: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Set default date to today only when not editing
    if (!this.isEditMode && !this.editingShift) {
      this.shiftForm.patchValue({
        date: new Date()
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Only update form when editingShift changes, do not reload data
    if (changes['editingShift']) {
      if (changes['editingShift'].currentValue) {
        // Start editing mode - this will set the correct date
        console.log('ngOnChanges - editingShift changed to:', changes['editingShift'].currentValue);
        this.startEditing(changes['editingShift'].currentValue);
      } else {
        // Clear editing mode
        console.log('ngOnChanges - editingShift cleared');
        this.editingShiftId = null;
        this.isEditMode = false;
        this.shiftForm.reset();
        this.shiftForm.patchValue({ date: new Date() });
      }
    }
  }

  startEditing(shift: Shift): void {
    this.editingShiftId = shift._id || null;
    this.isEditMode = true;
    
    // Ensure we're setting the correct date from the shift
    const shiftDate = new Date(shift.date);
    
    this.shiftForm.patchValue({
      date: shiftDate,
      fromTime: shift.fromTime,
      toTime: shift.toTime
    });
    
    console.log('Editing shift for date:', shiftDate, 'Original shift date:', shift.date);
  }

  loadBlockedTimes(forceRefresh: boolean = false): void {
    if (this.userId) {
      this.apiService.getBlockedTimes(this.userId, forceRefresh).subscribe({
        next: (blockedTimes) => {
          this.blockedTimes = blockedTimes;
        },
        error: (error) => {
          console.error('Error loading blocked times:', error);
        }
      });
    }
  }

  loadShifts(forceRefresh: boolean = false): void {
    if (this.userId) {
      this.apiService.getShifts(this.userId, forceRefresh).subscribe({
        next: (shifts) => {
          this.shifts = shifts;
        },
        error: (error) => {
          console.error('Error loading shifts:', error);
        }
      });
    }
  }

  isDateBlocked(date: Date | string): boolean {
    if (!date || !this.blockedTimes.length) return false;
    
    // Convert date to Date object if it's a string
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const dateString = dateObj.toDateString();
    
    return this.blockedTimes.some(blocked => 
      new Date(blocked.date).toDateString() === dateString
    );
  }

  isWeekend(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const day = dateObj.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }

  getWeekDays(startDate: Date): Date[] {
    const weekDays: Date[] = [];
    const currentDate = new Date(startDate);
    
    // Find the Monday of the current week (the week containing the selected date)
    while (currentDate.getDay() !== 1) { // 1 = Monday
      currentDate.setDate(currentDate.getDate() - 1); // Go backwards to find Monday
    }
    
    // Add Monday to Friday
    for (let i = 0; i < 5; i++) {
      weekDays.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return weekDays;
  }

  addShiftForWeek(): void {
    if (!this.shiftForm.valid || !this.userId) {
      this.snackBar.open('Please fill in all fields', 'error');
      return;
    }

    const fromTime = this.shiftForm.value.fromTime;
    const toTime = this.shiftForm.value.toTime;
    const startDate = this.shiftForm.value.date;
    
    if (!fromTime || !toTime || !startDate) {
      this.snackBar.open('Please fill in all fields', 'error');
      return;
    }

    const weekDays = this.getWeekDays(startDate);
    let successCount = 0;
    let errorCount = 0;

    this.isSubmitting = true;

    // Add shifts for each weekday
    weekDays.forEach((date, index) => {
      // Check if day is blocked
      if (this.isDateBlocked(date)) {
        errorCount++;
        return;
      }

      const shiftData = {
        userId: this.userId,
        date: date,
        fromTime: fromTime,
        toTime: toTime
      };

      this.apiService.createShift(shiftData).subscribe({
        next: (response) => {
          successCount++;
          if (successCount + errorCount === weekDays.length) {
            this.handleWeekShiftCompletion(successCount, errorCount);
          }
        },
        error: (error) => {
          errorCount++;
          if (successCount + errorCount === weekDays.length) {
            this.handleWeekShiftCompletion(successCount, errorCount);
          }
        }
      });
    });
  }

  handleWeekShiftCompletion(successCount: number, errorCount: number): void {
    this.isSubmitting = false;
    
    if (successCount > 0) {
      this.snackBar.open(`✅ Added ${successCount} shifts for the week!`, 'Close', {
        duration: 5000
      });
      this.shiftForm.reset();
      this.shiftForm.patchValue({ date: new Date() });
      this.loadShifts();
      // Emit event to notify parent component
      this.editComplete.emit();
    }
    
    if (errorCount > 0) {
      this.snackBar.open(`⚠️ Could not add ${errorCount} shifts (days blocked)`, 'Close', {
        duration: 5000
      });
    }
  }

  editShift(shift: Shift): void {
    this.editingShiftId = shift._id || null;
    this.isEditMode = true;
    
    this.shiftForm.patchValue({
      date: new Date(shift.date),
      fromTime: shift.fromTime,
      toTime: shift.toTime
    });
  }

  cancelEdit(): void {
    this.editingShiftId = null;
    this.isEditMode = false;
    this.shiftForm.reset();
    this.shiftForm.patchValue({ date: new Date() });
    this.editComplete.emit();
  }

  updateShift(): void {
    if (!this.editingShiftId || !this.shiftForm.valid) return;

    const shiftData = {
      userId: this.userId,
      date: this.shiftForm.value.date,
      fromTime: this.shiftForm.value.fromTime,
      toTime: this.shiftForm.value.toTime
    };

    this.isSubmitting = true;

    this.apiService.updateShift(this.editingShiftId, shiftData).subscribe({
      next: (response) => {
        this.snackBar.open('✅ Shift updated successfully!', 'Close', {
          duration: 3000
        });
        this.editingShiftId = null;
        this.isEditMode = false;
        this.shiftForm.reset();
        this.shiftForm.patchValue({ date: new Date() });
        this.isSubmitting = false;
        this.loadShifts();
        this.editComplete.emit();
      },
      error: (error) => {
        this.snackBar.open('Error updating shift: ' + error.message, 'Close', {
          duration: 5000
        });
        this.isSubmitting = false;
      }
    });
  }

  deleteShift(shiftId: string): void {
    if (confirm('Are you sure you want to delete this shift?')) {
      this.apiService.deleteShift(shiftId, this.userId).subscribe({
        next: () => {
          this.snackBar.open('✅ Shift deleted successfully!', 'Close', {
            duration: 3000
          });
          this.loadShifts();
        },
        error: (error) => {
          this.snackBar.open('Error deleting shift: ' + error.message, 'Close', {
            duration: 5000
          });
        }
      });
    }
  }

  onSubmit(): void {
    if (this.isEditMode) {
      this.updateShift();
      return;
    }

    if (this.shiftForm.valid && this.userId) {
      const selectedDate = this.shiftForm.value.date;
      
      // Check if the selected date is blocked
      if (this.isDateBlocked(selectedDate)) {
        this.snackBar.open('❌ Cannot add shift to a blocked day! Please unblock the day first or choose a different date.', 'Close', {
          duration: 8000,
          panelClass: ['error-snackbar']
        });
        return;
      }
      
      this.isSubmitting = true;
      
      const shiftData = {
        userId: this.userId,
        date: selectedDate,
        fromTime: this.shiftForm.value.fromTime,
        toTime: this.shiftForm.value.toTime
      };

      this.apiService.createShift(shiftData).subscribe({
        next: (response) => {
          this.snackBar.open('✅ Shift created successfully!', 'Close', {
            duration: 3000
          });
          this.shiftForm.reset();
          this.shiftForm.patchValue({ date: new Date() });
          this.isSubmitting = false;
          this.loadShifts();
          // Emit event to notify parent component
          this.editComplete.emit();
        },
        error: (error) => {
          // Handle backend validation errors gracefully
          let errorMessage = 'Error creating shift. Please try again.';
          
          if (error.error && error.error.error) {
            if (error.error.error.includes('blocked day')) {
              errorMessage = '❌ Cannot add shift to a blocked day! Please unblock the day first or choose a different date.';
            } else {
              errorMessage = error.error.error;
            }
          }
          
          this.snackBar.open(errorMessage, 'Close', {
            duration: 8000,
            panelClass: ['error-snackbar']
          });
          this.isSubmitting = false;
        }
      });
    }
  }

  generateTimeOptions(): string[] {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push(timeString);
      }
    }
    return times;
  }

  getShiftsForDate(date: Date | string): Shift[] {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const dateString = dateObj.toDateString();
    
    return this.shifts.filter(shift => 
      new Date(shift.date).toDateString() === dateString
    );
  }

  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  }

  softDeleteShift(): void {
    if (!this.editingShiftId) return;
    const shiftData = {
      ...this.shiftForm.value,
      userId: this.userId,
      deleted: true
    };
    this.isSubmitting = true;
    this.apiService.updateShift(this.editingShiftId, shiftData).subscribe({
      next: () => {
        this.snackBar.open('Shift deleted (soft delete).', 'Close', { duration: 3000 });
        this.isSubmitting = false;
        this.editingShiftId = null;
        this.isEditMode = false;
        this.editComplete.emit();
      },
      error: (error) => {
        this.snackBar.open('Error deleting shift: ' + error.message, 'Close', { duration: 5000 });
        this.isSubmitting = false;
      }
    });
  }
}
