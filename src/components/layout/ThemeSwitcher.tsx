"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "sth-ui-theme";
const THEMES = [
  { value: "forest", label: "Forest" },
  { value: "dark", label: "Dark" },
] as const;

type ThemeValue = (typeof THEMES)[number]["value"];

function getInitialTheme(): ThemeValue {
  if (typeof window === "undefined") {
    return "forest";
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "midnight") {
    return "dark";
  }
  const isValid = THEMES.some((item) => item.value === saved);
  return isValid ? (saved as ThemeValue) : "forest";
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeValue>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)]">
      Theme
      <select
        value={theme}
        onChange={(event) => setTheme(event.target.value as ThemeValue)}
        className="rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] px-2 py-1 text-xs text-[var(--color-ink)]"
        aria-label="Select theme"
      >
        {THEMES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
