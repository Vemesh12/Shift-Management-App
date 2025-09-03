import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:3000/api';
  private token = 'mytoken';

  // Caching for users, shifts, blocked times, and calendar data
  private usersCache: any[] | null = null;
  private shiftsCache: { [userId: string]: any[] } = {};
  private blockedTimesCache: { [userId: string]: any[] } = {};
  private calendarCache: { [userId: string]: any } = {};

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    });
  }

  // User endpoints
  getUsers(forceRefresh: boolean = false): Observable<any[]> {
    if (this.usersCache && !forceRefresh) {
      return new Observable((observer) => {
        observer.next(this.usersCache ?? []);
        observer.complete();
      });
    }
    return new Observable((observer) => {
      this.http.get<any[]>(`${this.baseUrl}/users`, { headers: this.getHeaders() }).subscribe(users => {
        this.usersCache = users;
        observer.next(users);
        observer.complete();
      }, err => observer.error(err));
    });
  }

  createUser(user: any): Observable<any> {
    return new Observable((observer) => {
      this.http.post<any>(`${this.baseUrl}/users`, user, { headers: this.getHeaders() }).subscribe(newUser => {
  this.usersCache = []; // Invalidate cache
        observer.next(newUser);
        observer.complete();
      }, err => observer.error(err));
    });
  }

  // Shift endpoints
  createShift(shift: any): Observable<any> {
    return new Observable((observer) => {
      this.http.post<any>(`${this.baseUrl}/shifts`, shift, { headers: this.getHeaders() }).subscribe(newShift => {
  if (shift.userId) this.shiftsCache[shift.userId] = [];
        this.calendarCache[shift.userId] = null;
        observer.next(newShift);
        observer.complete();
      }, err => observer.error(err));
    });
  }

  getShifts(userId: string, forceRefresh: boolean = false): Observable<any[]> {
    if (this.shiftsCache[userId] && !forceRefresh) {
      return new Observable((observer) => {
        observer.next(this.shiftsCache[userId] ?? []);
        observer.complete();
      });
    }
    return new Observable((observer) => {
      this.http.get<any[]>(`${this.baseUrl}/shifts/${userId}`, { headers: this.getHeaders() }).subscribe(shifts => {
        this.shiftsCache[userId] = shifts;
        observer.next(shifts);
        observer.complete();
      }, err => observer.error(err));
    });
  }

  updateShift(shiftId: string, shift: any): Observable<any> {
    return new Observable((observer) => {
      this.http.put<any>(`${this.baseUrl}/shifts/${shiftId}`, shift, { headers: this.getHeaders() }).subscribe(updatedShift => {
  if (shift.userId) this.shiftsCache[shift.userId] = [];
        this.calendarCache[shift.userId] = null;
        observer.next(updatedShift);
        observer.complete();
      }, err => observer.error(err));
    });
  }

  deleteShift(shiftId: string, userId: string): Observable<any> {
    return new Observable((observer) => {
      this.http.delete<any>(`${this.baseUrl}/shifts/${shiftId}`, { headers: this.getHeaders() }).subscribe(result => {
  if (userId) this.shiftsCache[userId] = [];
        this.calendarCache[userId] = null;
        observer.next(result);
        observer.complete();
      }, err => observer.error(err));
    });
  }

  // Blocked time endpoints
  createBlockedTime(blockedTime: any): Observable<any> {
    return new Observable((observer) => {
      this.http.post<any>(`${this.baseUrl}/blocked`, blockedTime, { headers: this.getHeaders() }).subscribe(newBlock => {
  if (blockedTime.userId) this.blockedTimesCache[blockedTime.userId] = [];
        this.calendarCache[blockedTime.userId] = null;
        observer.next(newBlock);
        observer.complete();
      }, err => observer.error(err));
    });
  }

  getBlockedTimes(userId: string, forceRefresh: boolean = false): Observable<any[]> {
    if (this.blockedTimesCache[userId] && !forceRefresh) {
      return new Observable((observer) => {
        observer.next(this.blockedTimesCache[userId] ?? []);
        observer.complete();
      });
    }
    return new Observable((observer) => {
      this.http.get<any[]>(`${this.baseUrl}/blocked/${userId}`, { headers: this.getHeaders() }).subscribe(blockedTimes => {
        this.blockedTimesCache[userId] = blockedTimes;
        observer.next(blockedTimes);
        observer.complete();
      }, err => observer.error(err));
    });
  }

  deleteBlockedTime(blockedTimeId: string, userId: string): Observable<any> {
    return new Observable((observer) => {
      this.http.delete<any>(`${this.baseUrl}/blocked/${blockedTimeId}`, { headers: this.getHeaders() }).subscribe(result => {
  if (userId) this.blockedTimesCache[userId] = [];
        this.calendarCache[userId] = null;
        observer.next(result);
        observer.complete();
      }, err => observer.error(err));
    });
  }

  // Calendar endpoint
  getCalendarData(userId: string, forceRefresh: boolean = false): Observable<any> {
    if (this.calendarCache[userId] && !forceRefresh) {
      return new Observable((observer) => {
        observer.next(this.calendarCache[userId]);
        observer.complete();
      });
    }
    return new Observable((observer) => {
      this.http.get<any>(`${this.baseUrl}/calendar/${userId}`, { headers: this.getHeaders() }).subscribe(data => {
        this.calendarCache[userId] = data;
        observer.next(data);
        observer.complete();
      }, err => observer.error(err));
    });
  }
}
