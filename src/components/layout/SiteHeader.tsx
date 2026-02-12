"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/submit", label: "Submit Tool" },
  { href: "/bookmarks", label: "Bookmarks" },
  { href: "/profile", label: "Profile" },
];

function linkClass(active: boolean): string {
  return active
    ? "rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-[var(--color-paper)]"
    : "rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]";
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuthUser();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isAdmin = useMemo(() => profile?.role === "admin", [profile?.role]);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    router.push("/");
    setIsSigningOut(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-line)] bg-[var(--color-paper)]/92 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
        <Link href="/" className="mr-3 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-ink)] text-sm font-bold text-[var(--color-paper)]">ST</span>
          <div>
            <p className="text-sm font-bold tracking-wide text-[var(--color-ink)]">Student Tool Hub</p>
            <p className="text-xs text-[var(--color-muted)]">free tools for students</p>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(pathname === item.href)}>
              {item.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link href="/admin" className={linkClass(pathname === "/admin")}>
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {loading ? (
            <span className="text-xs text-[var(--color-muted)]">Loading...</span>
          ) : user ? (
            <>
              <span className="hidden text-xs text-[var(--color-muted)] sm:inline">{profile?.full_name ?? user.email}</span>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-2)] disabled:opacity-60"
              >
                {isSigningOut ? "Signing out..." : "Logout"}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-2)]">
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
