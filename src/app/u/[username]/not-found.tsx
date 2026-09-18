import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <div className="container-app flex flex-col items-center py-20 text-center">
      <p className="overline">404</p>
      <h1 className="section-title mt-2 text-3xl font-black tracking-tight">Student not found</h1>
      <p className="mt-3 max-w-md text-sm text-[var(--color-muted)]">
        This profile does not exist yet. The student may not have finished setting up their account.
      </p>
      <Link href="/explore" className="btn btn-primary btn-md mt-6">
        Explore Students
      </Link>
    </div>
  );
}
