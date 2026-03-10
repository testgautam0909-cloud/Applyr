import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { ModelRouter, ModelRole } from '../utils/modelRouter.js';

// ── Auto-detect Chrome installed by `npx puppeteer browsers install chrome` ──
function findLocalChrome(): string | undefined {
    const searchDirs = [
        path.join(process.cwd(), '.cache', 'puppeteer'),
        path.join(process.cwd(), '.puppeteer-cache'),
        '/opt/render/.cache/puppeteer',
    ];
    for (const dir of searchDirs) {
        if (!fs.existsSync(dir)) continue;
        try {
            const chromeDir = path.join(dir, 'chrome');
            if (!fs.existsSync(chromeDir)) continue;
            const versions = fs.readdirSync(chromeDir);
            for (const ver of versions) {
                const candidate = path.join(chromeDir, ver, 'chrome-linux64', 'chrome');
                if (fs.existsSync(candidate)) {
                    console.log(`[Puppeteer-CoverLetter] Found Chrome at: ${candidate}`);
                    return candidate;
                }
            }
        } catch { /* ignore */ }
    }
    return undefined;
}

export class CoverLetterService {
    constructor(private router: ModelRouter) { }

    private md(t: string): string {
        return (t || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    async generateData(
        baseResume: any,
        jobDescription: string,
        jobTitle: string,
        company: string,
        evaluation: any
    ): Promise<any> {

        const prompt = `
You are an expert career coach and professional writer. Generate a highly tailored, persuasive cover letter.

CRITICAL INSTRUCTIONS:
1. Strong Opening Hook: DO NOT use generic openings like "I am writing to express my interest...". Start immediately with a strong statement connecting the candidate's core expertise to the company's potential needs or mission.
2. Avoid Passive Language: DO NOT use phrases like "I am proficient in" or "I possess a strong foundation".
3. Use the STAR Method: Turn responsibilities into compelling stories. Focus on concrete achievements.
4. Quantable Results: Extract data points and metrics (e.g., "40% improvement") from the resume.
5. Personalize: Mention the company (${company}) specifically and tailor the tone to their presumed industry or clients.
6. Proactive Closing: Do not end passively. Suggest a specific, confident next step, like a brief call.

Candidate Name: ${baseResume.basics.name}
Job Title: ${jobTitle}
Company: ${company}

Job Description:
${jobDescription}

Evaluation Insights:
Overall Score: ${evaluation.overall_score}
Missing Keywords: ${evaluation.missing_keywords?.join(', ')}
Improvement Suggestions: ${evaluation.improvement_suggestions?.join(', ')}

Resume Profile:
${baseResume.basics.summary}

Resume Experience:
${JSON.stringify(baseResume.work || [])}

Return ONLY valid JSON with this structure:
{
  "date": "string (e.g. October 26, 2023)",
  "recipient": {
    "name": "string (Hiring Manager or specific name if found in JD)",
    "company": "${company}"
  },
  "content": {
    "salutation": "string (e.g. Dear Hiring Manager, or Dear [Name],)",
    "introduction": "string (Strong hook paragraph, no generic 'I am writing to apply')",
    "context_paragraph": "string (Connecting paragraph highlighting tech stack relevance before achievements)",
    "key_achievements": [
      {
        "title": "string (Short boldable title, e.g. Performance Optimization)",
        "description": "string (Achievement detail using STAR method and metrics)"
      }
    ],
    "philosophy_paragraph": "string (Working style, integration, soft skills, or remote work capabilities)",
    "call_to_action": "string (Confident, proactive closing)",
    "sign_off": "string (e.g. Sincerely,)"
  }
}
`;

        return this.router.callJSON(ModelRole.ENRICHMENT, prompt);
    }

    async generatePDF(data: any, baseResume: any): Promise<string> {
        const outputPath = path.join(process.cwd(), `CoverLetter_${Date.now()}.pdf`);

        const html = this.buildHTML(data, baseResume);

        const options: any = {
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ],
        };

        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            options.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        } else {
            const localChrome = findLocalChrome();
            if (localChrome) {
                options.executablePath = localChrome;
            }
        }

        console.log(`[Puppeteer-CoverLetter] Launching with options:`, JSON.stringify(options));
        console.log(`[Puppeteer-CoverLetter] CWD:`, process.cwd());

        try {
            const browser = await puppeteer.launch(options);
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0', timeout: 90000 });
            await page.pdf({ path: outputPath, format: 'A4', printBackground: true });
            await browser.close();
        } catch (error: any) {
            console.error(`[Puppeteer-CoverLetter] Execution failed: ${error.message}`);
            throw error;
        }

        return outputPath;
    }

    private buildHTML(data: any, baseResume: any): string {
        const { date, recipient, content } = data;
        const name = baseResume?.basics?.name || 'Candidate Name';
        const phone = baseResume?.basics?.phone || '';
        const email = baseResume?.basics?.email || '';
        const profiles = baseResume?.basics?.profiles || [];
        const linkedin = profiles.find((p: any) => p.network?.toLowerCase().includes('linkedin'))?.url || '';
        const portfolio = profiles.find((p: any) => ['portfolio', 'website', 'github'].includes(p.network?.toLowerCase()))?.url || baseResume?.basics?.url || '';

        const contactParts = [phone, email, linkedin, portfolio].filter(Boolean);
        const contactLine = contactParts.join(' &nbsp;|&nbsp; ');

        const achievementsHtml = (content?.key_achievements || []).map((a: any) =>
            `<li class="achievement"><strong>${this.md(a.title)}:</strong> ${this.md(a.description)}</li>`
        ).join('');

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page { margin: 1in; }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            font-size: 11pt;
            margin: 0;
            -webkit-print-color-adjust: exact;
        }
        .header { margin-bottom: 30px; text-align: left; }
        .name { font-size: 16pt; font-weight: bold; margin-bottom: 5px; color: #000; }
        .contact { font-size: 10pt; color: #222; }
        .contact a { color: #222; text-decoration: none; }
        .date { margin-bottom: 20px; font-weight: bold; }
        .recipient { margin-bottom: 30px; }
        .salutation { margin-bottom: 20px; font-weight: bold; color: #000; }
        .paragraph { margin-bottom: 15px; text-align: left; }
        .achievements { margin: 15px 0 15px 25px; padding: 0; list-style-type: disc; }
        .achievement { margin-bottom: 10px; text-align: left; }
        .sign-off { margin-top: 30px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="name">${name}</div>
        <div class="contact">${contactLine.replace(/https?:\/\//g, '')}</div>
    </div>

    <div class="date">${date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    
    <div class="recipient">
        <div><strong>${recipient?.name || 'Hiring Manager'}</strong></div>
        <div>${recipient?.company || ''}</div>
    </div>
    
    <div class="salutation">${content?.salutation || 'Dear Hiring Manager,'}</div>
    
    <div class="paragraph">${this.md(content?.introduction || '')}</div>
    <div class="paragraph">${this.md(content?.context_paragraph || '')}</div>
    
    ${achievementsHtml ? `<ul class="achievements">${achievementsHtml}</ul>` : ''}
    
    <div class="paragraph">${this.md(content?.philosophy_paragraph || '')}</div>
    <div class="paragraph">${this.md(content?.call_to_action || '')}</div>
    
    <div class="sign-off">
        <div>${content?.sign_off || 'Sincerely,'}</div>
        <br><br>
        <div style="font-weight: bold; color: #000;">${name}</div>
    </div>
</body>
</html>
        `;
    }
}
