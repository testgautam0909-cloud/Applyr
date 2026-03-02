import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import { config } from './config.js';
import type { AIJobData, JobStatus } from '../interface/job.interface.js';
import { JobService } from './job.service.js';

const DEFAULT_JOB_STRUCTURE: AIJobData = {
    jobTitle: '',
    company: '',
    location: 'Remote',
    techStack: [],
    experience: '',
    status: 'NOT_APPLIED',
    appliedDate: '',
    reminderDate: '',
    linkedInUrl: '',
    resumeUrl: '',
    coverLetterUrl: '',
    jobDescription: '',
    sourcePlatform: '',
    poc: [],
};

export class JobExtractionService {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private jobService: JobService;

    constructor() {
        this.genAI = new GoogleGenerativeAI(config.googleApiKey!);
        this.model = this.genAI.getGenerativeModel({
            model: config.model,
            generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json',
            },
        });
        this.jobService = new JobService();
    }

    private preprocessHtml(html: string): string {
        const $ = cheerio.load(html);
        $('script, style, noscript').remove();
        const text = $('body').text().replace(/\s+/g, ' ').trim();
        return text.slice(0, config.maxTextLength);
    }


    private buildExtractionPrompt(text: string, sourceUrl: string): string {
        return `
Extract job application information from the following content.

Source URL: ${sourceUrl || 'Unknown'}

Return ONLY a valid JSON object matching this exact TypeScript interface:

interface JobData {
    jobTitle: string;
    company: string;
    location: string;
    techStack: string[];
    experience: string;
    status: "NOT_APPLIED" | "APPLIED" | "INTERVIEWING" | "OFFER" | "REJECTED";
    appliedDate: string;        // YYYY-MM-DD if available
    reminderDate: string;        // YYYY-MM-DD if available
    linkedInUrl: string;
    resumeUrl: string;
    coverLetterUrl: string;
    jobDescription: string;
    sourcePlatform: string;
    poc: {
        name: string;
        email: string;
        mobile: string;
        designation: string;
    }[];
}

Rules:
- If not found, use "" or [].
- Extract all technologies mentioned.
- Experience examples: "3+ years", "Senior", "Entry level".
- Normalize dates to YYYY-MM-DD if present.
- If this is a LinkedIn post, extract any job-related info available.
- Do not include explanations or markdown.

CONTENT:
${text}
`;
    }


    private safeJsonParse(text: string): any {
        try {
            return JSON.parse(text);
        } catch {
            const cleaned = text
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            return JSON.parse(cleaned);
        }
    }

    private async callGeminiWithRetry(prompt: string): Promise<string> {
        let lastError: Error | null = null;
        for (let i = 0; i < config.maxRetries; i++) {
            try {
                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                return response.text();
            } catch (error) {
                lastError = error as Error;
                console.log(`Retry ${i + 1}/${config.maxRetries} after error:`, error);
                if (i < config.maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
                }
            }
        }
        throw lastError || new Error('Failed after retries');
    }

    private detectPlatform(url: string, text: string): string {
        const platforms = [
            { name: 'LinkedIn', pattern: /linkedin\.com/i },
            { name: 'Indeed', pattern: /indeed\.com/i },
            { name: 'Glassdoor', pattern: /glassdoor\.com/i },
            { name: 'AngelList', pattern: /angel\.co|wellfound\.com/i },
            { name: 'HackerNews', pattern: /ycombinator/i },
        ];
        const found = platforms.find(p => p.pattern.test(url) || p.pattern.test(text));
        return found?.name || 'Unknown';
    }

    async extractJobData(htmlContent: string, sourceUrl: string = '', autoSave: boolean = true): Promise<AIJobData> {
        try {
            const cleanedText = this.preprocessHtml(htmlContent);
            const prompt = this.buildExtractionPrompt(cleanedText, sourceUrl);

            const rawText = await this.callGeminiWithRetry(prompt);
            const extractedData = this.safeJsonParse(rawText);

            const result: AIJobData = {
                ...DEFAULT_JOB_STRUCTURE,
                ...extractedData,
                linkedInUrl: sourceUrl || extractedData.linkedInUrl || '',
                sourcePlatform: this.detectPlatform(sourceUrl, cleanedText),
            };

            if (!['NOT_APPLIED', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED'].includes(result.status)) {
                result.status = 'NOT_APPLIED';
            }

            if (!result.location) {
                result.location = 'Remote';
            }

            return result;
        } catch (error) {
            console.error('Extraction failed:', error);
            return {
                ...DEFAULT_JOB_STRUCTURE,
                linkedInUrl: sourceUrl,
                _extractionError: error as string,
                sourcePlatform: this.detectPlatform(sourceUrl, ''),
            };
        }
    }
}