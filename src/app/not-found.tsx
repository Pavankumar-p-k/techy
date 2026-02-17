import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center md:px-6">
      <p className="text-sm uppercase tracking-widest text-[var(--color-muted)]">404</p>
      <h1 className="section-title mt-2 text-4xl font-black">Page not found</h1>
      <p className="mt-3 text-sm text-[var(--color-muted)]">The page you requested does not exist.</p>
      <Link href="/" className="mt-6 rounded-full bg-[var(--color-ink)] px-5 py-2 text-sm font-semibold text-[var(--color-paper)]">
        Go Home
      </Link>
    </div>
  );
}
