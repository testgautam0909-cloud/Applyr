import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
  ],
  template: `
    <header class="glass-header sticky-top">
      <div class="container-fluid px-md-5">
        <div class="header-inner d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-4">
            <div class="brand-section d-flex align-items-center gap-3">
              <div class="logo-box">
                  <i class="bi bi-rocket-takeoff-fill text-white"></i>
              </div>
              <div>
                  <h1 class="brand-title mb-0">Applyr</h1>
                  <p class="brand-tagline small mb-0 d-none d-md-block">AI-Powered Job Tracking</p>
              </div>
            </div>
            <nav class="nav-tabs-header d-flex align-items-center gap-1 ms-3 d-none d-md-flex">
              <a routerLink="/jobs" routerLinkActive="active" class="nav-tab">
                <i class="bi bi-briefcase-fill me-1"></i> Jobs
              </a>
              <a routerLink="/queue" routerLinkActive="active" class="nav-tab">
                <i class="bi bi-collection-fill me-1"></i> Queue
              </a>
            </nav>
          </div>
          
          <div class="actions-section d-flex align-items-center gap-2">
            <!-- Mobile Nav -->
            <div class="d-flex d-md-none gap-1">
              <a routerLink="/jobs" routerLinkActive="active" class="btn-mobile-nav" title="Jobs">
                <i class="bi bi-briefcase-fill"></i>
              </a>
              <a routerLink="/queue" routerLinkActive="active" class="btn-mobile-nav" title="Queue">
                <i class="bi bi-collection-fill"></i>
              </a>
            </div>
            <button 
              class="btn-theme-toggle"
              (click)="toggleTheme()"
              [title]="themeService.theme() === 'light' ? 'Switch to dark mode' : 'Switch to light mode'">
              <i class="bi" [class.bi-moon-stars-fill]="themeService.theme() === 'light'" [class.bi-sun-fill]="themeService.theme() === 'dark'"></i>
            </button>
            <div class="user-profile-mini d-none d-sm-flex align-items-center gap-2 ms-2">
                <div class="avatar-header">GM</div>
                <span class="small fw-bold text-dark">Gautam Malaviya</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .glass-header {
      background: var(--glass-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      z-index: 1000;
      padding: 12px 0;
    }

    .header-inner {
        height: 48px;
    }

    .logo-box {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
    }

    .brand-title {
        font-size: 1.4rem;
        font-weight: 800;
        background: linear-gradient(135deg, var(--text-main) 0%, var(--text-muted) 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        letter-spacing: -0.03em;
    }

    .brand-tagline {
        font-size: 0.7rem;
        color: #6B7280;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .nav-tabs-header {
        border-left: 1px solid var(--glass-border);
        padding-left: 16px;
    }

    .nav-tab {
        padding: 8px 16px;
        border-radius: 10px;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-muted);
        text-decoration: none;
        transition: all 0.2s ease;

        &:hover {
            background: var(--bg-app);
            color: var(--primary-vibrant);
        }

        &.active {
            background: var(--primary-glow);
            color: var(--primary-vibrant);
        }
    }

    .btn-mobile-nav {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        border: 1px solid var(--glass-border);
        background: var(--card-bg);
        color: var(--text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        text-decoration: none;
        transition: all 0.2s ease;

        &:hover, &.active {
            background: var(--primary-glow);
            color: var(--primary-vibrant);
            border-color: var(--primary-vibrant);
        }
    }

    .btn-theme-toggle {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        border: 1px solid var(--glass-border);
        background: var(--card-bg);
        color: var(--text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        
        &:hover {
            background: var(--bg-app);
            transform: translateY(-1px);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
            color: var(--primary-vibrant);
        }
    }

    .avatar-header {
        width: 32px;
        height: 32px;
        background: #EDE9FE;
        color: #7C3AED;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: 700;
        border: 1px solid rgba(124, 58, 237, 0.1);
    }

    @media (max-width: 768px) {
        .glass-header { padding: 8px 0; }
        .logo-box { width: 36px; height: 36px; }
        .brand-title { font-size: 1.2rem; }
    }
  `]
})
export class HeaderComponent {
  protected readonly themeService = inject(ThemeService);

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}