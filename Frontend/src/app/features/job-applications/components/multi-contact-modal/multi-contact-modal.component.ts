import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { PointOfContact } from '../../types/job-application.type';
import { JobApplicationService } from '../../api/job-application.service';
import { Subject, debounceTime, takeUntil } from 'rxjs';

@Component({
  selector: 'app-multi-contact-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatListModule,
    MatCardModule,
  ],
  template: `
    <!-- ... (previous template remains same) ... -->
    <div class="modal-container">
      <div class="modal-header">
        <h2>Manage Contacts</h2>
        <button mat-icon-button (click)="closeModal()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      
      <div class="modal-content">
        <!-- Contact List -->
        <div class="contacts-list">
          @for (contact of contacts; track $index; let i = $index) {
            <mat-card class="contact-card">
              <div class="contact-info">
                <div class="contact-details">
                  <h3>{{ contact.name }}</h3>
                  <p class="contact-role">{{ contact.designation }}</p>
                  <p class="contact-email">{{ contact.email }}</p>
                  @if (contact.mobile) {
                    <p class="contact-mobile">{{ contact.mobile }}</p>
                  }
                </div>
                <div class="contact-actions">
                  <button mat-icon-button (click)="editContact(i)" matTooltip="Edit contact">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button (click)="deleteContact(i)" color="warn" matTooltip="Delete contact">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            </mat-card>
          }
          
          @if (contacts.length === 0) {
            <div class="no-contacts">
              <p>No contacts added yet</p>
            </div>
          }
        </div>
        
        <!-- Add/Edit Contact Form -->
        <mat-card class="add-contact-card">
          <h3>{{ isEditing ? 'Edit Contact' : 'Add New Contact' }}</h3>
          <form (ngSubmit)="saveContact()" #contactForm="ngForm">
            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Name *</mat-label>
              <input matInput [(ngModel)]="currentContact.name" name="name" required 
                     (ngModelChange)="onFieldChange()"
                     placeholder="Enter contact name" #nameInput="ngModel">
              <mat-error *ngIf="nameInput.invalid && nameInput.touched">
                Name is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Email *</mat-label>
              <input matInput [(ngModel)]="currentContact.email" name="email" type="email" required
                     (ngModelChange)="onFieldChange()"
                     placeholder="Enter email address" #emailInput="ngModel"
                     pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$">
              <mat-error *ngIf="emailInput.invalid && emailInput.touched">
                Please enter a valid email address
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Mobile Number</mat-label>
              <input matInput [(ngModel)]="currentContact.mobile" name="mobile"
                     (ngModelChange)="onFieldChange()"
                     placeholder="Enter mobile number" #mobileInput="ngModel">
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Designation *</mat-label>
              <mat-select [(ngModel)]="currentContact.designation" name="designation" required
                          (selectionChange)="onFieldChange()"
                          #designationInput="ngModel">
                <mat-option value="Recruiter">Recruiter</mat-option>
                <mat-option value="Hiring Manager">Hiring Manager</mat-option>
                <mat-option value="HR">HR</mat-option>
                <mat-option value="Technical Lead">Technical Lead</mat-option>
                <mat-option value="Director">Director</mat-option>
                <mat-option value="Team Lead">Team Lead</mat-option>
                <mat-option value="VP Engineering">VP Engineering</mat-option>
              </mat-select>
              <mat-error *ngIf="designationInput.invalid && designationInput.touched">
                Designation is required
              </mat-error>
            </mat-form-field>

            <div class="modal-actions">
              @if (isEditing) {
                <button mat-button type="button" (click)="cancelEdit()" class="cancel-btn">
                  Cancel
                </button>
              }
              <button mat-button type="button" (click)="resetForm()" class="reset-btn">
                Reset
              </button>
              <button mat-flat-button color="primary" type="submit" 
                      [disabled]="!currentContact.name || !currentContact.email || !currentContact.designation"
                      class="save-btn">
                {{ isEditing ? 'Update' : 'Add' }}
              </button>
            </div>
          </form>
        </mat-card>

        <div class="modal-final-actions">
            <button mat-flat-button color="primary" (click)="closeModal()" class="done-btn">
                Done
            </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-container {
      min-width: 500px;
      max-width: 600px;
      padding: 0;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 16px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .modal-header h2 {
      margin: 0;
      font: var(--mat-sys-headline-small);
      color: var(--mat-sys-on-surface);
    }

    .modal-content {
      padding: 24px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .contacts-list {
      margin-bottom: 24px;
    }

    .contact-card {
      margin-bottom: 12px;
      padding: 16px;
      background: var(--mat-sys-surface-container);
      border-radius: 12px;
      border: 1px solid var(--mat-sys-outline-variant);
    }

    .contact-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .contact-details h3 {
      margin: 0 0 4px 0;
      font: var(--mat-sys-title-medium);
      color: var(--mat-sys-on-surface);
    }

    .contact-role {
      margin: 0 0 2px 0;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }

    .contact-email, .contact-mobile {
      margin: 2px 0;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }

    .contact-actions {
      display: flex;
      gap: 8px;
    }

    .no-contacts {
      text-align: center;
      padding: 24px;
      color: var(--mat-sys-outline-variant);
    }

    .add-contact-card {
      padding: 16px;
      background: var(--mat-sys-surface-container-high);
      border-radius: 12px;
      border: 1px solid var(--mat-sys-outline-variant);
    }

    .add-contact-card h3 {
      margin: 0 0 16px 0;
      font: var(--mat-sys-title-medium);
      color: var(--mat-sys-on-surface);
    }

    .form-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    
    .modal-final-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }

    .cancel-btn, .reset-btn {
      color: var(--mat-sys-on-surface-variant);
    }

    .save-btn, .done-btn {
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
    }

    .save-btn:disabled {
      background: var(--mat-sys-outline-variant);
      color: var(--mat-sys-on-surface-variant);
    }
  `]
})
export class MultiContactModalComponent implements OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<MultiContactModalComponent>);
  private readonly service = inject(JobApplicationService);

  private readonly destroy$ = new Subject<void>();
  private readonly update$ = new Subject<void>();

  jobId: string = '';
  contacts: PointOfContact[] = [];
  currentContact: PointOfContact = {
    name: '',
    email: '',
    mobile: '',
    designation: ''
  };
  isEditing = false;
  editIndex = -1;

  constructor() {
    const data = this.dialogRef['_containerInstance']['_config'].data;
    if (data) {
      this.jobId = data.jobId;
      this.contacts = [...(data.contacts || [])];
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
    if (this.isEditing) {
      this.persistChanges();
    }
    this.dialogRef.close();
  }

  protected editContact(index: number): void {
    if (this.isEditing) {
      this.persistChanges();
    }
    this.currentContact = { ...this.contacts[index] };
    this.isEditing = true;
    this.editIndex = index;
  }

  protected deleteContact(index: number): void {
    if (confirm('Are you sure you want to delete this contact?')) {
      this.contacts = this.contacts.filter((_, i) => i !== index);
      this.persistChanges();
    }
  }

  protected onFieldChange(): void {
    if (this.isEditing) {
      this.update$.next();
    }
  }

  protected saveContact(): void {
    if (this.currentContact.name && this.currentContact.email && this.currentContact.designation) {
      const contact: PointOfContact = {
        name: this.currentContact.name.trim(),
        email: this.currentContact.email.trim(),
        mobile: this.currentContact.mobile.trim(),
        designation: this.currentContact.designation
      };

      if (this.isEditing) {
        this.contacts[this.editIndex] = contact;
        this.isEditing = false;
        this.editIndex = -1;
      } else {
        this.contacts = [...this.contacts, contact];
      }

      this.persistChanges();
      this.resetForm();
    }
  }

  private persistChanges(): void {
    if (this.jobId) {
      this.service.updateJobField(this.jobId, 'poc', this.contacts);
    }
  }

  protected cancelEdit(): void {
    this.isEditing = false;
    this.editIndex = -1;
    this.resetForm();
  }

  protected resetForm(): void {
    this.currentContact = {
      name: '',
      email: '',
      mobile: '',
      designation: ''
    };
  }
}
