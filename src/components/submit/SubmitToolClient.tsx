"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { TOOL_CATEGORIES, FREE_TYPE_LABELS } from "@/lib/constants";
import type { Database, FreeType } from "@/lib/types";
import { normalizeUrl, parseTagsInput, slugCandidateFromName, toolSubmissionInputSchema } from "@/lib/validation";

const FREE_TYPES: FreeType[] = ["free_forever", "freemium", "trial", "open_source", "student_plan"];
type ExistingTool = Pick<Database["public"]["Tables"]["tools"]["Row"], "name" | "slug" | "status" | "url">;
type ExistingSubmission = Pick<Database["public"]["Tables"]["tool_submissions"]["Row"], "name" | "status" | "url">;

export function SubmitToolClient() {
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const parsedTags = parseTagsInput(tagsInput);
    const validation = toolSubmissionInputSchema.safeParse({
      name,
      url,
      category,
      shortDescription,
      howItWorks,
      freeType,
      freeDetails,
      tags: parsedTags,
    });

    if (!validation.success) {
      setMessage(validation.error.issues[0]?.message ?? "Please check your input and try again.");
      setSubmitting(false);
      return;
    }

    const normalizedIncomingUrl = normalizeUrl(validation.data.url);
    const incomingSlug = slugCandidateFromName(validation.data.name);

    const [toolsRes, ownSubmissionsRes] = await Promise.all([
      supabase.from("tools").select("name,slug,url,status").in("status", ["published", "pending", "draft"]).limit(500),
      supabase
        .from("tool_submissions")
        .select("name,url,status")
        .eq("submitted_by", user.id)
        .in("status", ["pending", "approved"])
        .limit(200),
    ]);

    if (toolsRes.error || ownSubmissionsRes.error) {
      setMessage(toolsRes.error?.message ?? ownSubmissionsRes.error?.message ?? "Failed to validate duplicates.");
      setSubmitting(false);
      return;
    }

    const existingTools = (toolsRes.data ?? []) as ExistingTool[];
    const ownSubmissions = (ownSubmissionsRes.data ?? []) as ExistingSubmission[];

    const duplicateToolByUrl = normalizedIncomingUrl
      ? existingTools.find((item) => {
          const normalized = normalizeUrl(item.url);
          return normalized && normalized === normalizedIncomingUrl;
        })
      : null;

    const duplicateToolBySlug = existingTools.find((item) => item.slug === incomingSlug);

    const ownSubmissionByUrl = normalizedIncomingUrl
      ? ownSubmissions.find((item) => {
          const normalized = normalizeUrl(item.url);
          return normalized && normalized === normalizedIncomingUrl;
        })
      : null;

    const ownSubmissionBySlug = ownSubmissions.find((item) => slugCandidateFromName(item.name) === incomingSlug);

    const duplicateTool = duplicateToolByUrl ?? duplicateToolBySlug;
    const duplicateSubmission = ownSubmissionByUrl ?? ownSubmissionBySlug;

    if (duplicateTool) {
      const duplicateReason = duplicateToolByUrl ? "A tool with this website is already listed" : "A tool with a very similar name already exists";
      const followUp =
        duplicateTool.status === "published"
          ? `Open it here: /tools/${duplicateTool.slug}`
          : "It already exists in the moderation pipeline.";
      setMessage(`${duplicateReason}: "${duplicateTool.name}". ${followUp}`);
      setSubmitting(false);
      return;
    }

    if (duplicateSubmission) {
      setMessage(`You already submitted "${duplicateSubmission.name}" (${duplicateSubmission.status}). Edit or wait for review.`);
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("tool_submissions").insert({
      submitted_by: user.id,
      name: validation.data.name,
      url: validation.data.url,
      category: validation.data.category,
      short_description: validation.data.shortDescription,
      how_it_works: validation.data.howItWorks,
      free_type: validation.data.freeType,
      free_details: validation.data.freeDetails,
      tags: validation.data.tags,
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

  if (loading) {
    return <p className="mx-auto w-full max-w-3xl px-4 py-10 text-sm text-[var(--color-muted)] md:px-6">Loading...</p>;
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6">
        <section className="premium-panel rounded-2xl p-6">
          <h1 className="section-title text-2xl font-black">Login Required</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">You need an account to submit tools.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/login?next=/submit" className="rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-[var(--color-paper)]">
              Login
            </Link>
            <Link href="/register" className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]">
              Create Account
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 md:py-10">
      <section className="premium-panel rounded-2xl p-6">
        <h1 className="section-title text-2xl font-black">Submit a New Tool</h1>
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
