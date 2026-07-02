import { Injectable, signal } from '@angular/core';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'tichr-theme';

/** Cor da barra do navegador mobile (meta theme-color) por tema — espelha --bg. */
const THEME_COLOR: Record<Theme, string> = {
  light: '#f8fafc',
  dark: '#0f172a',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.resolveInitialTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    this.applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLOR[theme]);
  }

  private resolveInitialTheme(): Theme {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    return prefersDark ? 'dark' : 'light';
  }
}
