export function SiteFooter() {
  return (
    <footer className="safe-bottom border-t border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="container-app flex flex-col items-center gap-1.5 py-6 text-center">
        <div className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded bg-[var(--color-ink)] text-[9px] font-black text-[var(--color-paper)]">ST</span>
          <p className="text-xs font-bold text-[var(--color-ink)]">StudentHub</p>
        </div>
        <p className="text-[11px] text-[var(--color-faint)]">© {new Date().getFullYear()} StudentHub — a student technical community</p>
      </div>
    </footer>
  );
}
