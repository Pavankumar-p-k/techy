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
      });
    }

    setMessage("Registration successful. Check your email if confirmation is enabled, then login.");
    setIsSubmitting(false);
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 md:px-6">
      <section className="premium-panel rounded-2xl p-6">
        <h1 className="section-title text-2xl font-black">Create Account</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Join and start saving/reviewing tools.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm text-[var(--color-muted)]">
            Full name
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2"
            />
          </label>

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
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        {message ? <p className="mt-4 text-sm text-[var(--color-muted)]">{message}</p> : null}

        <p className="mt-4 text-sm text-[var(--color-muted)]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--color-accent)]">
            Login
          </Link>
        </p>
      </section>
    </div>
  );
}
