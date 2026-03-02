export enum JobStatus {
    DISCOVERY = 'Discovery',
    NOT_APPLIED = 'Not Applied',
    APPLIED = 'Applied',
    PHONE_SCREEN = 'Phone Screen',
    INTERVIEWING = 'Interviewing',
    TECHNICAL_TEST = 'Technical Test',
    FINAL_ROUND = 'Final Round',
    OFFER_RECEIVED = 'Offer Received',
    REJECTED = 'Rejected',
    WITHDRAWN = 'Withdrawn',
}

export interface PointOfContact {
    name: string;
    email: string;
    mobile: string;
    designation: string;
}

export interface JobApplication {
    id: string;
    jobTitle: string;
    company: string;
    location: string;
    techStack: string[];
    experience: string;
    status: JobStatus;
    appliedDate: string; // stored as YYYY-MM-DD
    reminderDate: string; // stored as YYYY-MM-DD or ''
    linkedInUrl: string;
    resumeUrl: string;
    coverLetterUrl: string;
    poc: PointOfContact[];
    jobDescription: string;
    sourcePlatform: string;
}

export interface UpdateJobPayload {
    id: string;
    jobTitle: string;
    company: string;
    location: string;
    techStack: string[];
    experience: string;
    status: JobStatus;
    appliedDate: string;
    reminderDate: string;
    linkedInUrl: string;
    resumeUrl: string;
    coverLetterUrl: string;
    poc: PointOfContact[];
    jobDescription: string;
    sourcePlatform: string;
}
