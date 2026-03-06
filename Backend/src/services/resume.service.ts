import Groq from 'groq-sdk';
import { config } from './config.js';
import { ModelRouter, ModelRole } from '../utils/modelRouter.js';
import { ResumeEvaluationService } from './resume.evaluation.service.js';
import { ResumeOptimizerService } from './resume.optimizer.service.js';
import { ResumePDFService } from './resume.pdf.service.js';
import { CoverLetterService } from './coverLetter.service.js';
import { GoogleDriveService } from './googleDrive.service.js';
import { JobService } from './job.service.js';
import { Evaluation } from '../model/evaluation.model.js';
import BaseResume from '../model/baseResume.model.js';
import type { IBaseResume } from '../interface/resume.interface.js';

export class ResumeService {
    private router: ModelRouter;
    private groq: Groq;
    private evaluator: ResumeEvaluationService;
    private optimizer: ResumeOptimizerService;
    private pdf: ResumePDFService;
    private coverLetter: CoverLetterService;
    private drive: GoogleDriveService;
    private jobService: JobService;

    constructor() {
        this.router = new ModelRouter(config.googleApiKeys);
        this.groq = new Groq({ apiKey: config.groqApiKey });
        this.evaluator = new ResumeEvaluationService(this.router);
        this.optimizer = new ResumeOptimizerService(this.router, this.callGroq.bind(this));
        this.pdf = new ResumePDFService();
        this.coverLetter = new CoverLetterService(this.router);
        this.drive = new GoogleDriveService();
        this.jobService = new JobService();
    }

    private async callGroq(prompt: string, wantJson: boolean): Promise<string> {
        if (!config.groqApiKey) {
            return this.router.callText(ModelRole.EXTRACTION, prompt, 0.2);
        }
        try {
            const params: any = {
                model: config.groqModel ?? 'llama-3.3-70b-versatile',
                temperature: 0.1,
                messages: [
                    {
                        role: 'system',
                        content: wantJson
                            ? 'You are an expert resume optimizer. Always respond with valid JSON only.'
                            : 'You are an expert resume optimizer.',
                    },
                    { role: 'user', content: prompt },
                ],
            };
            if (wantJson) params.response_format = { type: 'json_object' };
            const result = await this.groq.chat.completions.create(params);
            return result.choices[0]?.message?.content ?? '';
        } catch {
            return this.router.callText(ModelRole.EXTRACTION, prompt, 0.2);
        }
    }

    async getBaseResume() {
        return BaseResume.findOne();
    }

    async updateBaseResume(updateData: Partial<IBaseResume>) {
        const updated = await BaseResume.findOneAndUpdate(
            {}, { $set: updateData }, { new: true }
        );
        if (!updated) throw new Error('Base resume not found');
        return updated;
    }

    private injectWebPresence(resume: IBaseResume): IBaseResume {
        const profiles = resume.basics.profiles ?? [];
        const hasLinkedIn = profiles.some((p: any) =>
            p.network?.toLowerCase().includes('linkedin') || p.url?.toLowerCase().includes('linkedin'));
        const hasPortfolio = !!resume.basics.url || profiles.some((p: any) =>
            ['portfolio', 'github', 'website'].includes((p.network ?? '').toLowerCase()));

        if (!hasLinkedIn) {
            profiles.push({ network: 'LinkedIn', username: 'your-linkedin', url: 'https://linkedin.com/in/your-linkedin' });
            console.warn('[ResumeService] LinkedIn placeholder injected — update before sending.');
        }
        if (!hasPortfolio) {
            resume.basics.url = resume.basics.url ?? 'https://your-portfolio.com';
            console.warn('[ResumeService] Portfolio placeholder injected — update before sending.');
        }
        resume.basics.profiles = profiles;
        return resume;
    }

