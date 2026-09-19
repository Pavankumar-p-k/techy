/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";

// Minimal primary navigation — many routes, few destinations.
const PRIMARY_LINKS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/explore", label: "Explore", icon: "search" },
  { href: "/messages", label: "Messages", icon: "chat" },
  { href: "/notifications", label: "Notifications", icon: "bell" },
] as const;

const CREATE_OPTIONS = [
  { href: "/create/post", label: "Post", description: "Share an update", icon: "✍️" },
  { href: "/create/project", label: "Project", description: "Showcase your work", icon: "🚀" },
  { href: "/create/post?type=achievement", label: "Achievement", description: "Wins & certificates", icon: "🏆" },
  { href: "/create/post?type=course_completion", label: "Course Completed", description: "Learning progress", icon: "🎓" },
  { href: "/submit", label: "Submit Tool", description: "Add a tool you love", icon: "🛠️" },
  { href: "/submit/resource", label: "Submit Resource", description: "Share a learning resource", icon: "📚" },
];

function NavIcon({ name, className }: { name: string; className: string }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 12a8 8 0 0 1-8 8H4l1.6-3.2A8 8 0 1 1 21 12Z" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    default:
      return null;
  }
}

export function SiteHeader() {
  const pathname = usePathname();
  const { user, profile, loading } = useAuthUser();
  const supabase = getSupabaseBrowserClient();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const profileHref = profile?.username ? `/u/${profile.username}` : "/settings";

  // Live unread counts (notifications + messages)
  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      setUnreadMessages(0);
      return;
    }

    let mounted = true;

    async function loadCounts() {
      const [notifRes, convRes] = await Promise.all([
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("is_read", false),
        supabase
          .from("conversation_members")
          .select("conversation_id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .filter("conversations.updated_at", "gt", "last_read_at")
          .filter("conversations.updated_at", "not.is", null),
      ]);

      if (!mounted) {
        return;
      }

      setUnreadNotifications(notifRes.count ?? 0);
      setUnreadMessages(convRes.count ?? 0);
    }

    void loadCounts();

    const notifChannel = supabase
      .channel(`nav-notif-${user!.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user!.id}` }, () => {
        void loadCounts();
      })
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(notifChannel);
    };
  }, [supabase, user]);

  // Close create dropdown on outside click or Escape
  useEffect(() => {
    if (!isCreateOpen) {
      return;
    }

    function handlePointer(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-create-menu]")) {
        setIsCreateOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCreateOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isCreateOpen]);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-[var(--color-line)] bg-[var(--color-overlay)] backdrop-blur-xl">
        <div className="container-app flex h-14 items-center gap-2">
          {/* Logo */}
          <Link href="/" className="mr-2 flex items-center gap-2" aria-label="Student Tool Hub home">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--color-ink)] text-sm font-black tracking-tight text-[var(--color-paper)]">
              ST
            </span>
            <span className="hidden text-sm font-bold tracking-tight text-[var(--color-ink)] md:block">StudentHub</span>
          </Link>

          {/* Desktop primary nav */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {PRIMARY_LINKS.map((item) => {
              const active = isActive(item.href);
              const badge =
                item.href === "/notifications" ? unreadNotifications : item.href === "/messages" ? unreadMessages : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-full px-3 py-2 transition ${
                    active
                      ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                      : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
                  }`}
                  aria-label={item.label}
                >
                  <NavIcon name={item.icon} className="h-5 w-5" />
                  {badge > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-bold text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {/* Right: create dropdown + theme + avatar */}
          <div className="ml-auto flex items-center gap-2">
            {/* Create dropdown */}
            <div className="relative hidden md:block" data-create-menu>
              <button
                type="button"
                onClick={() => setIsCreateOpen((current) => !current)}
                aria-expanded={isCreateOpen}
                aria-haspopup="menu"
                aria-label="Create"
                className={`btn btn-sm h-9 w-9 !p-0 ${isCreateOpen ? "btn-accent" : "btn-primary"}`}
              >
                <NavIcon name="plus" className="h-4 w-4" />
              </button>

              {isCreateOpen ? (
                <div
                  role="menu"
                  aria-label="Create options"
                  className="absolute right-0 top-11 w-64 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-strong)]"
                >
                  {CREATE_OPTIONS.map((option) => (
                    <Link
                      key={option.label}
                      href={option.href}
                      role="menuitem"
                      onClick={() => setIsCreateOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[var(--color-surface-2)]"
                    >
                      <span className="text-xl" aria-hidden="true">{option.icon}</span>
                      <span>
                        <span className="block text-sm font-bold text-[var(--color-ink)]">{option.label}</span>
                        <span className="block text-xs text-[var(--color-faint)]">{option.description}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            <ThemeSwitcher compact />
            {!loading && user ? (
              <Link
                href={profileHref}
                aria-label="Your profile"
                className={`grid h-9 w-9 place-items-center overflow-hidden rounded-full border text-xs font-bold transition ${
                  isActive("/u") || isActive("/settings")
                    ? "border-[var(--color-ink)]"
                    : "border-[var(--color-line)]"
                } bg-[var(--color-surface-2)] text-[var(--color-ink)]`}
              >
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  getInitials(profile?.full_name || user.email || "U")
                )}
              </Link>
            ) : null}
            {!loading && !user ? (
              <Link href="/login" className="btn btn-primary btn-sm">
                Login
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav
        className="safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-line)] bg-[var(--color-overlay)] backdrop-blur-xl md:hidden"
        aria-label="Primary mobile"
      >
        <div className="grid grid-cols-6">
          {PRIMARY_LINKS.map((item) => {
            const active = isActive(item.href);
            const badge =
              item.href === "/notifications" ? unreadNotifications : item.href === "/messages" ? unreadMessages : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[9px] font-semibold transition ${
                  active ? "text-[var(--color-ink)]" : "text-[var(--color-faint)]"
                }`}
              >
                <NavIcon name={item.icon} className="h-5 w-5" />
                {item.label}
                {badge > 0 ? (
                  <span className="absolute right-[18%] top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-[var(--color-danger)] px-1 text-[9px] font-bold text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
          <Link
            href="/create"
            className={`flex flex-col items-center gap-0.5 py-2 text-[9px] font-semibold transition ${
              isActive("/create") ? "text-[var(--color-ink)]" : "text-[var(--color-faint)]"
            }`}
          >
            <span className="grid h-5 w-5 place-items-center rounded-md bg-[var(--color-ink)] text-[var(--color-paper)]" aria-hidden="true">
              <NavIcon name="plus" className="h-3.5 w-3.5" />
            </span>
            Create
          </Link>
          <Link
            href={profileHref}
            className={`flex flex-col items-center gap-0.5 py-2 text-[9px] font-semibold transition ${
              isActive("/u") || isActive("/settings") ? "text-[var(--color-ink)]" : "text-[var(--color-faint)]"
            }`}
          >
            <span className="grid h-5 w-5 place-items-center overflow-hidden rounded-full border border-current text-[9px] font-black">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                getInitials(profile?.full_name || user?.email || "U")
              )}
            </span>
            Profile
          </Link>
        </div>
      </nav>
    </>
  );
}
