"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getInitials } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/submit", label: "Submit Tool" },
  { href: "/bookmarks", label: "Bookmarks" },
  { href: "/profile", label: "Profile" },
];

function linkClass(active: boolean): string {
  return active
    ? "shrink-0 rounded-full bg-[var(--color-ink)] px-3 py-2 text-xs font-semibold text-[var(--color-paper)] shadow-sm sm:px-4 sm:text-sm"
    : "shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)] sm:px-4 sm:text-sm";
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuthUser();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isAdmin = useMemo(() => profile?.role === "admin", [profile?.role]);
  const isHome = pathname === "/";

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    router.push("/");
    setIsSigningOut(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-line)] bg-[var(--color-paper)]/88 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
        <Link href="/" className="mr-3 flex items-center gap-2 rounded-xl p-1 transition hover:bg-[var(--color-surface)]/80">
          <span className="shimmer grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-ink)] text-sm font-bold text-[var(--color-paper)]">ST</span>
          <div>
            <p className="text-sm font-bold tracking-wide text-[var(--color-ink)]">Student Tool Hub</p>
            <p className="text-xs text-[var(--color-muted)]">tools for students</p>
          </div>
        </Link>

        <nav className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto pb-1 sm:order-2 sm:mx-0 sm:w-auto sm:overflow-visible sm:pb-0">
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

        <div className="ml-auto flex items-center gap-2 sm:order-3">
          <ThemeSwitcher />
          {!isHome
            ? loading
              ? (
                <span className="text-xs text-[var(--color-muted)]">Loading...</span>
              )
              : user
                ? (
                  <>
                    <Link href="/profile" className="hidden items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 pr-3 sm:flex">
                      {profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.avatar_url} alt="Profile avatar" className="h-8 w-8 rounded-full border border-[var(--color-line)] object-cover" />
                      ) : (
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-surface-2)] text-xs font-bold text-[var(--color-ink)]">
                          {getInitials(profile?.full_name ?? user.email ?? "U")}
                        </span>
                      )}
                      <span className="max-w-32 truncate text-xs text-[var(--color-muted)]">{profile?.full_name ?? user.email}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="rounded-full border border-[var(--color-line)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-2)] disabled:opacity-60 sm:px-4 sm:text-sm"
                    >
                      {isSigningOut ? "Signing out..." : "Logout"}
                    </button>
                  </>
                )
                : (
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
                )
            : null}
        </div>
      </div>
    </header>
  );
}
