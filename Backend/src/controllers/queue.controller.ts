import type { Request, Response } from 'express';
import Queue from '../model/queue.model.js';
import mongoose from 'mongoose';

export const addJobToQueue = async (req: Request, res: Response) => {
    try {
        const { url, html, status, executionURL } = req.body;
        if (!url || !html) {
            return res.status(400).json({ message: 'URL and HTML are required' });
        }
        const queue = new Queue({ url, html, status: status || 'pending', executionURL });
        await queue.save();
        const pandingCount = await Queue.countDocuments({ status: 'pending' });
        res.status(201).json({ queue, pandingCount });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateJobInQueue = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { html, status, executionURL } = req.body;
        const queue = await Queue.findByIdAndUpdate(id, { html, status, executionURL }, { new: true });
        if (!queue) {
            return res.status(404).json({ message: 'Queue not found' });
        }
        res.json(queue);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getQueue = async (req: Request, res: Response) => {
    try {
        const queue = await Queue.find();
        res.json(queue);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteJobInQueue = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid queue item ID' });
        }
        const queue = await Queue.findByIdAndDelete(id);
        if (!queue) {
            return res.status(404).json({ message: 'Queue not found' });
        }
        const pandingCount = await Queue.countDocuments({ status: 'pending' });
        res.status(200).json({ queue, pandingCount });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getFirstPendingJob = async (req: Request, res: Response) => {
    try {
        const queue = await Queue.findOne({ status: 'pending' });
        res.json(queue);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
