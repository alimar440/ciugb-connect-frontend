import { Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';
const KEY = 'ciugb-theme';
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly current = signal<Theme>(this.initial());
  constructor() {
    this.apply(this.current());
  }
  private initial(): Theme {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      /* Le thème reste utilisable sans stockage. */
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  toggle(): void {
    const next = this.current() === 'dark' ? 'light' : 'dark';
    this.current.set(next);
    this.apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* Choix conservé pour la session. */
    }
  }
  private apply(theme: Theme): void {
    document.documentElement.dataset['theme'] = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#101010' : '#f8f6f3');
  }
}
