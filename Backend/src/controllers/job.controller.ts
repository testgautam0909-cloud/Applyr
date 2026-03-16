import type { Request, Response } from 'express';
import Job from '../model/job.model.js';
import { JobService } from '../services/job.service.js';
import type { AIJobData } from '../interface/job.interface.js';

const jobService = new JobService();

export const getJobs = async (req: Request, res: Response) => {
    try {
        const { search, status, page: rawPage, pageSize: rawPageSize } = req.query;
        let query: any = {};
        if (search) {
            const searchRegex = new RegExp(search as string, 'i');
            query.$or = [
                { jobTitle: searchRegex },
                { company: searchRegex },
                { location: searchRegex }
            ];
        }

        if (status) {
            const statusArray = Array.isArray(status) ? status : [status];
            query.status = { $in: statusArray };
        }

        const page = Math.max(1, Number(rawPage) || 1);
        const pageSize = Math.min(100, Math.max(1, Number(rawPageSize) || 10));
        const skip = (page - 1) * pageSize;

        const [jobs, total] = await Promise.all([
            Job.find(query).sort({ createdAt : -1 }).skip(skip).limit(pageSize),
            Job.countDocuments(query),
        ]);

        res.json({ jobs, total, page, pageSize });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createJob = async (req: Request, res: Response) => {
    try {
        const job = new Job(req.body);
        const newJob = await job.save();
        res.status(201).json(newJob);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updateJob = async (req: Request, res: Response) => {
    try {
        const updatedJob = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedJob) return res.status(404).json({ message: 'Job not found' });
        res.json(updatedJob);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteJob = async (req: Request, res: Response) => {
    try {
        const jobID = req.params.id;
        if (!jobID) return res.status(404).json({ message: 'Job not found' });
        const deletedJob = await jobService.deleteJob(jobID.toString());
        if (!deletedJob) return res.status(404).json({ message: 'Job not Deleted' });
        res.status(200).json({ message: 'Job deleted' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createJobFromAI = async (req: Request, res: Response) => {
    try {
        const aiJobData: AIJobData = req.body;
        if (!aiJobData.jobTitle || !aiJobData.company) {
            return res.status(400).json({
                message: 'jobTitle and company are required fields'
            });
        }

        const newJob = await jobService.createJobFromAI(aiJobData);
        res.status(201).json(newJob);
    } catch (error: any) {
        console.error('Error creating job from AI data:', error);
        res.status(500).json({ message: error.message });
    }
};