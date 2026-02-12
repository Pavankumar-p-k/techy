export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-line)] bg-[var(--color-paper)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-[var(--color-muted)] md:flex-row md:items-center md:justify-between md:px-6">
        <p>Student Tool Hub - useful free tools and platforms for students.</p>
        <p>Built with Next.js, Supabase, and Vercel.</p>
      </div>
    </footer>
  );
}
