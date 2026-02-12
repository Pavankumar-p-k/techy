"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { TOOL_CATEGORIES, FREE_TYPE_LABELS } from "@/lib/constants";
import type { FreeType } from "@/lib/types";

const FREE_TYPES: FreeType[] = ["free_forever", "freemium", "trial", "open_source", "student_plan"];

export function SubmitToolClient() {
  const router = useRouter();
  const { supabase, user, loading } = useAuthUser();

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<string>(TOOL_CATEGORIES[0]);
  const [shortDescription, setShortDescription] = useState("");
  const [howItWorks, setHowItWorks] = useState("");
  const [freeType, setFreeType] = useState<FreeType>("free_forever");
  const [freeDetails, setFreeDetails] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?next=/submit");
    }
  }, [loading, router, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 8);

    const { error } = await supabase.from("tool_submissions").insert({
      submitted_by: user.id,
      name: name.trim(),
      url: url.trim(),
      category,
      short_description: shortDescription.trim(),
      how_it_works: howItWorks.trim(),
      free_type: freeType,
      free_details: freeDetails.trim(),
      tags,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setName("");
      setUrl("");
      setShortDescription("");
      setHowItWorks("");
      setFreeDetails("");
      setTagsInput("");
      setMessage("Submitted. Admin will review and publish.");
    }

    setSubmitting(false);
  }

  if (loading || !user) {
    return <p className="mx-auto w-full max-w-3xl px-4 py-10 text-sm text-[var(--color-muted)] md:px-6">Loading...</p>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 md:py-10">
      <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
        <h1 className="text-2xl font-black text-[var(--color-ink)]">Submit a New Tool</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Help other students discover useful free platforms.</p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="text-sm text-[var(--color-muted)]">
            Tool name
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2"
            />
          </label>

          <label className="text-sm text-[var(--color-muted)]">
            Official URL
            <input
              required
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-[var(--color-muted)]">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2"
              >
                {TOOL_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-[var(--color-muted)]">
              Free model
              <select
                value={freeType}
                onChange={(event) => setFreeType(event.target.value as FreeType)}
                className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2"
              >
                {FREE_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {FREE_TYPE_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="text-sm text-[var(--color-muted)]">
            Short description
            <textarea
              required
              rows={2}
              value={shortDescription}
              onChange={(event) => setShortDescription(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2"
            />
          </label>

          <label className="text-sm text-[var(--color-muted)]">
            How it works
            <textarea
              required
              rows={4}
              value={howItWorks}
              onChange={(event) => setHowItWorks(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2"
            />
          </label>

          <label className="text-sm text-[var(--color-muted)]">
            Free details
            <textarea
              required
              rows={3}
              value={freeDetails}
              onChange={(event) => setFreeDetails(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2"
            />
          </label>

          <label className="text-sm text-[var(--color-muted)]">
            Tags (comma separated)
            <input
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="coding, productivity, beginner"
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-fit rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit for Review"}
          </button>
        </form>

        {message ? <p className="mt-4 text-sm text-[var(--color-muted)]">{message}</p> : null}
      </section>
    </div>
  );
}
