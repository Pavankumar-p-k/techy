export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-line)] bg-[var(--color-paper)]/86 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-[var(--color-muted)] md:flex-row md:items-center md:justify-between md:px-6">
        <p>Student Tool Hub. Curated tools and resources for students with real-time updates.</p>
        <p className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)]">
          Next.js + Supabase + Vercel
        </p>
      </div>
    </footer>
  );
}
