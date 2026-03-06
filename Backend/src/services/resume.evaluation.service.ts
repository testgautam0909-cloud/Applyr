import { ModelRouter, ModelRole } from '../utils/modelRouter.js';
const { toArr, toScore } = ModelRouter;

export class ResumeEvaluationService {
    constructor(private router: ModelRouter) { }

    async extractKeywords(jd: string) {
        return this.router.callJSON(ModelRole.EXTRACTION, `
Extract structured data from this job description.
Return ONLY valid JSON — no markdown, no explanation:
{
  "tech_stack": ["string"],
  "soft_skills": ["string"],
  "role_seniority": "string",
  "environment": ["string"],
  "industry": "string",
  "required_education": ["string"],
  "preferred_education": ["string"],
  "key_action_verbs": ["string"]
}
Job Description: ${jd}`);
    }

    async compareSummary(summary: string, jd: string, keywords: any) {
        const raw = await this.router.callJSON(ModelRole.COMPARISON, `
You are an ATS evaluation expert. Evaluate the resume summary against the job description.
Return ONLY valid JSON:
{
  "hard_skills_match": <0-100>,
  "soft_skills_match": <0-100>,
  "experience_match": <0-100>,
  "missing_keywords": ["string"],
  "missing_soft_skills": ["string"],
  "improvement_suggestions": ["string"],
  "notes": ["string"]
}
CRITICAL: "notes" must be an array of strings, never a plain string.
Summary: ${summary}
Job Description: ${jd}
Keywords: ${JSON.stringify(keywords)}`);

        return {
            hard_skills_match: toScore(raw.hard_skills_match),
            soft_skills_match: toScore(raw.soft_skills_match),
            experience_match: toScore(raw.experience_match),
            missing_keywords: toArr(raw.missing_keywords),
            missing_soft_skills: toArr(raw.missing_soft_skills),
            improvement_suggestions: toArr(raw.improvement_suggestions),
            notes: toArr(raw.notes),
        };
    }

    async compareSkills(skills: any[], jd: string, keywords: any) {
        const raw = await this.router.callJSON(ModelRole.COMPARISON, `
You are an ATS evaluation expert. Compare resume skills against the job description.
Return ONLY valid JSON:
{
  "hard_skills_match": <0-100>,
  "soft_skills_match": <0-100>,
  "missing_keywords": ["string"],
  "missing_soft_skills": ["string"],
  "improvement_suggestions": ["string"],
  "notes": ["string"]
}
Explicitly check for: ${(keywords.soft_skills ?? []).join(', ')}
Skills: ${JSON.stringify(skills)}
Job Description: ${jd}
Keywords: ${JSON.stringify(keywords)}`);

        return {
            hard_skills_match: toScore(raw.hard_skills_match),
            soft_skills_match: toScore(raw.soft_skills_match),
            missing_keywords: toArr(raw.missing_keywords),
            missing_soft_skills: toArr(raw.missing_soft_skills),
            improvement_suggestions: toArr(raw.improvement_suggestions),
            notes: toArr(raw.notes),
        };
    }

    async compareWork(work: any[], jd: string, keywords: any) {
        if (!work?.length) return [];
        const raw = await this.router.callJSON(ModelRole.COMPARISON, `
You are an ATS evaluation expert. Evaluate each work entry.
Return ONLY a JSON array with EXACTLY ${work.length} objects:
[{ "experience_match": <0-100>, "soft_skills_demonstrated": ["string"], "improvement_suggestions": ["string"], "notes": ["string"] }]
CRITICAL: bare array, exactly ${work.length} items, "notes" must be string arrays.
Work: ${JSON.stringify(work)}
Job Description: ${jd}
Keywords: ${JSON.stringify(keywords)}`);

        const arr = Array.isArray(raw) ? raw : [];
        return Array.from({ length: work.length }, (_, i) => ({
            experience_match: toScore(arr[i]?.experience_match),
            soft_skills_demonstrated: toArr(arr[i]?.soft_skills_demonstrated),
            improvement_suggestions: toArr(arr[i]?.improvement_suggestions),
            notes: toArr(arr[i]?.notes),
        }));
    }

    async compareProjects(projects: any[], jd: string, keywords: any) {
        if (!projects?.length) return [];
        const raw = await this.router.callJSON(ModelRole.COMPARISON, `
You are an ATS evaluation expert. Evaluate each project.
Return ONLY a JSON array with EXACTLY ${projects.length} objects:
[{ "hard_skills_match": <0-100>, "improvement_suggestions": ["string"], "notes": ["string"] }]
CRITICAL: bare array, exactly ${projects.length} items.
Projects: ${JSON.stringify(projects)}
Job Description: ${jd}
Keywords: ${JSON.stringify(keywords)}`);

        const arr = Array.isArray(raw) ? raw : [];
        return Array.from({ length: projects.length }, (_, i) => ({
            hard_skills_match: toScore(arr[i]?.hard_skills_match),
            improvement_suggestions: toArr(arr[i]?.improvement_suggestions),
            notes: toArr(arr[i]?.notes),
        }));
    }

