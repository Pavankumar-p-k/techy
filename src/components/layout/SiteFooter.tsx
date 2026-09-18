import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/projects", label: "Projects" },
  { href: "/tools", label: "Tools" },
  { href: "/resources", label: "Resources" },
  { href: "/settings", label: "Settings" },
];

export function SiteFooter() {
  return (
    <footer className="safe-bottom border-t border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="container-app flex flex-col gap-5 py-8 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-ink)] text-xs font-black text-[var(--color-paper)]">ST</span>
            <p className="text-sm font-bold text-[var(--color-ink)]">StudentHub</p>
          </div>
          <p className="mt-2 max-w-sm text-xs leading-5 text-[var(--color-muted)]">
            A social technical community — discover students, showcase projects, and build together.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
          {FOOTER_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="text-xs font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-ink)]">
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="chip">Next.js + Supabase</p>
      </div>
    </footer>
  );
}
