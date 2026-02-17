"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#categories", label: "Categories" },
  { href: "/submit", label: "Submit Tool" },
  { href: "/bookmarks", label: "Bookmarks" },
];

function linkClass(active: boolean): string {
  return active
    ? "shrink-0 rounded-full bg-[var(--color-ink)] px-3 py-2 text-xs font-semibold text-[var(--color-paper)] shadow-md sm:px-4 sm:text-sm"
    : "shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)] sm:px-4 sm:text-sm";
}

export function SiteHeader() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, loading } = useAuthUser();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-line)] bg-[var(--color-paper)]/82 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
        <Link href="/" className="mr-3 flex items-center gap-2 rounded-xl p-1 transition hover:bg-[var(--color-surface)]/80">
          <span className="shimmer grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-ink)] text-sm font-bold text-[var(--color-paper)]">ST</span>
          <div>
            <p className="text-sm font-bold tracking-wide text-[var(--color-ink)]">Student Tool Hub</p>
            <p className="text-xs text-[var(--color-muted)]">professional discovery platform</p>
          </div>
        </Link>

        <nav
          className={`${isMobileMenuOpen ? "flex" : "hidden"} order-4 w-full flex-col gap-1 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-2 lg:order-2 lg:flex lg:w-auto lg:flex-row lg:items-center lg:gap-1 lg:border-0 lg:bg-transparent lg:p-0`}
        >
          {NAV_LINKS.map((item) => {
            let isActive = false;
            if (item.href === "/") {
              isActive = pathname === "/";
            } else if (item.href.startsWith("/#")) {
              isActive = pathname === "/";
            } else {
              isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            }
            return (
              <Link key={item.href} href={item.href} className={linkClass(isActive)} onClick={() => setIsMobileMenuOpen(false)}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:order-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <span className="sr-only">Menu</span>
            <span className="relative block h-4 w-4">
              <span className={`absolute left-0 top-0 block h-0.5 w-4 bg-current transition ${isMobileMenuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
              <span className={`absolute left-0 top-[7px] block h-0.5 w-4 bg-current transition ${isMobileMenuOpen ? "opacity-0" : "opacity-100"}`} />
              <span className={`absolute left-0 top-[14px] block h-0.5 w-4 bg-current transition ${isMobileMenuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
            </span>
          </button>
          {!loading && !user ? (
            <>
              <Link href="/login" className="rounded-full px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-2)] sm:px-4 sm:text-sm">
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-white transition hover:brightness-95 sm:px-4 sm:text-sm"
              >
                Join
              </Link>
            </>
          ) : null}
          {!loading && user ? (
            <Link
              href="/profile"
              className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-2)] sm:px-4 sm:text-sm"
            >
              Profile
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
