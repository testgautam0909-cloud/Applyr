import { Document } from 'mongoose';

export interface PointOfContact {
    name: string;
    email: string;
    mobile: string;
    designation: string;
}

export interface AIJobData {
    jobTitle: string;
    company: string;
    location: string;
    techStack: string[];
    experience: string;
    status: JobStatus;
    appliedDate: string;        // YYYY-MM-DD
    reminderDate: string;        // YYYY-MM-DD
    reminderNote?: string;
    resumeUrl: string;
    coverLetterUrl: string;
    poc: PointOfContact[];
    sourcePlatform: string;     // optional, added by our service
    jobDescription: string;
    _extractionError?: string;   // for error reporting
    postURL: string;
}

export interface IPOC {
    name: string;
    email: string;
    mobile: string;
    designation: string;
}

export interface IJob extends Document {
    jobTitle: string;
    company: string;
    location: string;
    techStack: string[];
    experience: string;
    status: string;
    appliedDate: string;
    reminderDate: string;
    reminderNote?: string;
    resumeUrl: string;
    coverLetterUrl: string;
    jobDescription: string;
    sourcePlatform: string;
    poc: IPOC[];
    postURL: string;
}

export type JobStatus = 'DISCOVERY' | 'NOT_APPLIED' | 'APPLIED' | 'PHONE_SCREEN' | 'INTERVIEWING' | 'TECHNICAL_TEST' | 'FINAL_ROUND' | 'OFFER_RECEIVED' | 'REJECTED' | 'WITHDRAWN';
