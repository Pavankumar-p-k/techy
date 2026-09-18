"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "sth-ui-theme";
type ThemeValue = "light" | "dark";

function getInitialTheme(): ThemeValue {
  if (typeof window === "undefined") {
    return "light";
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "dark" ? "dark" : "light";
}

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeValue>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className="btn btn-ghost btn-sm"
        aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
        title={theme === "light" ? "Dark theme" : "Light theme"}
      >
        {theme === "light" ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <div className="segmented" role="group" aria-label="Theme selection">
      <button type="button" data-active={theme === "light"} onClick={() => setTheme("light")}>
        Light
      </button>
      <button type="button" data-active={theme === "dark"} onClick={() => setTheme("dark")}>
        Dark
      </button>
    </div>
  );
}
