import type { Request, Response } from 'express';
import { JobExtractionService } from '../services/ai.service.js';
import { JobService } from '../services/job.service.js';
import { ResumeService } from '../services/resume.service.js';

const jobExtractionService = new JobExtractionService();
const jobService = new JobService();
const resumeService = new ResumeService();

export async function extractFromHtml(req: Request, res: Response): Promise<void> {
    try {
        const { html, url, saveToDatabase = true } = req.body;
        if (!html || typeof html !== 'string') {
            res.status(400).json({ error: 'Missing or invalid HTML content' });
            return;
        }

        const jobData = await jobExtractionService.extractJobData(html, url || '', true, true);

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

        const jobData = await jobExtractionService.extractJobData(html, url, true, true);

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

export async function updateBaseResume(req: Request, res: Response) {
    try {
        const updatedResume = await resumeService.updateBaseResume(req.body);
        res.json({
            success: true,
            data: updatedResume
        });
    } catch (error: any) {
        console.error('Controller error:', error);
        res.status(500).json({ error: error.message });
    }
}

export async function evaluateResume(req: Request, res: Response) {
    try {
        const { jobId } = req.body;
        if (!jobId) return res.status(400).json({ error: 'jobId is required' });

        const result = await resumeService.evaluateResume(jobId as string);
        return res.status(200).json(result);
    } catch (err: any) {
        console.error('[ResumeController] evaluateResume error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}

export async function buildResume(req: Request, res: Response) {
    try {
        const { evaluationId } = req.body;
        if (!evaluationId) return res.status(400).json({ error: 'evaluationId is required' });

        const result = await resumeService.buildResume(evaluationId as string);
        return res.status(200).json(result);
    } catch (err: any) {
        console.error('[ResumeController] buildResume error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}

export async function buildCoverLetter(req: Request, res: Response) {
    try {
        const { evaluationId } = req.body;
        if (!evaluationId) return res.status(400).json({ error: 'evaluationId is required' });

        const result = await resumeService.buildCoverLetter(evaluationId as string);
        return res.status(200).json(result);
    } catch (err: any) {
        console.error('[ResumeController] buildCoverLetter error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}

export async function getBaseResume(_req: Request, res: Response) {
    try {
        const resume = await resumeService.getBaseResume();
        if (!resume) return res.status(404).json({ error: 'Base resume not found' });
        return res.status(200).json(resume);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
}
