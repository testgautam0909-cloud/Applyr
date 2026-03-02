import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PointOfContact } from '../../../jobs/models/job.model';
import { JobsService } from '../../../jobs/services/jobs.service';
import { Subject, debounceTime, takeUntil } from 'rxjs';

@Component({
  selector: 'app-add-contact-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
  ],
  template: `
    <div class="premium-modal shadow-lg">
      <div class="modal-header-premium d-flex justify-content-between align-items-center">
        <div>
            <h4 class="mb-0 fw-bold">{{ isEditMode ? 'Edit Contact' : 'Add New Contact' }}</h4>
            <p class="text-muted small mb-0">Professional details for this point of contact</p>
        </div>
        <button class="btn-close shadow-none" (click)="closeModal()"></button>
      </div>
      
      <div class="modal-body p-4">
        <form (ngSubmit)="saveContact()" #contactForm="ngForm" class="row g-3">
          <div class="col-12">
              <label class="form-label small fw-bold text-muted">Full Name *</label>
              <div class="input-group">
                <span class="input-group-text bg-white border-end-0"><i class="bi bi-person text-primary"></i></span>
                <input type="text" class="form-control premium-field border-start-0 ps-0 shadow-none" 
                       [(ngModel)]="contactData.name" name="name" required 
                       (ngModelChange)="onFieldChange()" placeholder="e.g. John Doe" #nameInput="ngModel"
                       style="color: var(--text-main);">
              </div>
              <div *ngIf="nameInput.invalid && nameInput.touched" class="text-danger smaller mt-1">
                Name is required
              </div>
          </div>

          <div class="col-12">
              <label class="form-label small fw-bold text-muted">Email Address *</label>
              <div class="input-group">
                <span class="input-group-text bg-white border-end-0"><i class="bi bi-envelope text-primary"></i></span>
                <input type="email" class="form-control premium-field border-start-0 ps-0 shadow-none" 
                       [(ngModel)]="contactData.email" name="email" required
                       (ngModelChange)="onFieldChange()" placeholder="name@company.com" #emailInput="ngModel"
                       pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                       style="color: var(--text-main);">
              </div>
              <div *ngIf="emailInput.invalid && emailInput.touched" class="text-danger smaller mt-1">
                Please enter a valid email address
              </div>
          </div>

          <div class="col-md-6">
              <label class="form-label small fw-bold text-muted">Mobile Number</label>
              <div class="input-group">
                <span class="input-group-text bg-white border-end-0"><i class="bi bi-phone text-primary"></i></span>
                <input type="text" class="form-control premium-field border-start-0 ps-0 shadow-none" 
                       [(ngModel)]="contactData.mobile" name="mobile"
                       (ngModelChange)="onFieldChange()" placeholder="+1 (555) 000-0000">
              </div>
          </div>

          <div class="col-md-6">
              <label class="form-label small fw-bold text-muted">Designation *</label>
              <div class="input-group">
                <span class="input-group-text bg-white border-end-0"><i class="bi bi-briefcase text-primary"></i></span>
                <select class="form-select premium-field border-start-0 ps-0 shadow-none" 
                        [(ngModel)]="contactData.designation" name="designation" required
                        (change)="onFieldChange()" #designationInput="ngModel">
                    <option value="" disabled selected>Select Role</option>
                    <option value="Recruiter">Recruiter</option>
                    <option value="Hiring Manager">Hiring Manager</option>
                    <option value="HR">HR</option>
                    <option value="Technical Lead">Technical Lead</option>
                    <option value="VP Engineering">VP Engineering</option>
                </select>
              </div>
          </div>
        </form>
      </div>

      <div class="modal-footer-premium d-flex justify-content-end gap-2 p-3 border-top">
        <button class="btn btn-cancel-link" (click)="closeModal()">Cancel</button>
        <button class="btn btn-save-contact px-5 fw-bold rounded-pill shadow-sm" 
                [disabled]="contactForm.invalid" (click)="saveContact()">
            {{ isEditMode ? 'Save Changes' : 'Add Contact' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .premium-modal {
      border-radius: 20px;
      overflow: hidden;
      background: var(--card-bg);
      color: var(--text-main);
    }

    .modal-header-premium {
      padding: 24px;
      background: var(--card-bg);
      border-bottom: 1px solid var(--glass-border);
    }

    .premium-field {
        height: 48px;
        background: var(--card-bg);
        color: var(--text-main);
        border: 1px solid var(--glass-border);
        border-radius: 12px;
        font-size: 0.95rem;
        &:focus { border-color: var(--primary-vibrant); box-shadow: 0 0 0 4px var(--primary-glow); }
    }

    .input-group-text {
        background: var(--bg-app) !important;
        border: 1px solid var(--glass-border);
        border-radius: 12px;
    }

    .btn-save-contact {
        background: var(--primary-vibrant);
        color: white;
        border: none;
        height: 48px;
        &:hover { transform: translateY(-1px); box-shadow: 0 4px 15px var(--primary-glow); }
        &:disabled { background: var(--bg-app); color: var(--text-muted); opacity: 0.5; }
    }

    .btn-cancel-link {
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-weight: 700;
        text-decoration: none;
        padding: 0 16px;
        transition: all 0.2s ease;
        &:hover { color: var(--text-main); }
    }

    .smaller { font-size: 0.75rem; }
  `]
})
export class AddContactModalComponent implements OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<AddContactModalComponent>);
  private readonly data = inject(MAT_DIALOG_DATA);
  private readonly service = inject(JobsService);

  private readonly destroy$ = new Subject<void>();
  private readonly update$ = new Subject<void>();

  protected jobId = '';
  protected pocIndex: number | null = null;
  protected contactData = {
    name: '',
    email: '',
    mobile: '',
    designation: ''
  };

  protected isEditMode = false;

  constructor() {
    if (this.data) {
      this.jobId = this.data.jobId;
      if (this.data.contact) {
        this.contactData = { ...this.data.contact };
        this.isEditMode = true;
        this.pocIndex = this.data.pocIndex;
      }
    }

    this.update$.pipe(
      debounceTime(1000),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.persistChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected closeModal(): void {
    if (this.isEditMode) {
      this.persistChanges();
    }
    this.dialogRef.close();
  }

  protected onFieldChange(): void {
    if (this.isEditMode) {
      this.update$.next();
    }
  }

  protected saveContact(): void {
    if (this.contactData.name && this.contactData.email && this.contactData.designation) {
      this.persistChanges();
      this.dialogRef.close();
    }
  }

  private persistChanges(): void {
    if (this.jobId && this.contactData.name && this.contactData.email && this.contactData.designation) {
      const contact: PointOfContact = {
        name: this.contactData.name.trim(),
        email: this.contactData.email.trim(),
        mobile: this.contactData.mobile.trim(),
        designation: this.contactData.designation
      };

      const job = this.service.jobs().find(j => j.id === this.jobId);
      if (job) {
        const updatedPOCs = [...job.poc];
        if (this.isEditMode && this.pocIndex !== null) {
          updatedPOCs[this.pocIndex] = contact;
        } else {
          updatedPOCs.push(contact);
        }
        this.service.updateJobField(this.jobId, 'poc', updatedPOCs);
      }
    }
  }
}
