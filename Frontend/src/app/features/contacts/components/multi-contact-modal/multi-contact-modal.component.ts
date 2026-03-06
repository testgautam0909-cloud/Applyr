import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PointOfContact } from '../../../jobs/models/job.model';
import { JobsService } from '../../../jobs/services/jobs.service';
import { Subject, debounceTime, takeUntil } from 'rxjs';

@Component({
  selector: 'app-multi-contact-modal',
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
            <h4 class="mb-0 fw-bold">Manage Contacts</h4>
            <p class="text-muted small mb-0">Points of contact for this application</p>
        </div>
        <button class="btn-close shadow-none" (click)="closeModal()"></button>
      </div>
      
      <div class="modal-body p-0" style="max-height: 75vh; overflow-y: auto;">
        <!-- Contact List -->
        <div class="p-4 bg-glass-section border-bottom">
           <div class="row g-3">
              @for (contact of contacts; track $index; let i = $index) {
                <div class="col-12">
                    <div class="contact-entry glass-card-sm p-3">
                        <div class="d-flex justify-content-between">
                            <div class="d-flex align-items-center gap-3">
                                <div class="avatar-contact">{{ contact.name.charAt(0) }}</div>
                                <div>
                                    <h6 class="mb-0 fw-bold text-main">{{ contact.name }}</h6>
                                    <div class="small text-muted">{{ contact.designation }}</div>
                                </div>
                            </div>
                            <div class="d-flex gap-2">
                                <button class="btn btn-icon-sm" (click)="editContact(i)" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-icon-sm text-danger" (click)="deleteContact(i)" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div class="mt-2 d-flex flex-wrap gap-3 small text-muted px-1">
                            <a [href]="'mailto:' + contact.email" class="contact-link" title="Send Email">
                                <i class="bi bi-envelope me-1 text-primary"></i>{{ contact.email }}
                            </a>
                            @if (contact.mobile) {
                                <a [href]="'tel:' + contact.mobile" class="contact-link" title="Call Number">
                                    <i class="bi bi-phone me-1 text-primary"></i>{{ contact.mobile }}
                                </a>
                                <a [href]="getWhatsAppUrl(contact.mobile)" target="_blank" class="contact-link" title="Open WhatsApp">
                                    <i class="bi bi-whatsapp me-1 text-success"></i>WhatsApp
                                </a>
                            }
                        </div>
                    </div>
                </div>
              }
              @if (contacts.length === 0) {
                <div class="col-12 text-center py-5 text-muted opacity-50">
                    <i class="bi bi-people fs-1 d-block mb-2"></i>
                    No contacts yet
                </div>
              }
           </div>
        </div>
        
        <!-- Add/Edit Contact Form -->
        <div class="p-4" id="contact-form-section">
          <div class="d-flex align-items-center gap-2 mb-4">
              <span class="badge bg-primary rounded-pill p-2"><i class="bi" [class.bi-plus-lg]="!isEditing" [class.bi-pencil]="isEditing"></i></span>
              <h5 class="mb-0 fw-bold">{{ isEditing ? 'Edit Contact' : 'Add New Contact' }}</h5>
          </div>

          <form (ngSubmit)="saveContact()" #contactForm="ngForm" class="row g-3">
            <div class="col-md-6">
                <label class="form-label small fw-bold text-muted">Full Name *</label>
                <input type="text" class="form-control premium-field shadow-none" [(ngModel)]="currentContact.name" name="name" required 
                       (ngModelChange)="onFieldChange()" placeholder="e.g. John Doe">
            </div>

            <div class="col-md-6">
                <label class="form-label small fw-bold text-muted">Email Address *</label>
                <input type="email" class="form-control premium-field shadow-none" [(ngModel)]="currentContact.email" name="email" required
                       (ngModelChange)="onFieldChange()" placeholder="name@company.com">
            </div>

            <div class="col-md-6">
                <label class="form-label small fw-bold text-muted">Mobile Number</label>
                <input type="text" class="form-control premium-field shadow-none" [(ngModel)]="currentContact.mobile" name="mobile"
                       (ngModelChange)="onFieldChange()" placeholder="+1 (555) 000-0000">
            </div>

            <div class="col-md-6">
                <label class="form-label small fw-bold text-muted">Designation *</label>
                <select class="form-select premium-field shadow-none" [(ngModel)]="currentContact.designation" name="designation" required
                          (change)="onFieldChange()">
                    <option value="" disabled selected>Select Role</option>
                    <option value="Recruiter">Recruiter</option>
                    <option value="Hiring Manager">Hiring Manager</option>
                    <option value="HR">HR</option>
                    <option value="Technical Lead">Technical Lead</option>
                    <option value="VP Engineering">VP Engineering</option>
                </select>
            </div>

            <div class="col-12 d-flex justify-content-end gap-2 mt-4">
              <button *ngIf="isEditing" class="btn btn-light px-4 fw-bold" type="button" (click)="cancelEdit()">Cancel</button>
              <button *ngIf="!isEditing" class="btn btn-light px-4 fw-bold" type="button" (click)="resetForm()">Reset</button>
              <button class="btn btn-primary px-5 fw-bold shadow-sm" type="submit" 
                      [disabled]="!currentContact.name || !currentContact.email || !currentContact.designation">
                {{ isEditing ? 'Update' : 'Add' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div class="modal-footer d-flex justify-content-center p-3 border-top">
          <button class="btn btn-done px-5 fw-bold rounded-pill" (click)="closeModal()">Done</button>
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

    .bg-glass-section {
        background: var(--bg-app);
        opacity: 0.8;
    }

    .glass-card-sm {
        background: var(--card-bg);
        border: 1px solid var(--glass-border);
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        transition: all 0.2s ease;
        &:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    }

    .avatar-contact {
        width: 36px;
        height: 36px;
        background: var(--primary-glow);
        color: var(--primary-vibrant);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 1.1rem;
    }

    .btn-icon-sm {
        width: 32px;
        height: 32px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        color: var(--text-muted);
        &:hover { background: var(--bg-app); color: var(--text-main); }
    }

    .premium-field {
        height: 44px;
        background: var(--card-bg);
        color: var(--text-main);
        border: 1px solid var(--glass-border);
        border-radius: 10px;
        font-size: 0.95rem;
        &:focus { border-color: var(--primary-vibrant); box-shadow: 0 0 0 4px var(--primary-glow); }
    }

    .btn-primary {
        background: #7C3AED;
        border: none;
        height: 44px;
        border-radius: 10px;
        &:hover { background: #6D28D9; }
        &:disabled { background: #E5E7EB; color: #9CA3AF; }
    }

    .btn-done {
        background: var(--card-bg);
        color: var(--text-main);
        border: 1px solid var(--glass-border);
        transition: all 0.2s ease;
        &:hover {
            background: var(--primary-vibrant);
            color: white;
            border-color: var(--primary-vibrant);
        }
    }

    .btn-light {
        height: 44px;
        border-radius: 10px;
        background: var(--bg-app);
        color: var(--text-main);
        border: 1px solid var(--glass-border);
        &:hover { background: var(--card-bg); }
    }

    .contact-link {
        text-decoration: none;
        color: inherit;
        display: inline-flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 6px;
        transition: all 0.2s ease;
        &:hover { 
            background: rgba(124, 58, 237, 0.05);
            color: #7C3AED;
        }
    }
  `]
})
export class MultiContactModalComponent implements OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<MultiContactModalComponent>);
  private readonly data = inject(MAT_DIALOG_DATA);
  private readonly service = inject(JobsService);

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
    if (this.data) {
      this.jobId = this.data.jobId;
      this.contacts = [...(this.data.contacts || [])];
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

    // Scroll to form
    this.scrollToForm();
  }

  private scrollToForm(): void {
    setTimeout(() => {
      const element = document.getElementById('contact-form-section');
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
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
        mobile: this.currentContact.mobile ? this.currentContact.mobile.trim() : '',
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

  protected getWhatsAppUrl(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}`;
  }
}
