import type { Request, Response } from 'express';
import Job from '../model/job.model.js';

export const getJobs = async (req: Request, res: Response) => {
    try {
        const jobs = await Job.find().sort({ appliedDate: -1 });
        res.json(jobs);
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
        const job = await Job.findByIdAndDelete(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });
        res.json({ message: 'Job deleted' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
