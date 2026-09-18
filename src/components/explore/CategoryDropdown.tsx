"use client";

import { useEffect, useRef, useState } from "react";

interface CategoryDropdownProps {
  label: string;
  categories: string[];
  value: string;
  onChange: (value: string) => void;
}

export function CategoryDropdown({ label, categories, value, onChange }: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointer(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const allItems = ["All", ...categories];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="btn btn-ghost btn-md w-full justify-between gap-2 sm:w-56"
      >
        <span className="flex items-center gap-2 truncate">
          <span className="overline shrink-0">{label}</span>
          <span className="truncate font-bold text-[var(--color-ink)]">{value === "All" ? "All" : value}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-[var(--color-faint)] transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen ? (
        <div
          role="listbox"
          aria-label={`${label} options`}
          className="absolute left-0 top-12 z-40 w-full min-w-56 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-strong)] sm:w-64"
        >
          <div className="max-h-72 overflow-y-auto">
            {allItems.map((item) => {
              const selected = value === item;
              return (
                <button
                  key={item}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(item);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                    selected
                      ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                      : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {item === "All" ? `All ${label.toLowerCase()}s` : item}
                  {selected ? <span aria-hidden="true">✓</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
