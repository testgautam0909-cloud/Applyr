import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config.js';
import type { AIJobData, JobStatus } from '../interface/job.interface.js';
import BaseResume from '../model/baseResume.model.js';
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { JobService } from './job.service.js';
import puppeteer from "puppeteer";
import type { IBaseResume } from '../interface/resume.interface.js';

export class ResumeService {
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

    async updateBaseResume() {

    }



    private async callOpenAI(prompt: string) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.openRouterApiKey}`,
                'HTTP-Referer': 'http://localhost:3000',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: config.openAIModel,
                temperature: 0.1,
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: 'system',
                        content: 'You are an ATS resume evaluation expert. Always respond in valid JSON.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            }),
        });

        const data = await response.json();
        console.log("data from deepseek -->", data);

        if (!response.ok || data.error) {
            console.error('OpenRouter Error:', data);
            throw new Error(data?.error?.message || 'AI request failed');
        }

        if (!data.choices || !data.choices.length) {
            throw new Error('Invalid AI response format');
        }

        return JSON.parse(data.choices[0].message.content);
    }

    private async callGoogleAI(prompt: string) {
        const model = this.genAI.getGenerativeModel({
            model: config.model,
            generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json',
            },
        });
        const response = await model.generateContent(prompt);
        const result = response.response;
        return result;
    }

    private parseGeminiJSON(response: any) {
        try {
            const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                throw new Error("Invalid Gemini response format");
            }

            return JSON.parse(text);
        } catch (error) {
            console.error("Failed to parse Gemini JSON:", error);
            throw new Error("AI response parsing failed");
        }
    }

    async compareResumeWithJD(jobId: string, resume: IBaseResume) {
        const job = await this.jobService.getJobById(jobId);

        if (!job) {
            throw new Error('Job not found');
        }

        const baseResume = resume;

        const prompt = `
                        Compare the following resume and job description.

                        Return JSON with:
                        - hard_skills_match (0-100)
                        - soft_skills_match (0-100)
                        - experience_match (0-100)
                        - missing_keywords (array of strings)
                        - improvement_suggestions (array of strings)
                        - overall_score (weighted: 50% hard, 30% soft, 20% experience)
                        - notes (array of strings)

                        Resume:
                        ${baseResume}

                        Job Description:
                        ${job.jobDescription}`;

        const aiResult = await this.callGoogleAI(prompt);
        const aiPraised = this.parseGeminiJSON(aiResult);
        return {
            ...aiPraised,
        };
    }

    async getBaseResume() {
        return await BaseResume.findOne();
    }

    async buildResumeData(id: string) {
        const baseResume = await this.getBaseResume();

        if (!baseResume) {
            throw new Error('Base resume not found');
        }

        let aiEvaluation = await this.compareResumeWithJD(id, baseResume);

        if (!aiEvaluation) {
            throw new Error("Invalid Gemini response format");
        }

        const job = await this.jobService.getJobById(id);

        if (!job) {
            throw new Error('Job not found');
        }

        const tailoredResume = this.generateTailoredResume(
            baseResume,
            aiEvaluation,
            job.jobDescription
        );

        console.log("tailoredResume -->", tailoredResume);

        // const pdfPath = await this.generatePDF(baseResume);

        return aiEvaluation;
    }

    private cloneResume(resume: IBaseResume): IBaseResume {
        return JSON.parse(JSON.stringify(resume));
    }

    async generateTailoredResume(
        baseResume: IBaseResume,
        aiEvaluation: any,
        jobDescription: string
    ) {

        const prompt = `
You are an expert ATS resume optimizer.

INPUTS:
1) Base Resume (JSON)
2) Job Description (TEXT)
3) Resume Evaluation (JSON)

TASK:
Generate a fully tailored resume in EXACT SAME JSON structure as Base Resume.

RULES:
- Do NOT invent fake companies or fake experience.
- Do NOT increase years of experience.
- You may rephrase bullet points.
- You may reorder skills.
- You may emphasize relevant technologies.
- Adapt tone based on job level.
- Remove irrelevant skills if needed.
- Optimize for ATS keyword alignment.
- Make summary highly role-specific.
- Quantify achievements if possible.
- Keep everything truthful.

Return STRICT JSON only. No explanation.

Base Resume:
${JSON.stringify(baseResume, null, 2)}

Resume Evaluation:
${JSON.stringify(aiEvaluation, null, 2)}

