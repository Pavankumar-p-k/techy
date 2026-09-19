"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";

interface LoginClientProps {
  nextPath: string;
}

export function LoginClient({ nextPath }: LoginClientProps) {
  const router = useRouter();
  const { supabase, user } = useAuthUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setNeedsConfirmation(false);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setMessage(error.message);
      setNeedsConfirmation(/confirm|not verified/i.test(error.message));
    } else {
      router.replace(nextPath);
    }

    setIsSubmitting(false);
  }

  async function resendConfirmation() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage("Enter your email address first.");
      return;
    }

    setIsResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
      },
    });
    setMessage(error ? error.message : "A new confirmation email has been sent. Check your inbox and spam folder.");
    setIsResending(false);
  }

  return (
    <div className="container-app flex justify-center py-10 md:py-16">
      <div className="card w-full max-w-md p-6 sm:p-8 fade-in-up">
        <h1 className="section-title text-2xl font-black tracking-tight">Login</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {user ? "You are already signed in." : "Access your student tool profile."}
        </p>

        {user ? (
          <div className="mt-5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
            <p className="text-sm text-[var(--color-muted)]">Signed in as {user.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={nextPath} className="btn btn-primary btn-sm">
                Continue
              </Link>
              <Link href="/profile" className="btn btn-ghost btn-sm">
                Open Profile
              </Link>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="label">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setNeedsConfirmation(false);
              }}
              className="field"
            />
          </label>

          <label className="label">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field"
            />
          </label>

          <button type="submit" disabled={isSubmitting || isResending} className="btn btn-primary btn-lg w-full">
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
        </form>

        {message ? (
          <p className="mt-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">
            {message}
          </p>
        ) : null}

        {needsConfirmation ? (
          <button
            type="button"
            onClick={resendConfirmation}
            disabled={isResending}
            className="mt-3 w-full text-sm font-semibold text-[var(--color-ink)] underline underline-offset-4 disabled:opacity-60"
          >
            {isResending ? "Sending confirmation email..." : "Resend confirmation email"}
          </button>
        ) : null}

        <p className="mt-5 text-sm text-[var(--color-muted)]">
          New user?{" "}
          <Link href="/register" className="font-semibold text-[var(--color-ink)] underline underline-offset-4">
            Create account
          </Link>
        </p>

        <div className="mt-6 rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
          <p className="overline">Admin login</p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
            Login with your normal account, then ensure your profile role is promoted to admin in Supabase. After that, open{" "}
            <code className="rounded bg-[var(--color-surface-3)] px-1 py-0.5 font-mono text-[11px]">/admin</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
