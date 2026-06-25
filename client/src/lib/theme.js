// Tiny theme helper — persists to localStorage, falls back to system preference.
// The initial class is applied by an inline script in index.html (no flash).
const KEY = 'quarters-theme';

export function currentTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function setTheme(theme) {
  try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
