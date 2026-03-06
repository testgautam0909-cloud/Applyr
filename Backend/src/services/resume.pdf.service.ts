import puppeteer from 'puppeteer';
import path from 'path';

export class ResumePDFService {

    private fmt(d: string): string {
        if (!d) return '';
        if (d.toLowerCase() === 'present') return 'Present';
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    }

    private str(val: any): string {
        if (!val) return '';
        if (typeof val === 'string') return val.trim();
        if (typeof val === 'object') {
            const candidate = val.text ?? val.bullet ?? val.content ?? val.description ?? val.value ?? '';
            return String(candidate).trim();
        }
        return String(val).trim();
    }

    private cleanSummary(text: string): string {
        return text
            .replace(/^\s*[\*\-•]\s*/gm, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/\n{2,}/g, ' ')
            .replace(/\n/g, ' ')
            .trim();
    }

    private highlights(arr: any[]): string[] {
        if (!Array.isArray(arr)) return [];
        return arr.map(h => this.str(h)).filter(h => h.length > 0);
    }

    private normalizeSkills(skills: any): any[] {
        if (!skills) return [];
        if (Array.isArray(skills)) return skills;
        if (Array.isArray(skills.skills)) return skills.skills;
        return [];
    }

    private normalizeAwards(awards: any): any[] {
        if (!awards) return [];
        if (Array.isArray(awards)) return awards;
        if (Array.isArray(awards.awards)) return awards.awards;
        return [];
    }

    private normalizeCerts(certs: any): any[] {
        if (!certs) return [];
        if (Array.isArray(certs)) return certs;
        if (Array.isArray(certs.certificates)) return certs.certificates;
        return [];
    }

    adjustExperienceDates(work: any[], requiredYears?: number): any[] {
        if (!requiredYears || !work?.length) return work;

        const now = new Date();
        let earliestStart = now;
        let totalMonths = 0;

        for (const job of work) {
            const start = job.startDate ? new Date(job.startDate) : null;
            const end = (job.endDate && job.endDate.toLowerCase() !== 'present')
                ? new Date(job.endDate)
                : now;
            if (start) {
                totalMonths += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
                if (start < earliestStart) earliestStart = start;
            }
        }

        const currentYears = totalMonths / 12;
        if (currentYears >= requiredYears) return work;

        const gapYears = requiredYears - currentYears;
        const gapMs = gapYears * 365.25 * 24 * 60 * 60 * 1000;

        return work.map(job => {
            const start = job.startDate ? new Date(job.startDate) : null;
            if (!start || start.getTime() !== earliestStart.getTime()) return job;

            const newStart = new Date(start.getTime() - gapMs);
            return {
                ...job,
                startDate: newStart.toISOString().split('T')[0],
            };
        });
    }

    private mapData(resume: any) {
        const basics = resume.basics ?? {};
        const loc = basics.location;
        return {
            name: this.str(basics.name),
            label: this.str(basics.label),
            email: this.str(basics.email),
            phone: this.str(basics.phone),
            location: typeof loc === 'string'
                ? loc
                : loc ? [loc.city, loc.region, loc.countryCode].filter(Boolean).join(', ')
                    : '',
            url: this.str(basics.url),
            profiles: basics.profiles ?? [],
            summary: this.cleanSummary(this.str(basics.summary)),
            skills: this.normalizeSkills(resume.skills),
            work: resume.work ?? [],
            projects: resume.projects ?? [],
            education: resume.education ?? [],
            awards: this.normalizeAwards(resume.awards),
            certificates: this.normalizeCerts(resume.certificates),
        };
    }

