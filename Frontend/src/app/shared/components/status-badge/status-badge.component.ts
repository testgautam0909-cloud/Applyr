import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobStatus } from '../../../features/jobs/models/job.model';
import { JOB_STATUS_OPTIONS } from '../../../features/jobs/constants';

@Component({
    selector: 'app-status-badge',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './status-badge.component.html',
    styleUrl: './status-badge.component.scss'
})
export class StatusBadgeComponent {
    @Input({ required: true }) status!: JobStatus;
    @Input() editable = false;

    @Output() statusChange = new EventEmitter<JobStatus>();

    protected readonly statusOptions = JOB_STATUS_OPTIONS;

    protected getStatusClass(status: JobStatus): string {
        const base = 'status-' + status.toLowerCase().replace(/\s+/g, '-');
        return base;
    }

    protected onChange(newStatus: JobStatus): void {
        if (newStatus !== this.status) {
            this.statusChange.emit(newStatus);
        }
    }
}
