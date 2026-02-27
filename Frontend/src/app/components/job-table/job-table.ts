import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { JobApplicationService } from '../../features/job-applications/api/job-application.service';
import { JobApplicationsStore } from '../../features/job-applications/store/job-applications.store';
import {
  JobApplication,
  JobStatus
} from '../../features/job-applications/types/job-application.type';
import {
  JOB_STATUS_OPTIONS,
  JOB_STATUS_COLORS,
} from '../../features/job-applications/constants';
import { formatDateForInput, formatDateConsistent } from '../../features/job-applications/utils/date-format.util';
import { EmptyStateComponent } from '../../features/job-applications/components/EmptyState/EmptyState.component';
import { AddContactModalComponent } from '../../features/job-applications/components/add-contact-modal/add-contact-modal.component';
import { TechStackModalComponent } from '../../features/job-applications/components/tech-stack-modal/tech-stack-modal.component';
import { DocumentsModalComponent } from '../../features/job-applications/components/documents-modal/documents-modal.component';
import { MultiContactModalComponent } from '../../features/job-applications/components/multi-contact-modal/multi-contact-modal.component';

import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-job-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './job-table.html',
  styleUrl: './job-table.scss',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    MatPaginatorModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    EmptyStateComponent,
  ],
})
export class JobTable {
  protected readonly service = inject(JobApplicationService);
  protected readonly store = inject(JobApplicationsStore);
  protected readonly themeService = inject(ThemeService);
  private readonly dialog = inject(Dialog);
  private readonly matDialog = inject(MatDialog);

  protected readonly editingJobId = signal<string | null>(null);
  protected readonly editingField = signal<string | null>(null);
  private updateTimeout?: any;

  protected readonly statusOptions = JOB_STATUS_OPTIONS;
  protected readonly statusColors = JOB_STATUS_COLORS;
  protected readonly displayedColumns: string[] = [
    'jobTitle',
    'company',
    'location',
    'techStack',
    'status',
    'appliedDate',
    'reminderDate',
    'poc',
    'documents',
    'actions',
  ];




  protected formatDate(dateStr: string): string {
    return formatDateConsistent(dateStr);
  }

  protected formatDateForEdit(dateStr: string): string {
    return formatDateForInput(dateStr);
  }

  protected getStatusColor(status: JobStatus): string {
    return this.statusColors[status] ?? '#9ca3af';
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.store.setSearchTerm(value);
    this.store.setPage(0);
  }

  protected onStatusFilter(value: JobStatus | ''): void {

    this.store.setStatusFilter(value ? [value] : []);
  }

  protected onMultiStatusFilter(value: JobStatus[]): void {
    this.store.setStatusFilter(value);
  }

  protected clearSearch(): void {
    this.store.setSearchTerm('');
  }

  protected toggleStatusFilter(status: JobStatus): void {
    const current = this.store.statusFilter();
    let updated;
    if (current.includes(status)) {
      updated = current.filter((s: JobStatus) => s !== status);
    } else {
      updated = [...current, status];
    }
    this.store.setStatusFilter(updated);
    this.store.setPage(0);
  }

  protected onPageChange(event: PageEvent): void {
    this.store.setPage(event.pageIndex);
    this.store.setPageSize(event.pageSize);
  }

  protected onSort(column: string): void {
    this.store.setSort(column);
  }

