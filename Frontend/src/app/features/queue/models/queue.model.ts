export enum QueueStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

export interface QueueItem {
    _id: string;
    url: string;
    html: string;
    status: QueueStatus;
    executionURL?: string;
    createdAt: string;
    updatedAt: string;
}
