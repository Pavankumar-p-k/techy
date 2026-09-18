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

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email: email.trim(),
        full_name: fullName.trim() || null,
        username: email.trim().split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20) + Math.floor(Math.random() * 90 + 10),
      });
    }

    setMessage("Registration successful. Check your email if confirmation is enabled, then login.");
    setIsSubmitting(false);
    setTimeout(() => router.push("/login"), 1200);
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
