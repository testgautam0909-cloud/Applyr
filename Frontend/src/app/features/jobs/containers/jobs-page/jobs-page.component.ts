import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobsStore } from '../../store/jobs.store';
import { JobsService } from '../../services/jobs.service';
import { JobTableComponent } from '../../components/job-table/job-table.component';
import { JobStatus, JobApplication } from '../../models/job.model';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddContactModalComponent } from '../../../contacts/components/add-contact-modal/add-contact-modal.component';
import { MultiContactModalComponent } from '../../../contacts/components/multi-contact-modal/multi-contact-modal.component';
import { TechStackModalComponent } from '../../../tech-stack/components/tech-stack-modal/tech-stack-modal.component';
import { JobDescriptionModalComponent } from '../../components/job-description-modal/job-description-modal.component';
import { ReminderModalComponent } from '../../components/reminder-modal/reminder-modal.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
    selector: 'app-jobs-page',
    standalone: true,
    imports: [
        CommonModule,
        JobTableComponent,
        MatDialogModule
    ],
    templateUrl: './jobs-page.component.html',
    styleUrl: './jobs-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobsPageComponent implements OnInit {
    protected readonly store = inject(JobsStore);
    protected readonly service = inject(JobsService);
    private readonly dialog = inject(MatDialog);

    protected readonly statusOptions = Object.values(JobStatus);

    ngOnInit(): void {
        this.store.refresh();
    }

    protected onSearch(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.store.setSearchTerm(value);
    }

    protected onPageChange(page: number): void {
        this.store.setPage(page);
    }

    protected onPageSizeChange(event: Event): void {
        const size = Number((event.target as HTMLSelectElement).value);
        this.store.setPageSize(size);
    }

    protected toggleStatusFilter(status: JobStatus): void {
        const current = this.store.statusFilter();
        const updated = current.includes(status)
            ? current.filter(s => s !== status)
            : [...current, status];
        this.store.setStatusFilter(updated);
    }

    protected openContacts(job: JobApplication): void {
        this.dialog.open(MultiContactModalComponent, {
            data: { jobId: job.id, contacts: job.poc },
            width: '600px'
        });
    }

    protected addContact(jobId: string): void {
        this.dialog.open(AddContactModalComponent, {
            data: { jobId },
            width: '500px'
        });
    }

    protected openTechStack(job: JobApplication): void {
        this.dialog.open(TechStackModalComponent, {
            data: { jobId: job.id, techStack: job.techStack },
            width: '500px'
        });
    }

    protected onUpdateField(event: { id: string, field: string, value: any }): void {
        this.service.updateJobField(event.id, event.field as keyof JobApplication, event.value);
    }

    protected openJobDescription(job: JobApplication): void {
        this.dialog.open(JobDescriptionModalComponent, {
            data: { job },
            width: '760px',
            maxHeight: '90vh',
            panelClass: 'jd-dialog-panel'
        });
    }

    protected openReminderModal(job: JobApplication): void {
        this.dialog.open(ReminderModalComponent, {
            data: { job },
            width: '450px'
        });
    }

    protected onDeleteJob(job: JobApplication): void {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            width: '400px',
            data: {
                title: 'Delete Application',
                message: `Are you sure you want to delete the application for "${job.jobTitle}" at ${job.company}? This action cannot be undone.`,
                confirmText: 'Delete',
                isDestructive: true
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.service.deleteJob(job.id);
            }
        });
    }
}