    private contactLine(r: ReturnType<typeof this.mapData>): string {
        const parts: string[] = [];
        if (r.email) parts.push(r.email);
        if (r.phone) parts.push(r.phone);
        if (r.location) parts.push(r.location);

        const linkedin = r.profiles.find((p: any) =>
            p.network?.toLowerCase().includes('linkedin') ||
            p.url?.toLowerCase().includes('linkedin'));
        if (linkedin?.url)
            parts.push(`<a href="${this.str(linkedin.url)}">LinkedIn</a>`);

        const github = r.profiles.find((p: any) =>
            p.network?.toLowerCase().includes('github') ||
            p.url?.toLowerCase().includes('github'));
        if (github?.url)
            parts.push(`<a href="${this.str(github.url)}">GitHub</a>`);

        if (r.url && !r.url.includes('linkedin') && !r.url.includes('github'))
            parts.push(`<a href="${r.url}">Portfolio</a>`);

        return parts.join(' &nbsp;|&nbsp; ');
    }

    private md(t: string): string {
        return (t || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    private buildHTML(resume: any): string {
        const r = this.mapData(resume);
        const fmt = this.fmt.bind(this);
        const md = this.md.bind(this);

        const MAX_BULLETS_SENIOR = 7;
        const MAX_BULLETS_JUNIOR = 6;
        const MAX_BULLETS_PROJECT = 4;
        const MAX_PROJECTS = 2;
        const MAX_SKILLS_CATS = 5;

        const skillsHTML = r.skills.slice(0, MAX_SKILLS_CATS).map((s: any) => {
            const keywords = (s.keywords ?? s.skills ?? []).join(', ');
            return `<div class="skill-line"><strong>${s.name ?? s.category}:</strong> ${keywords}</div>`;
        }).join('');
        const workHTML = r.work.map((j: any, idx: number) => {
            const maxBullets = idx === 0 ? MAX_BULLETS_SENIOR : MAX_BULLETS_JUNIOR;
            const bullets = this.highlights(j.highlights ?? []).slice(0, maxBullets);
            const endLabel = (!j.endDate || j.endDate.toLowerCase() === 'present') ? 'Present' : fmt(j.endDate);
            return `
<div class="entry">
  <div class="row">
    <span class="company">${j.company ?? j.name ?? ''}</span>
    <span class="loc">${j.location ?? ''}</span>
  </div>
  <div class="sub">
    <strong>${j.position ?? ''}</strong>
    <span class="dates">${fmt(j.startDate)} – ${endLabel}</span>
  </div>
  ${bullets.length ? `<ul>${bullets.map(h => `<li>${md(h)}</li>`).join('')}</ul>` : ''}
</div>`;
        }).join('');

        const projectsHTML = r.projects.slice(0, MAX_PROJECTS).map((p: any) => {
            const bullets = this.highlights(p.highlights ?? []).slice(0, MAX_BULLETS_PROJECT);
            return `
<div class="entry">
  <div class="row">
    <span class="company">${p.name ?? ''}</span>
    ${p.url ? `<a href="${p.url}" class="proj-link">Link</a>` : ''}
  </div>
  ${p.description ? `<p class="proj-desc">${md(p.description)}</p>` : ''}
  ${bullets.length ? `<ul>${bullets.map(h => `<li>${md(h)}</li>`).join('')}</ul>` : ''}
</div>`;
        }).join('');

        const educationHTML = r.education.map((e: any) => `
<div class="entry">
  <div class="row">
    <span class="company">${e.institution ?? ''}</span>
    <span class="loc">${e.endDate ? fmt(e.endDate) : (e.startDate ? fmt(e.startDate) : '')}</span>
  </div>
  <div class="sub">
    ${e.studyType ?? ''}${e.area ? ' in ' + e.area : ''}${e.gpa ? ' &nbsp;|&nbsp; GPA: ' + e.gpa : ''}
  </div>
</div>`).join('');

        const certsHTML = r.certificates.length
            ? `<ul>${r.certificates.map((c: any) =>
                `<li>${c.name}${c.issuer ? ' — ' + c.issuer : ''}${c.date ? ' (' + fmt(c.date) + ')' : ''}</li>`
            ).join('')}</ul>`
            : '';

        const awardsHTML = r.awards.length
            ? `<ul>${r.awards.map((a: any) =>
                `<li>${a.title ?? ''}${a.awarder ? ' — ' + a.awarder : ''}${a.date ? ' (' + fmt(a.date) + ')' : ''}</li>`
            ).join('')}</ul>`
            : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  /* ── Page setup ── */
  @page { margin: 0.45in 0.55in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Arial', sans-serif;
    font-size: 10.5px;
    line-height: 1.4;
    color: #111;
    -webkit-print-color-adjust: exact;
  }

  /* ── Header ── */
  h1 {
    font-size: 19px;
    text-align: center;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }
  .label {
    font-size: 11px;
    color: #333;
    text-align: center;
    margin-bottom: 2px;
  }
  .contact {
    font-size: 10px;
    color: #222;
    text-align: center;
    margin-bottom: 10px;
  }
  .contact a { color: #111; text-decoration: underline; }

  /* ── Section titles — ATS parses these ── */
  .sec { margin-top: 10px; }
  .sec-title {
    font-size: 10.5px;
    font-weight: 700;
    border-bottom: 1.5px solid #000;
    padding-bottom: 1px;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  /* ── Summary ── */
  p.summary { font-size: 10.5px; text-align: left; }

  /* ── Work / project entries ── */
  .entry { margin-bottom: 7px; }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .company { font-weight: 700; font-size: 10.5px; }
  .loc     { font-size: 10px; color: #444; }
  .sub {
    font-size: 10px;
    color: #333;
    margin-bottom: 2px;
    display: flex;
    justify-content: space-between;
  }
  .dates { font-size: 10px; color: #444; }

  /* ── Bullets ── */
  ul {
    margin: 2px 0 4px 15px;
    padding: 0;
    list-style-type: disc;
  }
  li { margin-bottom: 1px; font-size: 10px; text-align: left; }

  /* ── Projects ── */
  .proj-desc { font-size: 10px; margin-bottom: 2px; }
  .proj-link { font-size: 9.5px; font-weight: normal; color: #111; text-decoration: underline; }

  /* ── Skills ── */
  .skill-line { font-size: 10px; margin-bottom: 2px; }
</style>
</head>
<body>

<h1>${r.name}</h1>
${r.label ? `<div class="label">${r.label}</div>` : ''}
<div class="contact">${this.contactLine(r)}</div>

${r.summary ? `
<div class="sec">
  <div class="sec-title">Professional Summary</div>
  <p class="summary">${r.summary}</p>
</div>` : ''}

${r.work.length ? `
<div class="sec">
  <div class="sec-title">Professional Experience</div>
  ${workHTML}
</div>` : ''}

${r.projects.length ? `
<div class="sec">
  <div class="sec-title">Projects</div>
  ${projectsHTML}
</div>` : ''}

${r.skills.length ? `
<div class="sec">
  <div class="sec-title">Technical Skills</div>
  ${skillsHTML}
</div>` : ''}

${r.education.length ? `
<div class="sec">
  <div class="sec-title">Education</div>
  ${educationHTML}
</div>` : ''}

${certsHTML ? `
<div class="sec">
  <div class="sec-title">Certifications</div>
  ${certsHTML}
</div>` : ''}

${awardsHTML ? `
<div class="sec">
  <div class="sec-title">Awards</div>
  ${awardsHTML}
</div>` : ''}

</body>
</html>`;
    }

    async generate(resumeJSON: any, requiredYearsExperience?: number): Promise<string> {
        if (requiredYearsExperience && resumeJSON.work) {
            resumeJSON = {
                ...resumeJSON,
                work: this.adjustExperienceDates(resumeJSON.work, requiredYearsExperience),
            };
        }

        const outputPath = path.join(process.cwd(), `output_${Date.now()}.pdf`);
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        await page.setContent(this.buildHTML(resumeJSON), { waitUntil: 'networkidle0' });
        await page.pdf({
            path: outputPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '0.45in', right: '0.55in', bottom: '0.45in', left: '0.55in' },
        });
        await browser.close();
        return outputPath;
    }
}