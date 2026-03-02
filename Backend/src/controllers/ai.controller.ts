import type { Request, Response } from 'express';
import { JobExtractionService } from '../services/ai.service.js';
import { JobService } from '../services/job.service.js';

const jobExtractionService = new JobExtractionService();
const jobService = new JobService();

export async function extractFromHtml(req: Request, res: Response): Promise<void> {
    try {
        const { html, url, saveToDatabase = true } = req.body;
        if (!html || typeof html !== 'string') {
            res.status(400).json({ error: 'Missing or invalid HTML content' });
            return;
        }

        const jobData = await jobExtractionService.extractJobData(html, url || '');
        
        if (saveToDatabase) {
            try {
                const savedJob = await jobService.createJobFromAI(jobData);
                res.json({
                    message: 'Job extracted and saved successfully',
                    jobData: savedJob
                });
                return;
            } catch (saveError) {
                console.error('Failed to save job to database:', saveError);
                res.status(500).json({ 
                    error: 'Job extracted but failed to save to database',
                    extractedData: jobData,
                    saveError: (saveError as Error).message
                });
                return;
            }
        }
        
        res.json(jobData);
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function extractFromUrl(req: Request, res: Response): Promise<void> {
    try {
        const { url, saveToDatabase = false } = req.body;
        if (!url || typeof url !== 'string') {
            res.status(400).json({ error: 'Missing URL' });
            return;
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)',
            },
        });
        if (!response.ok) {
            res.status(400).json({ error: `Failed to fetch URL: ${response.statusText}` });
            return;
        }
        const html = await response.text();

        const jobData = await jobExtractionService.extractJobData(html, url);
        
        if (saveToDatabase) {
            try {
                const savedJob = await jobService.createJobFromAI(jobData);
                res.json({
                    message: 'Job extracted and saved successfully',
                    jobData: savedJob
                });
                return;
            } catch (saveError) {
                console.error('Failed to save job to database:', saveError);
                res.status(500).json({ 
                    error: 'Job extracted but failed to save to database',
                    extractedData: jobData,
                    saveError: (saveError as Error).message
                });
                return;
            }
        }
        
        res.json(jobData);
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}