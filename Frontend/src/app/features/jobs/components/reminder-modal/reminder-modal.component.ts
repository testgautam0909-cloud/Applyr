import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { JobsService } from '../../services/jobs.service';

@Component({
    selector: 'app-reminder-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogModule],
    template: `
    <div class="premium-modal shadow-lg">
      <div class="modal-header-premium d-flex justify-content-between align-items-center">
        <div>
            <h4 class="mb-0 fw-bold">Set Reminder</h4>
            <p class="text-muted small mb-0">Follow up on this application</p>
        </div>
        <button class="btn-close shadow-none" (click)="closeModal()"></button>
      </div>
      
      <div class="modal-body p-4">
        <form (ngSubmit)="saveReminder()" #reminderForm="ngForm" class="row g-3">
          <div class="col-12">
              <label class="form-label small fw-bold text-muted">Reminder Date</label>
              <div class="input-group">
                <span class="input-group-text bg-white border-end-0"><i class="bi bi-calendar-event text-primary"></i></span>
                <input type="date" class="form-control premium-field border-start-0 ps-0 shadow-none" 
                       [(ngModel)]="reminderData.reminderDate" name="reminderDate">
              </div>
          </div>

          <div class="col-12">
              <label class="form-label small fw-bold text-muted">Note (Optional)</label>
              <div class="input-group">
                <span class="input-group-text bg-white border-end-0 align-items-start pt-2"><i class="bi bi-chat-text text-primary"></i></span>
                <textarea class="form-control premium-field border-start-0 ps-0 shadow-none" rows="3"
                          [(ngModel)]="reminderData.reminderNote" name="reminderNote" 
                          placeholder="e.g. Send a follow-up email to the recruiter..."></textarea>
              </div>
          </div>
        </form>
      </div>

      <div class="modal-footer-premium d-flex justify-content-end gap-2 p-3 border-top">
        <button *ngIf="hasExisting" class="btn btn-outline-danger shadow-none me-auto" (click)="clearReminder()">Remove</button>
        <button class="btn btn-cancel-link" (click)="closeModal()">Cancel</button>
        <button class="btn btn-save-contact px-5 fw-bold rounded-pill shadow-sm" (click)="saveReminder()">
            Save Reminder
        </button>
      </div>
    </div>
  `,
    styles: [`
    .premium-modal {
      border-radius: 24px;
      overflow: hidden;
      background: var(--card-bg);
      color: var(--text-main);
      border: 1px solid var(--glass-border);
    }
    .modal-header-premium {
      padding: 24px 32px;
      background: var(--card-bg);
      border-bottom: 1px solid var(--glass-border);
    }
    .premium-field {
        background: transparent !important;
        color: var(--text-main);
        border: none !important;
        padding: 12px 16px;
        font-size: 1rem;
        &:focus { outline: none; box-shadow: none; }
    }
    textarea.premium-field { min-height: 100px; padding-top: 12px; }
    .input-group {
        background: var(--bg-app);
        border: 1px solid var(--glass-border);
        border-radius: 16px;
        transition: all 0.2s ease;
        overflow: hidden;
        &:focus-within {
            border-color: var(--primary-vibrant);
            box-shadow: 0 0 0 4px var(--primary-glow);
            background: var(--card-bg);
        }
    }
    .input-group-text { 
        background: transparent !important; 
        border: none !important; 
        padding-left: 20px;
        color: var(--primary-vibrant) !important;
    }
    .btn-save-contact {
        background: var(--primary-vibrant);
        color: white;
        border: none;
        height: 52px;
        padding: 0 32px;
        transition: all 0.2s ease;
        &:hover { transform: translateY(-2px); box-shadow: 0 8px 20px var(--primary-glow); }
        &:active { transform: translateY(0); }
    }
    .btn-cancel-link { 
        background: transparent; 
        border: none; 
        color: var(--text-muted); 
        font-weight: 600; 
        padding: 0 20px; 
        &:hover { color: var(--text-main); } 
    }
    .btn-outline-danger {
        border-radius: 12px;
        padding: 8px 16px;
        font-weight: 500;
        border: 1px solid #fee2e2;
        color: #ef4444;
        background: #fef2f2;
        &:hover { background: #fee2e2; border-color: #fca5a5; }
    }
  `]
})
export class ReminderModalComponent {
    private readonly dialogRef = inject(MatDialogRef<ReminderModalComponent>);
    public readonly data = inject(MAT_DIALOG_DATA);
    private readonly service = inject(JobsService);

    protected reminderData = {
        reminderDate: '',
        reminderNote: ''
    };
    protected hasExisting = false;

    constructor() {
        if (this.data) {
            if (this.data.job.reminderDate) {
                this.reminderData.reminderDate = this.data.job.reminderDate;
                this.hasExisting = true;
            }
            if (this.data.job.reminderNote) {
                this.reminderData.reminderNote = this.data.job.reminderNote;
            }
        }
    }

    protected closeModal(): void {
        this.dialogRef.close();
    }

    protected saveReminder(): void {
        if (this.data.job.id) {
            this.service.updateJobField(this.data.job.id, 'reminderDate', this.reminderData.reminderDate || '');
            this.service.updateJobField(this.data.job.id, 'reminderNote', this.reminderData.reminderNote || '');
        }
        this.dialogRef.close();
    }

    protected clearReminder(): void {
        if (this.data.job.id) {
            this.service.updateJobField(this.data.job.id, 'reminderDate', '');
            this.service.updateJobField(this.data.job.id, 'reminderNote', '');
        }
        this.dialogRef.close();
    }
}
