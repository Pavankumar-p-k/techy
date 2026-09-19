/* eslint-disable react-hooks/set-state-in-effect -- duplicate check on mount */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { RESOURCE_CATEGORIES } from "@/lib/constants";
import { normalizeUrl, resourceSubmissionInputSchema } from "@/lib/validation";
import type { Database } from "@/lib/types";

type ExistingSubmission = Pick<
  Database["public"]["Tables"]["tool_submissions"]["Row"],
  "name" | "status" | "url"
>;

/**
 * Students suggest learning resources (courses, docs, videos, career guides).
 * Stored in tool_submissions with resource_type = 'resource' so the existing
 * admin approve/reject flow publishes them into platform_resources unchanged.
 */
export function SubmitResourceClient() {
  const { supabase, user, loading } = useAuthUser();

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<string>(RESOURCE_CATEGORIES[0]);
  const [shortDescription, setShortDescription] = useState("");
  const [freeDetails, setFreeDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Warn if the same resource is already submitted by this student
  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("tool_submissions")
        .select("name, status, url")
        .eq("resource_type", "resource")
        .eq("submitted_by", user.id)
        .limit(100);
      if (data) {
        setExisting((data as unknown as ExistingSubmission[]) ?? []);
      }
    })();
  }, [supabase, user]);

  const [existing, setExisting] = useState<ExistingSubmission[]>([]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setMessage(null);

    const parsed = resourceSubmissionInputSchema.safeParse({
      name,
      url,
      category,
      shortDescription,
      freeDetails,
    });

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Please check your input.");
      setSubmitting(false);
      return;
    }

    // Duplicate warning (same URL already submitted by this user)
    const duplicate = existing.find(
      (item) => item.url === parsed.data.url || item.name.toLowerCase() === parsed.data.name.toLowerCase(),
    );
    if (duplicate) {
      setMessage(`You already submitted "${duplicate.name}" (${duplicate.status}).`);
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("tool_submissions").insert({
      submitted_by: user.id,
      name: parsed.data.name,
      url: parsed.data.url,
      category: parsed.data.category,
      short_description: parsed.data.shortDescription,
      how_it_works: "",
      free_type: "free_forever",
      free_details: parsed.data.freeDetails ?? "",
      tags: [],
    });

    if (error) {
      setMessage(error.message);
      setIsSuccess(false);
    } else {
      setMessage("Resource submitted for review. Thank you!");
      setIsSuccess(true);
      setName("");
      setUrl("");
      setShortDescription("");
      setFreeDetails("");
      setExisting([...existing, { name: parsed.data.name, status: "pending", url: parsed.data.url }]);
    }

    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="container-app max-w-2xl py-10">
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-app max-w-2xl py-10">
        <div className="card p-8 text-center">
          <h1 className="section-title text-2xl font-black tracking-tight">Login required</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">You need an account to submit a resource.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/login?next=/submit/resource" className="btn btn-primary btn-md">
              Login
            </Link>
            <Link href="/register" className="btn btn-ghost btn-md">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-app max-w-2xl py-8">
      <h1 className="section-title text-3xl font-black tracking-tight">Submit a Resource</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Share a course, documentation, video series, or career guide that helped you. An admin will review it before it appears for everyone.
      </p>

      <form onSubmit={handleSubmit} className="card mt-5 space-y-4 p-5">
        <label className="label">
          Resource name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="The Odin Project" className="field" maxLength={120} />
        </label>

        <label className="label">
          URL
          <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." className="field" />
        </label>

        <label className="label">
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="field">
            {RESOURCE_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="label">
          Short description
          <textarea
            rows={3}
            value={shortDescription}
            onChange={(event) => setShortDescription(event.target.value)}
            placeholder="What is it and why is it useful for students?"
            className="field"
            maxLength={280}
          />
        </label>

        <label className="label">
          Free details
          <input
            value={freeDetails}
            onChange={(event) => setFreeDetails(event.target.value)}
            placeholder="Completely free / Free tier / Student plan..."
            className="field"
            maxLength={200}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] pt-4">
          <button type="submit" disabled={submitting} className="btn btn-primary btn-lg">
            {submitting ? "Submitting..." : "Submit Resource"}
          </button>
          {message ? (
            <p className={`text-sm ${isSuccess ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{message}</p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
