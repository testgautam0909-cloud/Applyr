import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);

    private readonly _theme = signal<Theme>(this.getInitialTheme());
    readonly theme = this._theme.asReadonly();

    constructor() {
        effect(() => {
            if (this.isBrowser) {
                const currentTheme = this._theme();
                document.documentElement.setAttribute('data-bs-theme', currentTheme);
                localStorage.setItem('theme', currentTheme);
            }
        });
    }

    toggleTheme(): void {
        this._theme.update(t => t === 'light' ? 'dark' : 'light');
    }

    private getInitialTheme(): Theme {
        if (!this.isBrowser) return 'light';

        const saved = localStorage.getItem('theme') as Theme;
        if (saved) return saved;

        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
}
