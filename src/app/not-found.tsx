import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-app flex flex-col items-center py-20 text-center md:py-28">
      <p className="overline">404</p>
      <h1 className="section-title mt-2 text-4xl font-black tracking-tight sm:text-5xl">Page not found</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-[var(--color-muted)] sm:text-base">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/" className="btn btn-primary btn-lg mt-8">
        Back to Home
      </Link>
    </div>
  );
}
