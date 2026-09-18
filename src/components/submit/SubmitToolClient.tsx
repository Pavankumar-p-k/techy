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
  const [isSuccess, setIsSuccess] = useState(false);

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
      setIsSuccess(false);
    } else {
      setName("");
      setUrl("");
      setShortDescription("");
      setHowItWorks("");
      setFreeDetails("");
      setTagsInput("");
      setIsSuccess(true);
      setMessage("Submitted. Admin will review and publish.");
    }

    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="container-app py-10">
        <div className="skeleton mx-auto h-8 w-48" />
        <div className="skeleton mx-auto mt-4 h-64 w-full max-w-3xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-app flex justify-center py-10 md:py-16">
        <div className="card w-full max-w-md p-6 text-center sm:p-8">
          <h1 className="section-title text-2xl font-black tracking-tight">Login Required</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">You need an account to submit tools.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/login?next=/submit" className="btn btn-primary btn-md">
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
    <div className="container-app max-w-3xl py-8 md:py-10">
      <div className="card p-6 sm:p-8 fade-in-up">
        <h1 className="section-title text-2xl font-black tracking-tight sm:text-3xl">Submit a New Tool</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Help other students discover useful free platforms.</p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="label">
            Tool name
            <input required value={name} onChange={(event) => setName(event.target.value)} className="field" />
          </label>

          <label className="label">
            Official URL
            <input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} className="field" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="field">
                {TOOL_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="label">
              Free model
              <select value={freeType} onChange={(event) => setFreeType(event.target.value as FreeType)} className="field">
                {FREE_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {FREE_TYPE_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="label">
            Short description
            <textarea required rows={2} value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} className="field" />
          </label>

          <label className="label">
            How it works
            <textarea required rows={4} value={howItWorks} onChange={(event) => setHowItWorks(event.target.value)} className="field" />
          </label>

          <label className="label">
            Free details
            <textarea required rows={3} value={freeDetails} onChange={(event) => setFreeDetails(event.target.value)} className="field" />
          </label>

          <label className="label">
            Tags (comma separated)
            <input
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="coding, productivity, beginner"
              className="field"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button type="submit" disabled={submitting} className="btn btn-accent btn-lg">
              {submitting ? "Submitting..." : "Submit for Review"}
            </button>
            {message ? (
              <p
                className={`rounded-xl px-3 py-2 text-sm ${
                  isSuccess
                    ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                    : "bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
                }`}
              >
                {message}
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
