import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'am_theme';

  private _isDark = new BehaviorSubject<boolean>(this._loadInitialTheme());
  readonly isDark$ = this._isDark.asObservable();

  get isDark(): boolean { return this._isDark.value; }

  constructor() {
    this._applyTheme(this._isDark.value);
  }

  toggle(): void {
    const next = !this._isDark.value;
    // Add transition class so switching animates smoothly, then remove it
    document.documentElement.classList.add('theme-transitioning');
    this._isDark.next(next);
    this._applyTheme(next);
    try { localStorage.setItem(this.STORAGE_KEY, next ? 'dark' : 'light'); } catch { /* ignore */ }
    setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 300);
  }

  private _loadInitialTheme(): boolean {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) return saved === 'dark';
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
      return false;
    }
  }

  private _applyTheme(dark: boolean): void {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
}
