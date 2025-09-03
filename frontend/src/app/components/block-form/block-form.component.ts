import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-block-form',
  templateUrl: './block-form.component.html',
  styleUrls: ['./block-form.component.css']
})
export class BlockFormComponent implements OnInit {
  @Input() userId: string = '';
  @Output() blockComplete = new EventEmitter<void>();
  
  blockForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) {
    this.blockForm = this.fb.group({
      date: ['', Validators.required],
      reason: ['']
    });
  }

  ngOnInit(): void {
    // Set default date to today
    this.blockForm.patchValue({
      date: new Date()
    });
  }

  onSubmit(): void {
    if (this.blockForm.valid && this.userId) {
      this.isSubmitting = true;
      
      const blockedTimeData = {
        userId: this.userId,
        date: this.blockForm.value.date,
        reason: this.blockForm.value.reason
      };

      this.apiService.createBlockedTime(blockedTimeData).subscribe({
        next: (response) => {
          this.snackBar.open('Day blocked successfully!', 'Close', {
            duration: 3000
          });
          this.blockForm.reset();
          this.blockForm.patchValue({ date: new Date() });
          this.isSubmitting = false;
          // Emit event to notify parent component
          this.blockComplete.emit();
        },
        error: (error) => {
          this.snackBar.open('Error blocking day: ' + error.message, 'Close', {
            duration: 5000
          });
          this.isSubmitting = false;
        }
      });
    }
  }
}