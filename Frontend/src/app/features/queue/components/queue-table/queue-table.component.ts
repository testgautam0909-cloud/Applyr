import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QueueItem, QueueStatus } from '../../models/queue.model';

@Component({
    selector: 'app-queue-table',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './queue-table.component.html',
    styleUrl: './queue-table.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class QueueTableComponent {
    @Input({ required: true }) items: QueueItem[] = [];
    @Output() delete = new EventEmitter<QueueItem>();
    @Output() retry = new EventEmitter<QueueItem>();

    protected getStatusClass(status: QueueStatus): string {
        switch (status) {
            case QueueStatus.PENDING: return 'badge-pending';
            case QueueStatus.COMPLETED: return 'badge-completed';
            case QueueStatus.FAILED: return 'badge-failed';
            default: return '';
        }
    }

    protected getStatusLabel(status: QueueStatus): string {
        switch (status) {
            case QueueStatus.PENDING: return 'Pending';
            case QueueStatus.COMPLETED: return 'Completed';
            case QueueStatus.FAILED: return 'Failed';
            default: return status;
        }
    }

    protected truncateUrl(url: string, maxLen = 50): string {
        return url.length > maxLen ? url.substring(0, maxLen) + '…' : url;
    }

    protected formatDate(dateStr: string): string {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
            ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
}
