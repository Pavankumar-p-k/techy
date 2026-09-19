"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";

export default function RegisterPage() {
  const router = useRouter();
  const { supabase } = useAuthUser();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFullName = fullName.trim();
    const emailRedirectTo = `${window.location.origin}/login?confirmed=1`;

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: normalizedFullName,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    if (!data.user) {
      setMessage("We could not create your account. Please try again.");
      setIsSubmitting(false);
      return;
    }

    // The database trigger creates the profile atomically when auth.users is inserted.
    // Do not upsert from the browser: with email confirmation enabled there is no
    // authenticated session yet, so that client-side write is rejected by RLS.
    if (data.session) {
      setMessage("Account created. You are now signed in.");
      setIsSubmitting(false);
      router.replace("/");
      return;
    }

    setMessage("Account created. Check your email and click the confirmation link before logging in.");
    setIsSubmitting(false);
  }

  return (
    <div className="container-app flex justify-center py-10 md:py-16">
      <div className="card w-full max-w-md p-6 sm:p-8 fade-in-up">
        <h1 className="section-title text-2xl font-black tracking-tight">Create Account</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Join and start saving and reviewing tools.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="label">
            Full name
            <input
              required
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="field"
            />
          </label>

          <label className="label">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field"
            />
          </label>

          <label className="label">
            Password
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field"
            />
            <span className="mt-1 block text-xs font-normal text-[var(--color-faint)]">At least 6 characters.</span>
          </label>

          <button type="submit" disabled={isSubmitting} className="btn btn-accent btn-lg w-full">
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        {message ? (
          <p className="mt-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-muted)]">
            {message}
          </p>
        ) : null}

        <p className="mt-5 text-sm text-[var(--color-muted)]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--color-ink)] underline underline-offset-4">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