    async evaluateResume(jobId: string): Promise<{ evaluationId: string; evaluation: any }> {
        const t0 = Date.now();

        const [baseResume, job] = await Promise.all([
            this.getBaseResume(),
            this.jobService.getJobById(jobId),
        ]);

        if (!baseResume) throw new Error('Base resume not found');
        if (!job) throw new Error('Job not found');

        const { merged, keywords } = await this.evaluator.evaluate(baseResume, job.jobDescription);

        const saved: any = await Evaluation.create({
            jobId,
            hard_skills_match: merged.hard_skills_match,
            soft_skills_match: merged.soft_skills_match,
            experience_match: merged.experience_match,
            education_match: merged.education_match,
            web_presence_score: merged.web_presence_score,
            overall_score: merged.overall_score,
            missing_keywords: merged.missing_keywords,
            improvement_suggestions: merged.improvement_suggestions,
            notes: merged.notes,
            web_presence: merged.web_presence,
            summary: merged._sections?.summary ?? {},
            skills: merged._sections?.skills ?? {},
            work: merged._sections?.work ?? [],
            projects: merged._sections?.projects ?? [],
            education: merged._sections?.education ?? {},
            // @ts-ignore — we attach keywords for optimizer convenience
            _keywords: keywords,
        });

        console.log(`[ResumeService] Evaluation complete in ${Date.now() - t0}ms | score=${merged.overall_score} | id=${saved._id}`);

        return {
            evaluationId: (saved._id).toString(),
            evaluation: {
                overall_score: merged.overall_score,
                hard_skills_match: merged.hard_skills_match,
                soft_skills_match: merged.soft_skills_match,
                experience_match: merged.experience_match,
                education_match: merged.education_match,
                web_presence_score: merged.web_presence_score,
                missing_keywords: merged.missing_keywords,
                improvement_suggestions: merged.improvement_suggestions,
                notes: merged.notes,
            },
        };
    }

    async buildResume(evaluationId: string): Promise<{
        resumeUrl: string;
        tailoredResume: any;
        evaluation: any;
    }> {
        const t0 = Date.now();

        const evaluation = await Evaluation.findById(evaluationId);
        if (!evaluation) throw new Error('Evaluation not found — run /evaluate first');

        const [baseResume, job] = await Promise.all([
            this.getBaseResume(),
            this.jobService.getJobById(evaluation.jobId),
        ]);

        if (!baseResume) throw new Error('Base resume not found');
        if (!job) throw new Error('Job not found');

        const resumeCopy = this.injectWebPresence(JSON.parse(JSON.stringify(baseResume)));

        let keywords = (evaluation as any)._keywords;
        if (!keywords) {
            keywords = await this.evaluator.extractKeywords(job.jobDescription);
        }
        const evalForOptimizer = {
            missing_keywords: evaluation.missing_keywords,
            improvement_suggestions: evaluation.improvement_suggestions,
            missing_soft_skills: [],
            _sections: {
                summary: evaluation.summary,
                skills: evaluation.skills,
                work: evaluation.work,
                projects: evaluation.projects,
                education: evaluation.education,
            },
        };

        const tailoredResume = await this.optimizer.optimizeAll(resumeCopy, evalForOptimizer, job.jobDescription, keywords);

        const pdfPath = await this.pdf.generate(tailoredResume);

        const resumeUrl = await this.drive.uploadFile(
            pdfPath,
            `Resume_${job.jobTitle}_${job.company}_${Date.now()}.pdf`,
            'application/pdf',
        );

        await this.jobService.updateJob(evaluation.jobId, { resumeUrl });

        return { resumeUrl, tailoredResume, evaluation };
    }

    async buildCoverLetter(evaluationId: string): Promise<{
        coverLetterUrl: string;
        coverLetterData: any;
    }> {
        const t0 = Date.now();

        const evaluation = await Evaluation.findById(evaluationId);
        if (!evaluation) throw new Error('Evaluation not found — run /evaluate first');

        const [baseResume, job] = await Promise.all([
            this.getBaseResume(),
            this.jobService.getJobById(evaluation.jobId),
        ]);

        if (!baseResume) throw new Error('Base resume not found');
        if (!job) throw new Error('Job not found');

        const coverLetterData = await this.coverLetter.generateData(
            baseResume,
            job.jobDescription,
            job.jobTitle,
            job.company,
            evaluation,
        );

        const pdfPath = await this.coverLetter.generatePDF(coverLetterData, baseResume);
        const coverLetterUrl = await this.drive.uploadFile(
            pdfPath,
            `CoverLetter_${job.jobTitle}_${job.company}_${Date.now()}.pdf`,
            'application/pdf',
        );

        await this.jobService.updateJob(evaluation.jobId, { coverLetterUrl });

        return { coverLetterUrl, coverLetterData };
    }
}