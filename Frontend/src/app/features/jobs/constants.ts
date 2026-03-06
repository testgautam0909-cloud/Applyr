import { JobStatus } from './models/job.model';

export const JOB_STATUS_OPTIONS: JobStatus[] = Object.values(JobStatus);

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
    [JobStatus.DISCOVERY]: '#6366f1',       // Indigo
    [JobStatus.NOT_APPLIED]: '#94a3b8',     // Slate
    [JobStatus.APPLIED]: '#3b82f6',        // Blue
    [JobStatus.PHONE_SCREEN]: '#8b5cf6',   // Violet
    [JobStatus.INTERVIEWING]: '#f59e0b',   // Amber
    [JobStatus.TECHNICAL_TEST]: '#10b981',  // Emerald
    [JobStatus.FINAL_ROUND]: '#ec4899',    // Pink
    [JobStatus.OFFER_RECEIVED]: '#059669', // Green
    [JobStatus.REJECTED]: '#ef4444',       // Red
    [JobStatus.WITHDRAWN]: '#6b7280',     // Gray
};