    async compareEducation(education: any[], keywords: any) {
        if (!education?.length) return {
            education_match: 0,
            matched_requirements: [] as string[],
            missing_education: toArr(keywords.required_education),
            improvement_suggestions: ['Add educational background to the resume.'],
            notes: ['No education entries found.'],
        };

        const raw = await this.router.callJSON(ModelRole.COMPARISON, `
You are an ATS evaluation expert. Evaluate education match.
Return ONLY valid JSON:
{
  "education_match": <0-100>,
  "matched_requirements": ["string"],
  "missing_education": ["string"],
  "improvement_suggestions": ["string"],
  "notes": ["string"]
}
Hierarchy: Doctorate > Master's > Bachelor's > Associate's > Diploma (higher satisfies lower).
Education: ${JSON.stringify(education)}
Required: ${JSON.stringify(keywords.required_education ?? [])}
Preferred: ${JSON.stringify(keywords.preferred_education ?? [])}`);

        return {
            education_match: toScore(raw.education_match),
            matched_requirements: toArr(raw.matched_requirements),
            missing_education: toArr(raw.missing_education),
            improvement_suggestions: toArr(raw.improvement_suggestions),
            notes: toArr(raw.notes),
        };
    }

    checkWebPresence(resume: any) {
        const profiles = resume.basics?.profiles ?? [];
        const url = resume.basics?.url ?? '';
        const hasLinkedIn = profiles.some((p: any) =>
            p.network?.toLowerCase().includes('linkedin') || p.url?.toLowerCase().includes('linkedin'));
        const hasWebsite = !!url || profiles.some((p: any) =>
            ['portfolio', 'github', 'website'].includes((p.network ?? '').toLowerCase()));

        return {
            has_linkedin: hasLinkedIn,
            has_website: hasWebsite,
            suggestions: [
                ...(!hasLinkedIn ? ['Add your LinkedIn profile URL — ATS systems score for it.'] : []),
                ...(!hasWebsite ? ['Add a portfolio, GitHub, or personal website URL.'] : []),
            ],
        };
    }

    merge(results: {
        summary: any;
        skills: any;
        work: any[];
        projects: any[];
        education: any;
        webPresence: any;
    }) {
        const missing: string[] = [];
        const suggestions: string[] = [];
        const notes: string[] = [];

        missing.push(...toArr(results.summary.missing_keywords), ...toArr(results.summary.missing_soft_skills));
        suggestions.push(...toArr(results.summary.improvement_suggestions));
        notes.push(...toArr(results.summary.notes));

        missing.push(...toArr(results.skills.missing_keywords), ...toArr(results.skills.missing_soft_skills));
        suggestions.push(...toArr(results.skills.improvement_suggestions));
        notes.push(...toArr(results.skills.notes));

        let workTotal = 0;
        for (const w of results.work) {
            workTotal += toScore(w.experience_match);
            suggestions.push(...toArr(w.improvement_suggestions));
            notes.push(...toArr(w.notes));
        }

        let projTotal = 0;
        for (const p of results.projects) {
            projTotal += toScore(p.hard_skills_match);
            suggestions.push(...toArr(p.improvement_suggestions));
            notes.push(...toArr(p.notes));
        }

        suggestions.push(...toArr(results.education.improvement_suggestions));
        notes.push(...toArr(results.education.notes));
        if (toArr(results.education.missing_education).length > 0) {
            notes.push(`Education gap (${results.education.missing_education.join(', ')}) — address in summary.`);
        }
        suggestions.push(...results.webPresence.suggestions);

        const projAvg = results.projects.length > 0
            ? projTotal / results.projects.length
            : toScore(results.skills.hard_skills_match);

        const workAvg = results.work.length > 0
            ? workTotal / results.work.length
            : toScore(results.summary.experience_match);

        const hard = Math.round((toScore(results.summary.hard_skills_match) + toScore(results.skills.hard_skills_match) + projAvg) / 3);
        const soft = Math.round((toScore(results.summary.soft_skills_match) + toScore(results.skills.soft_skills_match)) / 2);
        const exp = Math.round((toScore(results.summary.experience_match) + workAvg) / 2);
        const edu = toScore(results.education.education_match);
        const web = (results.webPresence.has_linkedin ? 50 : 0) + (results.webPresence.has_website ? 50 : 0);

        return {
            hard_skills_match: hard,
            soft_skills_match: soft,
            experience_match: exp,
            education_match: edu,
            web_presence_score: web,
            overall_score: Math.round(hard * 0.40 + soft * 0.20 + exp * 0.20 + edu * 0.10 + web * 0.10),
            missing_keywords: [...new Set(missing)],
            improvement_suggestions: [...new Set(suggestions)],
            notes: [...new Set(notes)],
            web_presence: results.webPresence,
            _sections: {
                summary: results.summary,
                skills: results.skills,
                work: results.work,
                projects: results.projects,
                education: results.education,
            },
        };
    }

    async evaluate(resume: any, jd: string) {
        console.log('[EvaluationService] Extracting keywords + running all sections in parallel...');
        const t0 = Date.now();

        const keywords = await this.extractKeywords(jd);
        const webPresence = this.checkWebPresence(resume);

        const [summary, skills, work, projects, education] = await Promise.all([
            this.compareSummary(resume.basics.summary, jd, keywords),
            this.compareSkills(resume.skills, jd, keywords),
            this.compareWork(resume.work, jd, keywords),
            this.compareProjects(resume.projects, jd, keywords),
            this.compareEducation(resume.education ?? [], keywords),
        ]);

        console.log(`[EvaluationService] All sections evaluated in ${Date.now() - t0}ms`);

        return { merged: this.merge({ summary, skills, work, projects, education, webPresence }), keywords };
    }
}