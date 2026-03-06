import { ModelRouter, ModelRole } from '../utils/modelRouter.js';
const { toArr } = ModelRouter;

const VERB_POOL = [
    'Architected', 'Engineered', 'Spearheaded', 'Accelerated', 'Automated',
    'Migrated', 'Refactored', 'Coordinated', 'Established', 'Modernised',
    'Deployed', 'Resolved', 'Pioneered', 'Executed', 'Leveraged',
    'Streamlined', 'Launched', 'Reduced', 'Increased', 'Integrated',
    'Collaborated', 'Designed', 'Delivered', 'Optimised', 'Built',
    'Shipped', 'Expanded', 'Boosted', 'Eliminated', 'Consolidated',
];

const BANNED = [
    'proven track record', 'extensive experience', 'results-driven', 'versatile',
    'team player', 'responsible for', 'helped', 'assisted', 'proactive',
    'problem solving', 'dynamic', 'passionate', 'detail-oriented', 'self-starter',
    'maintained', 'developed', 'implemented',
].map(w => `"${w}"`).join(', ');

const QUANT_GUIDE = `
QUANTIFICATION RULES (non-negotiable):
- Every bullet MUST contain at least one number, metric, or measurable outcome.
- Use formats like: "by X%", "X+ users", "from X to Y", "in X weeks", "X req/sec", "team of X".
- If the original has no number, use a realistic plausible one (e.g. "~30%", "5+ engineers").
- Zero unquantified bullets allowed.`;

const VERB_RULES = `
ACTION VERB RULES (non-negotiable):
- Every bullet must start with a UNIQUE action verb — no verb used more than once across all bullets.
- Verbs pool: ${VERB_POOL.join(', ')}.
- FORBIDDEN verbs: Developed, Implemented, Maintained, Improved, Managed, Created, Used, Worked.`;

export class ResumeOptimizerService {
    constructor(
        private router: ModelRouter,
        private callGroq: (prompt: string, json: boolean) => Promise<string>,
    ) { }

    private async run(original: string, prompt: string, section: string, isJson: boolean): Promise<any> {
        const groqResult = await this.callGroq(prompt, isJson);

        const validated = await this.router.callText(ModelRole.VALIDATION, `
QA check for resume section "${section}".
Original content: ${original}
AI-generated content: ${groqResult}

Tasks:
1. Remove any hallucinations (facts not in original).
2. Ensure every bullet starts with a unique action verb.
3. Ensure every bullet contains a number or metric.
4. Fix any formatting issues.

Return ONLY the corrected final content — no preamble, no explanation.`);

        if (!isJson) return validated.trim();

        try { return JSON.parse(validated); }
        catch {
            try { return JSON.parse(groqResult); }
            catch { return JSON.parse(original); }
        }
    }

    async summary(text: string, evaluation: any, jd: string, keywords: any): Promise<string> {
        const jobTitle = String(keywords.role_seniority || 'Full Stack Engineer');
        return this.run(text, `
Rewrite this resume professional summary for maximum ATS score.

STRICT RULES:
1. First words MUST be the exact job title: "${jobTitle}"
2. Include these hard skills naturally: ${toArr(keywords.tech_stack).slice(0, 7).join(', ')}
3. Include these soft skills: ${toArr(keywords.soft_skills).join(', ')}
4. Include exactly TWO quantified achievements (e.g. "reduced latency by 40%", "delivered 8 features")
5. 55-75 words total
6. BANNED phrases: ${BANNED}
7. No personal pronouns (I, my, we)
8. Missing keywords to include: ${toArr(evaluation.missing_keywords).slice(0, 5).join(', ')}
9. OUTPUT: Single paragraph of flowing prose. NO bullet points, NO asterisks, NO dashes, NO lists.

Current summary: ${text}
Job Description: ${jd}

Return ONLY the rewritten summary as a single plain-text paragraph.`, 'Professional Summary', false);
    }

