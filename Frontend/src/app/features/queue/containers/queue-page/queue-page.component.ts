import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QueueService } from '../../services/queue.service';
import { QueueItem, QueueStatus } from '../../models/queue.model';
import { QueueTableComponent } from '../../components/queue-table/queue-table.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
    selector: 'app-queue-page',
    standalone: true,
    imports: [
        CommonModule,
        QueueTableComponent,
        MatDialogModule
    ],
    templateUrl: './queue-page.component.html',
    styleUrl: './queue-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class QueuePageComponent implements OnInit {
    protected readonly service = inject(QueueService);
    private readonly dialog = inject(MatDialog);

    protected readonly statusOptions = Object.values(QueueStatus);
    protected activeFilter = signal<QueueStatus | null>(null);

    // Local state
    protected items = signal<QueueItem[]>([]);
    protected loading = signal<boolean>(false);
    protected error = signal<string | null>(null);

    // Computed properties previously from service
    protected pendingCount = computed(() => this.items().filter(i => i.status === QueueStatus.PENDING).length);
    protected completedCount = computed(() => this.items().filter(i => i.status === QueueStatus.COMPLETED).length);
    protected failedCount = computed(() => this.items().filter(i => i.status === QueueStatus.FAILED).length);
    protected isEmpty = computed(() => this.items().length === 0);

    protected filteredItems = computed(() => {
        const currentItems = this.items();
        const filter = this.activeFilter();
        if (!filter) return currentItems;
        return currentItems.filter(i => i.status === filter);
    });

    ngOnInit(): void {
        this.fetchQueue();
    }

    protected fetchQueue(): void {
        this.loading.set(true);
        this.error.set(null);
        this.service.fetchQueue().subscribe({
            next: (data) => {
                this.items.set(data);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Failed to fetch queue', err);
                this.error.set(err.message || 'Unknown error');
                this.loading.set(false);
            }
        });
    }

    protected setFilter(status: QueueStatus | null): void {
        this.activeFilter.set(this.activeFilter() === status ? null : status);
    }

    protected onDeleteItem(item: QueueItem): void {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            width: '400px',
            data: {
                title: 'Delete Queue Item',
                message: `Are you sure you want to remove this item from the queue? This action cannot be undone.`,
                confirmText: 'Delete',
                isDestructive: true
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.service.deleteQueueItem(item._id).subscribe({
                    next: () => {
                        this.items.update(items => items.filter(i => i._id !== item._id));
                    },
                    error: (err) => console.error('Failed to delete item', err)
                });
            }
        });
    }

    protected onRetryItem(item: QueueItem): void {
        const updateData = { status: QueueStatus.PENDING };
        // Optimistic UI update
        const previousItems = [...this.items()];
        this.items.update(items => items.map(i => i._id === item._id ? { ...i, ...updateData } as QueueItem : i));
        
        this.service.updateQueueItem(item._id, updateData).subscribe({
            next: (updated) => {
                this.items.update(items => items.map(i => i._id === item._id ? updated : i));
            },
            error: (err) => {
                console.error('Failed to update queue item', err);
                this.items.set(previousItems); // Rollback
            }
        });
    }

    protected refresh(): void {
        this.fetchQueue();
    }
}
