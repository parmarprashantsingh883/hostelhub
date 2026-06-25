import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { currentTheme, toggleTheme } from '../lib/theme';

/** Light/dark theme toggle button. */
export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(currentTheme());
  const onClick = () => setTheme(toggleTheme());
  const dark = theme === 'dark';
  return (
    <button
      onClick={onClick}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={`relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white ${className}`}
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
