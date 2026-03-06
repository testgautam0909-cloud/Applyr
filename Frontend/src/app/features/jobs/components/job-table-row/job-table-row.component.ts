import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobApplication, JobStatus } from '../../models/job.model';
import { InlineEditComponent } from '../../../../shared/components/inline-edit/inline-edit.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TagChipComponent } from '../../../../shared/components/tag-chip/tag-chip.component';

@Component({
    selector: 'tr[app-job-table-row]',
    standalone: true,
    imports: [
        CommonModule,
        InlineEditComponent,
        StatusBadgeComponent,
        TagChipComponent
    ],
    templateUrl: './job-table-row.component.html',
    styleUrl: './job-table-row.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobTableRowComponent {
    @Input({ required: true }) job!: JobApplication;

    @Output() updateField = new EventEmitter<{ id: string, field: string, value: any }>();
    @Output() delete = new EventEmitter<JobApplication>();
    @Output() openContacts = new EventEmitter<JobApplication>();
    @Output() addContact = new EventEmitter<string>();
    @Output() openTechStack = new EventEmitter<JobApplication>();
    @Output() openJD = new EventEmitter<JobApplication>();
    @Output() openReminder = new EventEmitter<JobApplication>();

    protected onFieldChange(field: string, value: any): void {
        this.updateField.emit({ id: this.job.id, field, value });
    }

    protected isOverdue(dateStr: string): boolean {
        if (!dateStr) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const date = new Date(dateStr);
        return date < today;
    }
}
