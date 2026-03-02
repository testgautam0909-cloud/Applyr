import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobApplication } from '../../models/job.model';
import { JobTableRowComponent } from '../job-table-row/job-table-row.component';
import { JobTableHeaderComponent } from '../job-table-header/job-table-header.component';

@Component({
  selector: 'app-job-table',
  standalone: true,
  imports: [CommonModule, JobTableRowComponent, JobTableHeaderComponent],
  templateUrl: './job-table.component.html',
  styleUrl: './job-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobTableComponent {
  @Input({ required: true }) jobs: JobApplication[] = [];
  @Input() sortColumn = '';
  @Input() sortDirection: 'asc' | 'desc' = 'asc';

  @Output() sort = new EventEmitter<any>();
  @Output() updateField = new EventEmitter<{ id: string, field: string, value: any }>();
  @Output() delete = new EventEmitter<string>();
  @Output() openContacts = new EventEmitter<JobApplication>();
  @Output() addContact = new EventEmitter<string>();
  @Output() openTechStack = new EventEmitter<JobApplication>();

  protected onOpenContacts(job: JobApplication): void {
    this.openContacts.emit(job);
  }

  protected onAddContact(jobId: string): void {
    this.addContact.emit(jobId);
  }

  protected onOpenTechStack(job: JobApplication): void {
    this.openTechStack.emit(job);
  }
}
