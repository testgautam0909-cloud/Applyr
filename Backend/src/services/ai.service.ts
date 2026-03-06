import * as cheerio from 'cheerio';
import { config } from './config.js';
import { ModelRouter, ModelRole } from '../utils/modelRouter.js';
import { JobService } from './job.service.js';
import type { AIJobData, JobStatus } from '../interface/job.interface.js';

const DEFAULT_JOB: AIJobData = {
    jobTitle: '', company: '', location: 'Remote', techStack: [], experience: '',
    status: 'DISCOVERY', appliedDate: '', reminderDate: '', resumeUrl: '',
    coverLetterUrl: '', jobDescription: '', sourcePlatform: '', postURL: '', poc: [],
};

const VALID_STATUSES: JobStatus[] = [
    'DISCOVERY', 'NOT_APPLIED', 'APPLIED', 'PHONE_SCREEN', 'INTERVIEWING',
    'TECHNICAL_TEST', 'FINAL_ROUND', 'OFFER_RECEIVED', 'REJECTED', 'WITHDRAWN',
];

const PLATFORMS = [
    { name: 'LinkedIn', re: /linkedin\.com/i },
    { name: 'Indeed', re: /indeed\.com/i },
    { name: 'Glassdoor', re: /glassdoor\.com/i },
    { name: 'AngelList', re: /angel\.co|wellfound\.com/i },
    { name: 'HackerNews', re: /ycombinator/i },
    { name: 'Naukri', re: /naukri\.com/i },
    { name: 'Internshala', re: /internshala\.com/i },
];

export class JobExtractionService {
    private router: ModelRouter;
    private jobService: JobService;

    constructor() {
        this.router = new ModelRouter(config.googleApiKeys);
        this.jobService = new JobService();
    }

    private preprocessHtml(html: string): string {
        const $ = cheerio.load(html);
        $('script, style, noscript').remove();
        return $('body').text().replace(/\s+/g, ' ').trim().slice(0, config.maxTextLength);
    }

    private detectPlatform(url: string, text: string): string {
        return PLATFORMS.find(p => p.re.test(url) || p.re.test(text))?.name ?? 'Unknown';
    }

    private extractionPrompt(text: string, sourceUrl: string): string {
        return `Extract job info from the content below.
Source URL: ${sourceUrl || 'Unknown'}
Return ONLY valid JSON (no markdown):
{
  "jobTitle": string, "company": string, "location": string, "techStack": string[],
  "experience": string, "status": "DISCOVERY", "appliedDate": "", "reminderDate": "",
  "resumeUrl": "", "coverLetterUrl": "", "jobDescription": string, "sourcePlatform": string,
  "poc": [{ "name": string, "email": string, "mobile": string, "designation": "Recruiter" | "Hiring Manager" | "HR" | "Technical Lead" | "VP Engineering" | "Founder" | "CEO" | "Other" }]
}
jobDescription: structured string with sections:
**About the Company** | **Role Overview** | **Responsibilities** | **Requirements** |
**Qualifications** | **Nice to Have** | **Tech Stack** | **Application Process** | **Compensation & Benefits**
Rules: missing fields → "" or [], dates → YYYY-MM-DD, location = actual job location.
For 'poc.designation', use your best judgment to map their job title to one of the exact specified options.
CONTENT: ${text}`;
    }

    private async enrichJD(jobData: AIJobData): Promise<string> {
        if (jobData.jobDescription.trim().length < 50) return jobData.jobDescription;
        try {
            const tips = await this.router.callText(ModelRole.ENRICHMENT, `
You are an expert career coach. Generate "Resume Tailoring Tips" for this job.
Include: key skills/keywords to highlight, ATS keywords, summary customisation advice, red flags.
Be specific. No generic advice.
Job Title: ${jobData.jobTitle}
Company: ${jobData.company}
Job Description: ${jobData.jobDescription}
Return ONLY plain text starting with "**Resume Tailoring Tips**".`, 0.3);
            return `${jobData.jobDescription}\n\n---\n\n${tips.trim()}`;
        } catch {
            return jobData.jobDescription;
        }
    }

    async extractJobData(htmlContent: string, sourceUrl = '', _autoSave = true, enrichJD = true): Promise<AIJobData> {
        try {
            const text = this.preprocessHtml(htmlContent);
            const extracted = await this.router.callJSON<AIJobData>(ModelRole.EXTRACTION, this.extractionPrompt(text, sourceUrl));

            const result: AIJobData = {
                ...DEFAULT_JOB,
                ...extracted,
                postURL: sourceUrl || extracted.postURL || '',
                resumeUrl: '',
                coverLetterUrl: '',
                sourcePlatform: this.detectPlatform(sourceUrl, text),
            };

            if (!VALID_STATUSES.includes(result.status)) result.status = 'DISCOVERY';
            if (!result.location?.trim()) result.location = 'Remote';
            if (enrichJD) result.jobDescription = await this.enrichJD(result);

            return result;
        } catch (err) {
            return {
                ...DEFAULT_JOB,
                postURL: sourceUrl,
                sourcePlatform: this.detectPlatform(sourceUrl, ''),
                _extractionError: (err as Error).message
            } as any;
        }
    }
}