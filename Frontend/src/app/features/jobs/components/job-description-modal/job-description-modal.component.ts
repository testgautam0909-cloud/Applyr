import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { JobsService } from '../../../jobs/services/jobs.service';
import { JobApplication } from '../../../jobs/models/job.model';

export interface JDModalData {
  job: JobApplication;
}

@Component({
  selector: 'app-job-description-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  template: `
    <div class="jd-modal">
      <!-- Header -->
      <div class="jd-modal-header">
        <div class="header-left">
          <div class="job-meta">
            <span class="platform-badge" *ngIf="data.job.sourcePlatform">
              <i class="bi bi-broadcast-pin"></i> {{ data.job.sourcePlatform }}
            </span>
            <span class="status-pill">{{ data.job.status }}</span>
          </div>
          <h3 class="job-title-modal">{{ data.job.jobTitle || 'Job Description' }}</h3>
          <p class="company-line">
            <i class="bi bi-building"></i> {{ data.job.company }}
            <span class="separator">·</span>
            <i class="bi bi-geo-alt"></i> {{ data.job.location }}
            <span *ngIf="data.job.experience" class="separator">·</span>
            <span *ngIf="data.job.experience"><i class="bi bi-briefcase"></i> {{ data.job.experience }}</span>
          </p>
        </div>
        <div class="header-actions">
          <a *ngIf="data.job.postURL" [href]="data.job.postURL" target="_blank" rel="noopener"
             class="btn-view-post" title="View original posting">
            <i class="bi bi-box-arrow-up-right"></i> View Post
          </a>
          <button class="btn-close-modal" (click)="close()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="jd-modal-body">
        <!-- Tech Stack Pills -->
        <div class="tech-stack-section" *ngIf="data.job.techStack?.length">
          <div class="section-label"><i class="bi bi-code-square"></i> Tech Stack</div>
          <div class="tech-pills">
            <span class="tech-pill" *ngFor="let t of data.job.techStack">{{ t }}</span>
          </div>
        </div>

        <!-- AI Insights: Tips -->
        <div class="ai-insight-card tips-card" *ngIf="aiInsights.tips.length">
          <div class="card-header">
            <i class="bi bi-magic"></i>
            <span>Resume Tailoring Tips</span>
          </div>
          <div class="card-content">
            <div *ngFor="let block of aiInsights.tips" class="jd-block">
              <h6 *ngIf="block.type === 'heading'" class="insight-heading" [innerHTML]="block.text"></h6>
              <ul *ngIf="block.type === 'bullets'" class="insight-bullets">
                <li *ngFor="let b of block.items" [innerHTML]="b"></li>
              </ul>
              <p *ngIf="block.type === 'paragraph'" class="insight-para" [innerHTML]="block.text"></p>
            </div>
          </div>
        </div>

        <!-- AI Insights: Red Flags -->
        <div class="ai-insight-card flags-card" *ngIf="aiInsights.redFlags.length">
          <div class="card-header">
            <i class="bi bi-exclamation-triangle-fill text-warning"></i>
            <span>Red Flags & Nuances</span>
          </div>
          <div class="card-content">
            <div *ngFor="let block of aiInsights.redFlags" class="jd-block">
              <h6 *ngIf="block.type === 'heading'" class="insight-heading" [innerHTML]="block.text"></h6>
              <ul *ngIf="block.type === 'bullets'" class="insight-bullets">
                <li *ngFor="let b of block.items" [innerHTML]="b"></li>
              </ul>
              <p *ngIf="block.type === 'paragraph'" class="insight-para" [innerHTML]="block.text"></p>
            </div>
          </div>
        </div>

        <!-- Main JD Content -->
        <div class="jd-content-wrapper">
          <div class="section-label mb-3"><i class="bi bi-file-text"></i> Job Description</div>
          <div class="jd-content" *ngIf="parsedBlocks.length; else noJD">
            <div *ngFor="let block of parsedBlocks" class="jd-block">
              <h5 *ngIf="block.type === 'heading'" class="jd-heading">
                <span class="heading-bar"></span>{{ block.text }}
              </h5>
              <ul *ngIf="block.type === 'bullets'" class="jd-bullets">
                <li *ngFor="let b of block.items" [innerHTML]="b"></li>
              </ul>
              <p *ngIf="block.type === 'paragraph'" class="jd-para" [innerHTML]="block.text"></p>
              <hr *ngIf="block.type === 'divider'" class="jd-divider" />
            </div>
          </div>
        </div>

        <ng-template #noJD>
          <div class="empty-jd">
            <i class="bi bi-file-earmark-text fs-2 mb-2 text-muted opacity-50"></i>
            <p class="text-muted small">No job description available for this role.</p>
          </div>
        </ng-template>
      </div>

      <!-- Footer -->
      <div class="jd-modal-footer">
        <button class="btn-close-text" (click)="close()">Close</button>
      </div>
    </div>
    `,
  styles: [`
        .jd-modal {
            display: flex;
            flex-direction: column;
            max-height: 90vh;
            background: var(--card-bg, #fff);
            border-radius: 20px;
            overflow: hidden;
            font-family: 'Inter', sans-serif;
        }

        /* Header */
        .jd-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            padding: 24px 28px 20px;
            background: linear-gradient(135deg, rgba(124,58,237,0.07) 0%, transparent 100%);
            border-bottom: 1px solid var(--glass-border, rgba(0,0,0,0.07));
        }

        .header-left { flex: 1; min-width: 0; }
        .header-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

        .job-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }

        .platform-badge {
            display: inline-flex; align-items: center; gap: 4px;
            background: rgba(124,58,237,0.09); color: #7C3AED;
            padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
            border: 1px solid rgba(124,58,237,0.12);
        }

        .status-pill {
            display: inline-flex; align-items: center;
            background: rgba(0,0,0,0.05); color: var(--text-muted, #6B7280);
            padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
            border: 1px solid rgba(0,0,0,0.07);
        }

        .job-title-modal {
            font-size: 1.35rem; font-weight: 800; margin: 0 0 6px;
            color: var(--text-main, #111827); line-height: 1.3;
        }

        .company-line {
            font-size: 0.88rem; color: var(--text-muted, #6B7280);
            margin: 0; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
        }
        .separator { opacity: 0.4; }

        .btn-view-post {
            display: inline-flex; align-items: center; gap: 6px;
            background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
            color: white; text-decoration: none;
            padding: 8px 16px; border-radius: 10px; font-size: 0.82rem; font-weight: 600;
            border: none; transition: all 0.2s ease;
            white-space: nowrap;
            &:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(124,58,237,0.35); color: white; }
        }

        .btn-close-modal {
            display: inline-flex; align-items: center; justify-content: center;
            width: 36px; height: 36px; border-radius: 10px;
            background: transparent; border: 1px solid var(--glass-border, rgba(0,0,0,0.1));
            color: var(--text-muted, #6B7280); cursor: pointer; font-size: 0.9rem;
            transition: all 0.2s ease;
            &:hover { background: #FEE2E2; color: #DC2626; border-color: #FCA5A5; }
        }

        /* Body */
        .jd-modal-body {
            flex: 1; overflow-y: auto; padding: 24px 28px;
            scroll-behavior: smooth;
        }

        /* Tech Stack */
        .tech-stack-section {
            margin-bottom: 24px; padding-bottom: 16px;
            border-bottom: 1px solid var(--glass-border, rgba(0,0,0,0.06));
        }
        .section-label {
            font-size: 11px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.08em; color: var(--text-muted, #9CA3AF);
            margin-bottom: 12px; display: flex; align-items: center; gap: 6px;
        }
        .tech-pills { display: flex; flex-wrap: wrap; gap: 6px; }
        .tech-pill {
            background: rgba(124,58,237,0.08); color: #7C3AED;
            padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 600;
            border: 1px solid rgba(124,58,237,0.1);
        }

        /* AI Insight Cards */
        .ai-insight-card {
            border-radius: 16px; margin-bottom: 24px; overflow: hidden;
            border: 1px solid rgba(124,58,237,0.1);
            box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        }
        .ai-insight-card .card-header {
            padding: 12px 20px; font-size: 0.9rem; font-weight: 700;
            display: flex; align-items: center; gap: 10px;
        }
        .ai-insight-card .card-content { padding: 16px 20px; }

        .tips-card { background: #F9F7FF; border-color: rgba(124,58,237,0.2); }
        .tips-card .card-header {
            background: linear-gradient(90deg, rgba(124,58,237,0.1) 0%, transparent 100%);
            color: #7C3AED; border-bottom: 1px solid rgba(124,58,237,0.1);
        }

        .flags-card { background: #FFFBF0; border-color: rgba(217,119,6,0.2); }
        .flags-card .card-header {
            background: linear-gradient(90deg, rgba(217,119,6,0.08) 0%, transparent 100%);
            color: #D97706; border-bottom: 1px solid rgba(217,119,6,0.1);
        }

        .insight-heading { font-size: 0.88rem; font-weight: 700; margin: 12px 0 6px; color: #1F2937; }
        .insight-heading:first-child { margin-top: 0; }
        .insight-para { font-size: 0.86rem; color: #4B5563; line-height: 1.5; margin-bottom: 8px; }
        .insight-bullets {
            list-style: none; padding: 0; margin: 0 0 10px;
            li {
                position: relative; padding-left: 18px; font-size: 0.86rem;
                color: #4B5563; line-height: 1.5; margin-bottom: 4px;
                &::before {
                    content: '•'; position: absolute; left: 4px; color: currentColor; opacity: 0.5;
                }
            }
        }

        /* Main JD Content */
        .jd-content-wrapper { margin-top: 24px; }
        .jd-content { display: flex; flex-direction: column; gap: 4px; }
        .jd-block { margin-bottom: 2px; }

        .jd-heading {
            display: flex; align-items: center; gap: 10px;
            font-size: 0.95rem; font-weight: 700;
            color: var(--text-main, #111827); margin: 16px 0 8px;
        }
        .jd-heading:first-child { margin-top: 0; }
        .heading-bar {
            display: inline-block; width: 4px; height: 18px;
            background: linear-gradient(180deg, #7C3AED, #6D28D9);
            border-radius: 2px; flex-shrink: 0;
        }

        .jd-bullets {
            list-style: none; padding: 0; margin: 0 0 4px; display: flex; flex-direction: column; gap: 4px;
            li {
                padding: 4px 0 4px 20px; position: relative;
                font-size: 0.88rem; color: var(--text-main, #374151); line-height: 1.55;
                &::before {
                    content: '';
                    position: absolute; left: 6px; top: 12px;
                    width: 5px; height: 5px; border-radius: 50%;
                    background: #7C3AED; opacity: 0.6;
                }
            }
        }

        .jd-para {
            font-size: 0.88rem; color: var(--text-main, #374151);
            line-height: 1.6; margin: 0 0 4px;
        }

        .jd-divider {
            border: none; border-top: 1px dashed rgba(124,58,237,0.15);
            margin: 16px 0;
        }

        .empty-jd {
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; padding: 60px 0; color: var(--text-muted, #9CA3AF);
        }

        /* Footer */
        .jd-modal-footer {
            display: flex; justify-content: flex-end; gap: 12px;
            padding: 16px 28px; border-top: 1px solid var(--glass-border, rgba(0,0,0,0.06));
            background: var(--card-bg, #fff);
        }
        .btn-close-text {
            background: transparent; border: 1px solid var(--glass-border, rgba(0,0,0,0.1));
            color: var(--text-muted, #6B7280); padding: 8px 20px;
            border-radius: 10px; font-weight: 600; font-size: 0.88rem; cursor: pointer;
            transition: all 0.2s ease;
            &:hover { background: var(--bg-app, #F9FAFB); color: var(--text-main, #111827); }
        }
    `]
})
export class JobDescriptionModalComponent {
  protected readonly data: JDModalData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<JobDescriptionModalComponent>);
  private readonly service = inject(JobsService);

  protected readonly parsedBlocks: any[];
  protected readonly aiInsights: { tips: any[], redFlags: any[] } = { tips: [], redFlags: [] };

  constructor() {
    const { blocks, aiInsights } = this.parseJD(this.data.job.jobDescription ?? '');
    this.parsedBlocks = blocks;
    this.aiInsights = aiInsights;
  }

  protected close(): void {
    this.dialogRef.close();
  }

  private parseJD(raw: string): { blocks: any[], aiInsights: { tips: any[], redFlags: any[] } } {
    if (!raw?.trim()) return { blocks: [], aiInsights: { tips: [], redFlags: [] } };

    const blocks: any[] = [];
    const aiInsights = { tips: [] as any[], redFlags: [] as any[] };
    const lines = raw.split('\n');
    let bulletBuffer: string[] = [];
    let currentSection: 'none' | 'tips' | 'redFlags' = 'none';

    const processText = (text: string) => {
      // Simple bold replacement: **text** -> <b>text</b>
      return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    };

    const flushBullets = () => {
      if (bulletBuffer.length > 0) {
        const block = { type: 'bullets', items: [...bulletBuffer] };
        if (currentSection === 'tips') aiInsights.tips.push(block);
        else if (currentSection === 'redFlags') aiInsights.redFlags.push(block);
        else blocks.push(block);
        bulletBuffer = [];
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        // If we were in a section, a double newline might end it if it's not a list
        // For now, let's just flush bullets
        flushBullets();
        continue;
      }

      // Divider
      if (trimmed === '---') {
        flushBullets();
        blocks.push({ type: 'divider' });
        currentSection = 'none';
        continue;
      }

      // Detect Sections
      if (trimmed.includes('Resume Tailoring Tips')) {
        flushBullets();
        currentSection = 'tips';
        continue;
      }
      if (trimmed.includes('Red Flags or Important Nuances')) {
        flushBullets();
        currentSection = 'redFlags';
        continue;
      }

      // Bold heading: **Heading Text**
      const headingMatch = trimmed.match(/^\*\*(.+?)\*\*\s*$/);
      if (headingMatch) {
        flushBullets();
        const block = { type: 'heading', text: headingMatch[1] };
        if (currentSection === 'tips') aiInsights.tips.push(block);
        else if (currentSection === 'redFlags') aiInsights.redFlags.push(block);
        else blocks.push(block);
        continue;
      }

      // Bullet: starts with - or *
      const bulletMatch = trimmed.match(/^[-*]\s+(.+)/);
      if (bulletMatch) {
        bulletBuffer.push(processText(bulletMatch[1]));
        continue;
      }

      // Default: paragraph
      flushBullets();
      const pBlock = { type: 'paragraph', text: processText(trimmed) };
      if (currentSection === 'tips') aiInsights.tips.push(pBlock);
      else if (currentSection === 'redFlags') aiInsights.redFlags.push(pBlock);
      else blocks.push(pBlock);
    }

    flushBullets();
    return { blocks, aiInsights };
  }
}
