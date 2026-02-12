"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";

interface LoginClientProps {
  nextPath: string;
}

export function LoginClient({ nextPath }: LoginClientProps) {
  const router = useRouter();
  const { supabase, user, loading } = useAuthUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.push(nextPath);
    }
  }, [loading, nextPath, router, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      router.push(nextPath);
    }

    setIsSubmitting(false);
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 md:px-6">
      <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
        <h1 className="text-2xl font-black text-[var(--color-ink)]">Login</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Access your student tool profile.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm text-[var(--color-muted)]">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2"
            />
          </label>

          <label className="block text-sm text-[var(--color-muted)]">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-[var(--color-ink)] px-5 py-2 text-sm font-semibold text-[var(--color-paper)] transition hover:bg-[var(--color-accent)] disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
        </form>

        {message ? <p className="mt-4 text-sm text-[var(--color-danger)]">{message}</p> : null}

        <p className="mt-4 text-sm text-[var(--color-muted)]">
          New user?{" "}
          <Link href="/register" className="font-semibold text-[var(--color-accent)]">
            Create account
          </Link>
        </p>
      </section>
    </div>
  );
}
