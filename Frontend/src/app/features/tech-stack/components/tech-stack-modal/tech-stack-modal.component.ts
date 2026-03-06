import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { JobsService } from '../../../jobs/services/jobs.service';

@Component({
  selector: 'app-tech-stack-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
  ],
  template: `
    <div class="premium-modal shadow-lg">
      <div class="modal-header-premium d-flex justify-content-between align-items-center">
        <h4 class="mb-0 fw-bold">Tech Stack</h4>
        <button class="btn-close shadow-none" (click)="closeModal()"></button>
      </div>
      
      <div class="modal-body p-4">
        <label class="form-label small fw-bold text-muted mb-3">Add or remove technologies for this role.</label>
        
        <div class="tech-grid mb-4">
          @for (tech of techStack; track tech) {
            <span class="premium-chip">
              {{ tech }}
              <i class="bi bi-x-circle-fill ms-2 remove-icon" (click)="removeTech(tech)"></i>
            </span>
          }
          @if (techStack.length === 0) {
            <div class="text-center py-4 text-muted opacity-50 border rounded-3 border-dashed">
              <i class="bi bi-code-slash fs-2 d-block mb-1"></i>
              No tech added
            </div>
          }
        </div>
        
        <div class="input-group-premium mb-4">
            <span class="input-icon">
                <i class="bi bi-plus-circle"></i>
            </span>
            <input 
                type="text" 
                class="premium-input-field" 
                [(ngModel)]="newTech" 
                (keydown.enter)="addTech()" 
                placeholder="Type technology and press Enter">
        </div>

        <div class="quick-add mb-1">
            <p class="small fw-bold text-muted mb-2">Suggestions</p>
            <div class="d-flex flex-wrap gap-1">
                @for (tech of suggestions(); track tech) {
                    <button class="btn btn-sm btn-outline-secondary rounded-pill border-0 bg-light-purple px-2 py-1" 
                            style="font-size: 11px;" (click)="quickAdd(tech)">
                        + {{ tech }}
                    </button>
                }
            </div>
        </div>
      </div>

      <div class="modal-footer-premium d-flex justify-content-end gap-2 p-3 border-top">
        <button class="btn btn-link text-muted text-decoration-none fw-bold" (click)="closeModal()">Cancel</button>
        <button class="btn btn-primary px-4 fw-bold rounded-pill shadow-sm" (click)="saveAndClose()">Save Changes</button>
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

    .tech-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      min-height: 40px;
    }

    .premium-chip {
        background: var(--primary-glow);
        color: var(--primary-vibrant);
        padding: 8px 16px;
        border-radius: 12px;
        font-size: 0.9rem;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        border: 1px solid rgba(124, 58, 237, 0.1);
        transition: all 0.2s ease;
        
        &:hover {
            transform: translateY(-1px);
            background: rgba(124, 58, 237, 0.1);
        }
    }

    .bg-light-purple {
        background: var(--primary-glow) !important;
        color: var(--primary-vibrant);
        border: 1px solid rgba(124, 58, 237, 0.05) !important;
        &:hover { background: rgba(124, 58, 237, 0.15) !important; }
    }

    .input-group-premium {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
    }

    .input-icon {
        position: absolute;
        left: 16px;
        color: var(--primary-vibrant);
        z-index: 10;
        display: flex;
        align-items: center;
        pointer-events: none;
    }

    .premium-input-field {
        width: 100%;
        height: 48px;
        padding-left: 44px;
        padding-right: 16px;
        background: var(--card-bg);
        color: var(--text-main);
        border: 1px solid var(--glass-border);
        border-radius: 12px;
        font-size: 0.95rem;
        transition: all 0.2s ease;
        
        &::placeholder { color: var(--text-muted); opacity: 0.6; }
        
        &:focus {
            outline: none;
            border-color: var(--primary-vibrant);
            box-shadow: 0 0 0 4px var(--primary-glow);
            background: var(--bg-app);
        }
    }

    .border-dashed { border-style: dashed !important; border-color: var(--glass-border) !important; }

    .btn-primary {
        background: var(--primary-vibrant);
        border: none;
        height: 44px;
        padding: 0 24px;
        border-radius: 12px;
        transition: all 0.2s ease;
        &:hover { 
            background: #6D28D9; 
            transform: translateY(-1px);
            box-shadow: 0 4px 12px var(--primary-glow);
        }
    }

    .btn-link {
        color: var(--text-muted);
        &:hover { color: var(--text-main); }
    }
  `]
})
export class TechStackModalComponent {
  private readonly dialogRef = inject(MatDialogRef<TechStackModalComponent>);
  private readonly data = inject(MAT_DIALOG_DATA);
  private readonly service = inject(JobsService);

  techStack: string[] = [];
  jobId: string = '';
  newTech = '';

  readonly commonTechs = [
    'Angular', 'React', 'TypeScript', 'Node.js', 'Python', 'Go', 'Docker', 'AWS'
  ];

  suggestions = () => {
    return this.commonTechs.filter(t => !this.techStack.includes(t));
  }

  constructor() {
    if (this.data) {
      this.jobId = this.data.jobId;
      this.techStack = [...(this.data.techStack || [])];
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
      }
      this.newTech = '';
    }
  }

  protected quickAdd(tech: string): void {
    if (!this.techStack.includes(tech)) {
      this.techStack = [...this.techStack, tech];
    }
  }

  protected removeTech(tech: string): void {
    this.techStack = this.techStack.filter(t => t !== tech);
  }

  protected saveAndClose(): void {
    if (this.jobId) {
      this.service.updateJobField(this.jobId, 'techStack', this.techStack);
    }
    this.dialogRef.close();
  }
}