  protected getSortIcon(column: string): string {
    if (this.store.sortColumn() !== column) {
      return 'unfold_more';
    }
    return this.store.sortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  protected async addJob(): Promise<void> {
    const id = await this.service.addBlankJob();
    if (id) {
      this.store.setPage(0);
      const job = this.service.jobs().find(j => j.id === id);
      if (job) {
        this.openJobModal(job);
      }
    }
  }

  protected addPOC(jobId: string): void {
    this.matDialog.open(AddContactModalComponent, {
      width: '500px',
      disableClose: false,
      data: { jobId },
      panelClass: 'add-contact-dialog'
    });
  }

  protected removePOC(jobId: string, index: number): void {
    const job = this.service.jobs().find(j => j.id === jobId);
    if (!job) return;

    const updatedPOCs = job.poc.filter((_, i) => i !== index);
    this.service.updateJobField(jobId, 'poc', updatedPOCs);
  }

  protected updatePOC(jobId: string, index: number, field: string, value: string): void {
    const job = this.service.jobs().find(j => j.id === jobId);
    if (!job) return;

    const updatedPOCs = job.poc.map((p, i) => i === index ? { ...p, [field]: value } : p);
    this.service.updateJobField(jobId, 'poc', updatedPOCs);
  }

  protected openTechStackModal(job: JobApplication): void {
    this.matDialog.open(TechStackModalComponent, {
      width: '500px',
      data: { jobId: job.id, techStack: [...job.techStack] },
      panelClass: 'tech-stack-modal'
    });
  }

  protected editPOC(jobId: string, pocIndex: number): void {
    const job = this.service.jobs().find(j => j.id === jobId);
    if (!job || job.poc[pocIndex] === undefined) return;

    this.matDialog.open(AddContactModalComponent, {
      width: '500px',
      data: { jobId, contact: job.poc[pocIndex], pocIndex },
      panelClass: 'add-contact-dialog'
    });
  }

  protected openMultiContactModal(job: JobApplication): void {
    this.matDialog.open(MultiContactModalComponent, {
      width: '600px',
      data: { jobId: job.id, contacts: [...job.poc] },
      panelClass: 'multi-contact-modal'
    });
  }

  protected openDocumentsModal(job: JobApplication): void {
    this.matDialog.open(DocumentsModalComponent, {
      width: '500px',
      data: {
        jobId: job.id,
        linkedInUrl: job.linkedInUrl,
        resumeUrl: job.resumeUrl,
        coverLetterUrl: job.coverLetterUrl
      },
      panelClass: 'documents-modal'
    });
  }

  protected openJobModal(job: JobApplication): void {
    this.showSuccessToast(`Job created. Click on fields to edit.`);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.saveEditing();
    }
  }

  protected hasLink(job: JobApplication): boolean {
    return !!(job.linkedInUrl || job.resumeUrl || job.coverLetterUrl);
  }

  protected readonly lastDeletedJob = signal<JobApplication | null>(null);
  protected readonly showUndoNotification = signal(false);
  private undoTimeout?: any;

  protected updateStatus(jobId: string, status: JobStatus): void {
    this.service.updateJobField(jobId, 'status', status);
  }

  protected deleteJob(id: string): void {
    const job = this.service.jobs().find((j) => j.id === id);
    if (!job) return;

    this.lastDeletedJob.set(job);
    this.service.deleteJob(id);
    this.showUndoNotification.set(true);

    if (this.undoTimeout) clearTimeout(this.undoTimeout);
    this.undoTimeout = setTimeout(() => {
      this.showUndoNotification.set(false);
      this.lastDeletedJob.set(null);
    }, 5000);
  }

  protected confirmDelete(job: JobApplication): void {
    this.deleteJob(job.id);
  }

  protected startEditing(jobId: string, field: string): void {
    this.editingJobId.set(jobId);
    this.editingField.set(field);
  }

  protected stopEditing(): void {
    this.editingJobId.set(null);
    this.editingField.set(null);
    if (this.updateTimeout) clearTimeout(this.updateTimeout);
  }

  protected onFieldUpdate(jobId: string, field: string, value: any): void {
    if (this.updateTimeout) clearTimeout(this.updateTimeout);

    this.updateTimeout = setTimeout(() => {
      this.service.updateJobField(jobId, field as any, value);
    }, 1000);
  }

  protected saveEditing(): void {
    this.stopEditing();
  }

  protected showSuccessToast(message: string): void {
    console.log('✅ Success:', message);
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: var(--mat-sys-body-medium-font);
      font-size: var(--mat-sys-body-medium-size);
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }

  protected undoDelete(): void {
    const job = this.lastDeletedJob();
    if (job) {
      this.service.restoreJob(job);
      this.showUndoNotification.set(false);
      this.lastDeletedJob.set(null);
      if (this.undoTimeout) clearTimeout(this.undoTimeout);
    }
  }
}
