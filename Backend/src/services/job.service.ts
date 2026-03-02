import Job from '../model/job.model.js';
import type { IJob } from '../model/job.model.js';
import type { AIJobData } from '../interface/job.interface.js';

export class JobService {
    async getAllJobs(): Promise<IJob[]> {
        try {
            return await Job.find().sort({ createdAt: -1 });
        } catch (error) {
            throw new Error(`Failed to fetch jobs: ${error}`);
        }
    }

    async getJobById(id: string): Promise<IJob | null> {
        try {
            return await Job.findById(id);
        } catch (error) {
            throw new Error(`Failed to fetch job: ${error}`);
        }
    }

    async createJob(jobData: Partial<IJob>): Promise<IJob> {
        try {
            const job = new Job(jobData);
            return await job.save();
        } catch (error) {
            throw new Error(`Failed to create job: ${error}`);
        }
    }

    async createJobFromAI(aiJobData: AIJobData): Promise<IJob> {
        try {
            const jobData: Partial<IJob> = {
                jobTitle: aiJobData.jobTitle,
                company: aiJobData.company,
                location: aiJobData.location,
                techStack: aiJobData.techStack,
                experience: aiJobData.experience,
                status: aiJobData.status,
                appliedDate: aiJobData.appliedDate,
                reminderDate: aiJobData.reminderDate,
                linkedInUrl: aiJobData.linkedInUrl,
                resumeUrl: aiJobData.resumeUrl,
                coverLetterUrl: aiJobData.coverLetterUrl,
                poc: aiJobData.poc,
            };

            const job = new Job(jobData);
            return await job.save();
        } catch (error) {
            throw new Error(`Failed to create job from AI data: ${error}`);
        }
    }

    async updateJob(id: string, jobData: Partial<IJob>): Promise<IJob | null> {
        try {
            return await Job.findByIdAndUpdate(id, jobData, { new: true });
        } catch (error) {
            throw new Error(`Failed to update job: ${error}`);
        }
    }

    async deleteJob(id: string): Promise<IJob | null> {
        try {
            return await Job.findByIdAndDelete(id);
        } catch (error) {
            throw new Error(`Failed to delete job: ${error}`);
        }
    }

    async getJobsByStatus(status: string): Promise<IJob[]> {
        try {
            return await Job.find({ status }).sort({ createdAt: -1 });
        } catch (error) {
            throw new Error(`Failed to fetch jobs by status: ${error}`);
        }
    }
}