import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { JobApplicationService } from '../../api/job-application.service';

@Component({
  selector: 'app-tech-stack-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatChipsModule,
  ],
  template: `
    <div class="modal-container">
      <div class="modal-header">
        <h2>Edit Tech Stack</h2>
        <button mat-icon-button (click)="closeModal()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      
      <div class="modal-content">
        <div class="tech-chips-container">
          @for (tech of techStack; track tech) {
            <span class="tech-chip">
              {{ tech }}
              <button mat-icon-button class="remove-tech-btn" (click)="removeTech(tech)">
                <mat-icon>close</mat-icon>
              </button>
            </span>
          }
          
          @if (techStack.length === 0) {
            <span class="empty-message">No technologies added yet</span>
          }
        </div>
        
        <mat-form-field appearance="outline" class="add-tech-field">
          <mat-label>Add Technology</mat-label>
          <input 
            matInput 
            [(ngModel)]="newTech" 
            (keydown.enter)="addTech()" 
            placeholder="Type technology and press Enter"
            #techInput
          >
        </mat-form-field>
        
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
    
    .tech-chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
      min-height: 40px;
    }
    
    .tech-chip {
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: 20px;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      font-size: 12px;
      font-weight: 500;
      border: 1px solid var(--mat-sys-outline-variant);
      gap: 4px;
    }
    
    .remove-tech-btn {
      width: 20px !important;
      height: 20px !important;
      padding: 2px !important;
      min-width: 20px;
      
      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }
    
    .empty-message {
      color: var(--mat-sys-outline);
      font-style: italic;
      font-size: 14px;
    }
    
    .add-tech-field {
      width: 100%;
      margin-bottom: 24px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }

    .save-btn {
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
    }
  `]
})
export class TechStackModalComponent {
  private readonly dialogRef = inject(MatDialogRef<TechStackModalComponent>);
  private readonly service = inject(JobApplicationService);
  
  techStack: string[] = [];
  jobId: string = '';
  newTech = '';
  
  constructor() {
    const data = this.dialogRef['_containerInstance']['_config'].data;
    if (data) {
      this.jobId = data.jobId;
      this.techStack = [...(data.techStack || [])];
    }
  }

  protected closeModal(): void {
    this.dialogRef.close();
  }

  protected addTech(): void {
    if (this.newTech.trim()) {
      const trimmedTech = this.newTech.trim();
      if (!this.techStack.includes(trimmedTech)) {
        this.techStack = [...this.techStack, trimmedTech];
        this.save();
      }
      this.newTech = '';
    }
  }
  
  protected removeTech(tech: string): void {
    this.techStack = this.techStack.filter(t => t !== tech);
    this.save();
  }

  private save(): void {
    if (this.jobId) {
      this.service.updateJobField(this.jobId, 'techStack', this.techStack);
    }
  }
}
