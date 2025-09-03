import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { User } from '../../models/user.model';
import { Shift } from '../../models/shift.model';
import { CalendarViewComponent } from '../calendar-view/calendar-view.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  @ViewChild(CalendarViewComponent) calendarView!: CalendarViewComponent;
  
  currentUser: User | null = null;
  userId: string = '';
  loading: boolean = false;
  editingShift: Shift | null = null;
  
  // Modal states
  showShiftModal: boolean = false;
  showBlockModal: boolean = false;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.initializeUser();
  }

  private initializeUser(): void {
    this.loading = true;

    // Only force refresh if user was just created
    this.apiService.getUsers(!!this.currentUser).subscribe({
      next: (users: User[]) => {
        if (users.length > 0) {
          // Use the first available user
          this.currentUser = users[0];
          this.userId = users[0]._id || '';
          this.loading = false;
        } else {
          // Create a default user if none exist
          const defaultUser: Partial<User> = {
            name: 'Vemesh Bypureddi',
            email: 'vemeshbypureddi1204@gmail.com'
          };

        this.apiService.createUser(defaultUser).subscribe({
            next: (user: User) => {
              this.currentUser = user;
              this.userId = user._id || '';
              this.loading = false;
            },
            error: (error) => {
              console.error('Error creating user:', error);
              this.loading = false;
            }
          });
        }
      },
      error: (error) => {
        console.error('Error fetching users:', error);
        this.loading = false;
      }
    });
  }

  // Modal methods
  openShiftModal(): void {
    this.editingShift = null;
    this.showShiftModal = true;
    this.refreshCalendar();
  }

  openBlockModal(): void {
    this.showBlockModal = true;
  }

  closeShiftModal(): void {
    this.showShiftModal = false;
    this.editingShift = null;
    // Do not refresh calendar here; only after a real change
  }

  closeBlockModal(): void {
    this.showBlockModal = false;
    // Do not refresh calendar here; only after a real change
  }

  onShiftEditRequest(shift: Shift): void {
    this.editingShift = shift;
    this.showShiftModal = true;
  }

  onShiftEditComplete(): void {
    this.editingShift = null;
    this.showShiftModal = false;
    // Only refresh calendar after a real change
    this.refreshCalendar();
  }

  onBlockComplete(): void {
    this.showBlockModal = false;
    // Only refresh calendar after a real change
    this.refreshCalendar();
  }

  private refreshCalendar(): void {
    // Trigger the calendar to refresh its data with a small delay to ensure modal is closed
    setTimeout(() => {
      if (this.calendarView) {
        this.calendarView.loadCalendarData();
      }
    }, 100);
  }
}