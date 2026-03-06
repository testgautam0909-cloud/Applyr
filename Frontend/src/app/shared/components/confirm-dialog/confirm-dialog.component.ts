import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

@Component({
    selector: 'app-confirm-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule],
    template: `
    <div class="confirm-dialog" [class.destructive]="data.isDestructive">
      <div class="dialog-header">
        <h3 class="dialog-title">{{ data.title }}</h3>
      </div>
      <div class="dialog-body">
        <p class="dialog-message">{{ data.message }}</p>
      </div>
      <div class="dialog-footer">
        <button class="btn-cancel" (click)="onCancel()">{{ data.cancelText || 'Cancel' }}</button>
        <button class="btn-confirm" [class.btn-destructive]="data.isDestructive" (click)="onConfirm()">
          {{ data.confirmText || 'Confirm' }}
        </button>
      </div>
    </div>
  `,
    styles: [`
    .confirm-dialog {
      padding: 24px;
      border-radius: 16px;
      background: white;
      font-family: 'Inter', sans-serif;
    }
    .dialog-header { margin-bottom: 12px; }
    .dialog-title {
      font-size: 1.2rem;
      font-weight: 700;
      margin: 0;
      color: #111827;
    }
    .dialog-body { margin-bottom: 24px; }
    .dialog-message {
      font-size: 0.95rem;
      color: #4B5563;
      margin: 0;
      line-height: 1.5;
    }
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    button {
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
    }
    .btn-cancel {
      background: #F3F4F6;
      color: #4B5563;
      border-color: #E5E7EB;
      &:hover { background: #E5E7EB; }
    }
    .btn-confirm {
      background: #7C3AED;
      color: white;
      &:hover { background: #6D28D9; box-shadow: 0 4px 12px rgba(124,58,237,0.3); }
    }
    .btn-destructive {
      background: #EF4444;
      &:hover { background: #DC2626; box-shadow: 0 4px 12px rgba(239,68,68,0.3); }
    }
  `]
})
export class ConfirmDialogComponent {
    protected readonly data: ConfirmDialogData = inject(MAT_DIALOG_DATA);
    private readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);

    onCancel(): void {
        this.dialogRef.close(false);
    }

    onConfirm(): void {
        this.dialogRef.close(true);
    }
}
