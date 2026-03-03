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
    status: 'DISCOVERY',
    appliedDate: '',
    reminderDate: '',
    resumeUrl: '',
    coverLetterUrl: '',
    jobDescription: '',
    sourcePlatform: '',
    postURL: '',
    poc: [],
};

const VALID_STATUSES: JobStatus[] = [
    'DISCOVERY', 'NOT_APPLIED', 'APPLIED', 'PHONE_SCREEN',
    'INTERVIEWING', 'TECHNICAL_TEST', 'FINAL_ROUND',
    'OFFER_RECEIVED', 'REJECTED', 'WITHDRAWN'
];

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
    location: string;       // Extract the ACTUAL job location from the posting (e.g. "India", "Remote", "Hybrid - London"). Do NOT use search-bar placeholders.
    techStack: string[];    // All technologies, frameworks, tools mentioned
    experience: string;     // e.g. "3+ years", "Senior", "Entry level", "Associate"
    status: "DISCOVERY" | "NOT_APPLIED" | "APPLIED" | "PHONE_SCREEN" | "INTERVIEWING" | "TECHNICAL_TEST" | "FINAL_ROUND" | "OFFER_RECEIVED" | "REJECTED" | "WITHDRAWN";
    appliedDate: string;    // YYYY-MM-DD if available, otherwise ""
    reminderDate: string;   // YYYY-MM-DD if available, otherwise ""
    resumeUrl: string;      // Always leave as ""
    coverLetterUrl: string; // Always leave as ""
    jobDescription: string; // See detailed instructions below
    sourcePlatform: string;
    poc: {
        name: string;
        email: string;
        mobile: string;
        designation: string;
    }[];
}

**Instructions for jobDescription:**
Build a comprehensive, well-structured job description as a single string. Use markdown-style bold headings to separate sections. Include every detail from the posting that helps a candidate understand the role and tailor their resume.

Use this structure (skip any section that has no relevant information):

**About the Company**
[Brief company overview]

**Role Overview**
[Summary of the role: seniority, team, domain]

**Responsibilities**
- [Bullet points of key duties]

**Requirements**
- [Must-have skills and experience]

**Qualifications**
- [Degrees, certifications, or credentials]

**Nice to Have**
- [Preferred but not mandatory skills]

**Tech Stack**
- [Specific tools, frameworks, languages]

**Application Process**
- [Steps: upload resume, interview stages, etc.]

**Compensation & Benefits**
- [Salary range, remote policy, perks]

Be thorough. Include every role-relevant detail from the posting — this description will be used to tailor a resume and run AI matching.

**General Rules:**
- If a field is not found, use "" or [].
- Extract all technologies mentioned into techStack.
- Normalize dates to YYYY-MM-DD if present.
- If this is a LinkedIn post, extract any job-related info available.
- Do not include explanations or markdown outside the JSON object.

CONTENT:
${text}
`;
    }

    private async enrichJobDescription(jobData: AIJobData): Promise<string> {
        if (!jobData.jobDescription || jobData.jobDescription.trim().length < 50) {
            return jobData.jobDescription;
        }

        const prompt = `
You are an expert career coach and resume strategist.

Based on the following job description, generate a concise and practical "Resume Tailoring Tips" section. Include:
- Key technical skills and keywords to highlight prominently in a resume.
- Relevant experiences, projects, or achievements to emphasise.
- Industry buzzwords and ATS keywords from the JD.
- Specific advice for customising the resume summary/objective for this role.
- Any red flags or important nuances a candidate should be aware of.

Keep it practical, specific, and directly useful. Avoid generic advice.

Job Title: ${jobData.jobTitle}
Company: ${jobData.company}
Job Description:
${jobData.jobDescription}

Return ONLY the tips as plain text starting with the heading "**Resume Tailoring Tips**". Do not include any JSON or markdown code blocks.
`;
        try {
            const enrichmentModel = this.genAI.getGenerativeModel({
                model: config.model,
                generationConfig: {
                    temperature: 0.3,
                },
            });
            const result = await enrichmentModel.generateContent(prompt);
            const tips = (await result.response).text().trim();
            return `${jobData.jobDescription}\n\n---\n\n${tips}`;
        } catch (error) {
            console.error('JD enrichment failed, using original:', error);
            return jobData.jobDescription;
        }
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
            { name: 'Naukri', pattern: /naukri\.com/i },
            { name: 'Internshala', pattern: /internshala\.com/i },
        ];
        const found = platforms.find(p => p.pattern.test(url) || p.pattern.test(text));
        return found?.name || 'Unknown';
    }

    async extractJobData(
        htmlContent: string,
        sourceUrl: string = '',
        autoSave: boolean = true,
        enrichJD: boolean = true
    ): Promise<AIJobData> {
        try {
            const cleanedText = this.preprocessHtml(htmlContent);
            const prompt = this.buildExtractionPrompt(cleanedText, sourceUrl);

            const rawText = await this.callGeminiWithRetry(prompt);
            const extractedData = this.safeJsonParse(rawText);

            const result: AIJobData = {
                ...DEFAULT_JOB_STRUCTURE,
                ...extractedData,
                postURL: sourceUrl || extractedData.postURL || '',
                resumeUrl: '',       // handled separately
                coverLetterUrl: '',  // handled separately
                sourcePlatform: this.detectPlatform(sourceUrl, cleanedText),
            };

            if (!VALID_STATUSES.includes(result.status)) {
                result.status = 'DISCOVERY';
            }

            if (!result.location || result.location.trim() === '') {
                result.location = 'Remote';
            }

            console.log(result);

            if (enrichJD) {
                result.jobDescription = await this.enrichJobDescription(result);
            }
            return result;
        } catch (error) {
            console.error('Extraction failed:', error);
            return {
                ...DEFAULT_JOB_STRUCTURE,
                postURL: sourceUrl,
                _extractionError: (error as Error)?.message ?? String(error),
                sourcePlatform: this.detectPlatform(sourceUrl, ''),
            };
        }
    }
}