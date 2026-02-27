import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { JobApplicationService } from '../../api/job-application.service';
import { Subject, debounceTime, takeUntil } from 'rxjs';

@Component({
  selector: 'app-documents-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  template: `
    <div class="modal-container">
      <div class="modal-header">
        <h2>Edit Documents & Links</h2>
        <button mat-icon-button (click)="closeModal()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      
      <div class="modal-content">
        <form>
          <mat-form-field appearance="outline" class="form-field">
            <mat-label>LinkedIn URL</mat-label>
            <input matInput [(ngModel)]="documentUrls.linkedInUrl" name="linkedInUrl" 
                   (ngModelChange)="onUrlChange()"
                   placeholder="https://linkedin.com/in/username" type="url">
            <mat-icon matPrefix>person</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Resume URL</mat-label>
            <input matInput [(ngModel)]="documentUrls.resumeUrl" name="resumeUrl" 
                   (ngModelChange)="onUrlChange()"
                   placeholder="https://yourwebsite.com/resume.pdf" type="url">
            <mat-icon matPrefix>description</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Cover Letter URL</mat-label>
            <input matInput [(ngModel)]="documentUrls.coverLetterUrl" name="coverLetterUrl" 
                   (ngModelChange)="onUrlChange()"
                   placeholder="https://yourwebsite.com/cover-letter.pdf" type="url">
            <mat-icon matPrefix>mail</mat-icon>
          </mat-form-field>
        </form>
        
        <div class="modal-actions">
          <button mat-flat-button color="primary" (click)="closeModal()" class="save-btn">
            Done
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-container {
      min-width: 400px;
      max-width: 500px;
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
    }

    .form-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }

    .save-btn {
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
    }
  `]
})
export class DocumentsModalComponent implements OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<DocumentsModalComponent>);
  private readonly service = inject(JobApplicationService);

  private readonly destroy$ = new Subject<void>();
  private readonly update$ = new Subject<void>();

  jobId: string = '';
  documentUrls: { linkedInUrl: string; resumeUrl: string; coverLetterUrl: string } = {
    linkedInUrl: '',
    resumeUrl: '',
    coverLetterUrl: ''
  };

  constructor() {
    const data = this.dialogRef['_containerInstance']['_config'].data;
    if (data) {
      this.jobId = data.jobId;
      this.documentUrls = {
        linkedInUrl: data.linkedInUrl || '',
        resumeUrl: data.resumeUrl || '',
        coverLetterUrl: data.coverLetterUrl || ''
      };
    }

    this.update$.pipe(
      debounceTime(1000),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.saveDocuments();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected closeModal(): void {
    this.saveDocuments(); // One final save on close
    this.dialogRef.close();
  }

  protected onUrlChange(): void {
    this.update$.next();
  }

  private saveDocuments(): void {
    if (this.jobId) {
      this.service.updateMultipleFields(this.jobId, this.documentUrls);
    }
  }
}