    async skills(skills: any[], evaluation: any, jd: string, keywords: any): Promise<any[]> {
        const missingSoft = toArr(evaluation.missing_soft_skills).length
            ? toArr(evaluation.missing_soft_skills)
            : toArr(keywords.soft_skills);

        return this.run(JSON.stringify(skills), `
Rewrite resume skills section for ATS.

STRICT RULES:
1. Same JSON array structure: [{name, keywords:[]}]
2. Most JD-relevant categories first
3. Add missing hard skills ONLY if truthful: ${toArr(evaluation.missing_keywords).join(', ')}
4. MUST have a category named "Soft Skills" containing: ${missingSoft.join(', ')}
5. Remove skills irrelevant to the JD

Current skills: ${JSON.stringify(skills)}
Job Description: ${jd}

Return JSON array only — same structure as input.`, 'Technical Skills', true);
    }

    async optimizeWorkEntry(entry: any, evalNote: string, jd: string, keywords: any): Promise<any> {
        return this.run(JSON.stringify(entry), `
Rewrite this work experience entry for maximum ATS score.

${QUANT_GUIDE}
${VERB_RULES}

ADDITIONAL RULES:
- Keep company name, job title, startDate, endDate UNCHANGED
- 8-10 bullet points total
- Include keywords: ${toArr(keywords.tech_stack).slice(0, 6).join(', ')}
- Weave in context: ${toArr(keywords.soft_skills).join(', ')}
- BANNED phrases: ${BANNED}
- Mention API development or RESTful services in at least 2 bullets

Evaluator notes to address: ${evalNote}
Entry: ${JSON.stringify(entry)}
Job Description: ${jd}

Return complete updated JSON object only.`, 'Work Experience', true);
    }

    async optimizeProjectEntry(proj: any, evalNote: string, jd: string, keywords: any): Promise<any> {
        return this.run(JSON.stringify(proj), `
Rewrite this project for ATS. Keep name and dates UNCHANGED.

${QUANT_GUIDE}
${VERB_RULES}

ADDITIONAL RULES:
- description: 1-2 sentences of plain prose, include ${toArr(keywords.tech_stack).slice(0, 4).join(', ')}
- highlights: array of 3-5 plain strings — each MUST be a plain string like "Reduced load time by 35%"
- CRITICAL: highlights must be ["string", "string"] NOT [{"text": "string"}]
- Each highlight must start with a unique verb and contain a number/metric
- BANNED: ${BANNED}

Evaluator notes: ${evalNote}
Project: ${JSON.stringify(proj)}
Job Description: ${jd}

Return complete updated JSON object only. highlights must be a plain string array.`, 'Project Entry', true);
    }

    async awards(awards: any[], jd: string): Promise<any[]> {
        if (!awards?.length) return awards;
        return this.run(JSON.stringify(awards), `
Optimise awards section for ATS. Keep relevant awards, add brief relevance context if missing.
Awards: ${JSON.stringify(awards)}
Job Description: ${jd}
Return JSON array only.`, 'Awards', true);
    }

    async optimizeAll(resume: any, evaluation: any, jd: string, keywords: any): Promise<any> {
        console.log('[OptimizerService] Starting parallel optimization of all sections...');
        const t0 = Date.now();

        const summaryEval = evaluation._sections?.summary ?? evaluation;
        const skillsEval = evaluation._sections?.skills ?? evaluation;
        const workEval = evaluation._sections?.work ?? [];
        const projectsEval = evaluation._sections?.projects ?? [];

        const workPromises = resume.work.map((entry: any, i: number) => {
            const evalNote = toArr(workEval[i]?.improvement_suggestions).join('; ');
            return this.optimizeWorkEntry(entry, evalNote, jd, keywords);
        });
        const projectPromises = resume.projects.map((proj: any, i: number) => {
            const evalNote = toArr(projectsEval[i]?.improvement_suggestions).join('; ');
            return this.optimizeProjectEntry(proj, evalNote, jd, keywords);
        });

        const [
            optimizedSummary,
            optimizedSkills,
            optimizedWork,
            optimizedProjects,
            optimizedAwards,
        ] = await Promise.all([
            this.summary(resume.basics.summary, summaryEval, jd, keywords),
            this.skills(resume.skills, skillsEval, jd, keywords),
            Promise.all(workPromises),
            Promise.all(projectPromises),
            this.awards(resume.awards ?? [], jd),
        ]);

        console.log(`[OptimizerService] All sections optimized in ${Date.now() - t0}ms`);

        return {
            ...resume,
            basics: { ...resume.basics, summary: optimizedSummary },
            skills: optimizedSkills,
            work: optimizedWork,
            projects: optimizedProjects,
            awards: optimizedAwards,
        };
    }
}