Job Description:
${jobDescription}
`;

        const aiRaw = await this.callGoogleAI(prompt);
        return this.parseGeminiJSON(aiRaw);
    }

    private async generatePDF(resumeJSON: any): Promise<string> {
        const outputPath = path.join(process.cwd(), "output.pdf");

        const htmlContent = this.buildResumeHTML(resumeJSON);

        const browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"], // REQUIRED for Render
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });

        await page.pdf({
            path: outputPath,
            format: "A4",
            printBackground: true,
        });

        await browser.close();

        return outputPath;
    }

    private buildResumeHTML(resume: any): string {

        const r = this.mapResumeForPDF(resume);

        const formatDate = (date: string) => {
            if (!date) return "";
            if (date === "present") return "Present";
            return new Date(date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short"
            });
        };

        return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
    @page {
        margin: 40px;
    }
    body {
        -webkit-print-color-adjust: exact;
        font-family: Arial, Helvetica, sans-serif;
        margin: 40px;
        color: #111;
        line-height: 1.5;
        font-size: 12px;
    }

    h1 {
        font-size: 24px;
        margin-bottom: 4px;
    }

    .subheading {
        font-size: 14px;
        margin-bottom: 8px;
    }

    .contact {
        margin-bottom: 15px;
        font-size: 12px;
    }

    .section {
        margin-top: 20px;
    }

    .section-title {
        font-size: 14px;
        font-weight: bold;
        border-bottom: 1px solid #000;
        padding-bottom: 4px;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .job {
        margin-bottom: 12px;
    }

    .job-header {
        display: flex;
        justify-content: space-between;
        font-weight: bold;
    }

    ul {
        margin: 4px 0 8px 18px;
        padding: 0;
    }

    li {
        margin-bottom: 4px;
    }

    .skills-category {
        margin-bottom: 6px;
    }
</style>
</head>
<body>

    <h1>${r.name}</h1>
    <div class="subheading">${r.label}</div>
    <div class="contact">
        ${r.email} ${r.phone ? "| " + r.phone : ""}
    </div>

    ${r.summary ? `
    <div class="section">
        <div class="section-title">Professional Summary</div>
        <div>${r.summary}</div>
    </div>
    ` : ""}

    ${r.work?.length ? `
    <div class="section">
        <div class="section-title">Professional Experience</div>

        ${r.work.map((job: any) => `
            <div class="job">
                <div class="job-header">
                    <span>${job.position} – ${job.name}</span>
                    <span>${formatDate(job.startDate)} - ${formatDate(job.endDate)}</span>
                </div>
                ${job.summary ? `<div>${job.summary}</div>` : ""}
                ${job.highlights?.length ? `
                    <ul>
                        ${job.highlights.map((h: string) => `<li>${h}</li>`).join("")}
                    </ul>
                ` : ""}
            </div>
        `).join("")}
    </div>
    ` : ""}

    ${r.projects?.length ? `
    <div class="section">
        <div class="section-title">Projects</div>

        ${r.projects.map((proj: any) => `
            <div class="job">
                <div class="job-header">
                    <span>${proj.name}</span>
                    <span>${formatDate(proj.startDate)}</span>
                </div>
                <div>${proj.description}</div>
            </div>
        `).join("")}
    </div>
    ` : ""}

    ${r.skills?.length ? `
    <div class="section">
        <div class="section-title">Technical Skills</div>

        ${r.skills.map((skill: any) => `
            <div class="skills-category">
                <strong>${skill.name}:</strong> ${skill.keywords?.join(", ")}
            </div>
        `).join("")}
    </div>
    ` : ""}

    ${r.education?.length ? `
    <div class="section">
        <div class="section-title">Education</div>

        ${r.education.map((edu: any) => `
            <div class="job">
                <div class="job-header">
                    <span>${edu.studyType} – ${edu.area}</span>
                    <span>${edu.gpa ? "GPA: " + edu.gpa : ""}</span>
                </div>
            </div>
        `).join("")}
    </div>
    ` : ""}

    ${r.certificates?.length ? `
    <div class="section">
        <div class="section-title">Certifications</div>
        <ul>
            ${r.certificates.map((c: any) => `
                <li>${c.name} – ${c.issuer}</li>
            `).join("")}
        </ul>
    </div>
    ` : ""}

</body>
</html>
`;
    }

    private mapResumeForPDF(resume: any) {
        return {
            name: resume.basics?.name || "",
            label: resume.basics?.label || "",
            email: resume.basics?.email || "",
            phone: resume.basics?.phone || "",
            summary: resume.basics?.summary || "",

            work: resume.work || [],
            education: resume.education || [],
            skills: resume.skills || [],
            projects: resume.projects || [],
            awards: resume.awards || [],
            certificates: resume.certificates || [],
        };
    }
}
