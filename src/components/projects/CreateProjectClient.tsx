"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { PROJECT_CATEGORIES } from "@/lib/social-utils";
import { projectInputSchema } from "@/lib/validation";
import type { ProjectStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "planning", label: "Planning" },
  { value: "building", label: "Building" },
  { value: "completed", label: "Completed" },
  { value: "maintaining", label: "Maintaining" },
];

export function CreateProjectClient() {
  const router = useRouter();
  const { user, loading, supabase } = useAuthUser();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(PROJECT_CATEGORIES[0]);
  const [status, setStatus] = useState<ProjectStatus>("building");
  const [coverUrl, setCoverUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [technologiesInput, setTechnologiesInput] = useState("");
  const [toolsInput, setToolsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const tagsToArray = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const parsed = projectInputSchema.safeParse({
      title,
      description,
      category,
      status,
      coverUrl,
      demoUrl,
      githubUrl,
      otherUrl: "",
      technologies: tagsToArray(technologiesInput),
      toolsUsed: tagsToArray(toolsInput),
    });

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Please check your input.");
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        owner_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        status: parsed.data.status,
        cover_url: parsed.data.coverUrl,
        demo_url: parsed.data.demoUrl,
        github_url: parsed.data.githubUrl,
        technologies: parsed.data.technologies,
        tools_used: parsed.data.toolsUsed,
        review_status: "approved",
      })
      .select("id")
      .single();

    if (error) {
      setMessage(error.message);
      setSubmitting(false);
      return;
    }

    router.push(`/projects/${data.id}`);
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="card p-8 text-center">
          <h1 className="section-title text-2xl font-black tracking-tight">Login required</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">You need an account to showcase a project.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/login?next=/create/project" className="btn btn-primary btn-md">
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
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="card p-5 sm:p-6">
        <h1 className="section-title text-2xl font-black tracking-tight">Showcase a Project</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Publish your work so other students can discover, use, and give feedback.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="label">
            Project title
            <input required value={title} onChange={(event) => setTitle(event.target.value)} className="field" maxLength={120} />
          </label>

          <label className="label">
            Description
            <textarea
              required
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What does it do? What problem does it solve? What did you learn?"
              className="field"
              maxLength={6000}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="field">
                {PROJECT_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="label">
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)} className="field">
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">
              Live Deployment URL
              <input type="url" value={demoUrl} onChange={(event) => setDemoUrl(event.target.value)} placeholder="https://my-project.vercel.app" className="field" />
              <span className="mt-1 block text-[11px] font-normal text-[var(--color-faint)]">
                Deployed site (Vercel, Netlify, GitHub Pages...) — enables the TRY IT experience
              </span>
            </label>
            <label className="label">
              GitHub URL
              <input type="url" value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} placeholder="https://github.com/..." className="field" />
            </label>
          </div>

          <label className="label">
            Cover image URL (optional)
            <input type="url" value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="https://... screenshot" className="field" />
          </label>

          <label className="label">
            Technologies (comma separated)
            <input value={technologiesInput} onChange={(event) => setTechnologiesInput(event.target.value)} placeholder="Python, FastAPI, React, RAG" className="field" />
          </label>

          <label className="label">
            Tools used (comma separated)
            <input value={toolsInput} onChange={(event) => setToolsInput(event.target.value)} placeholder="VS Code, Docker, GitHub" className="field" />
          </label>

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={submitting} className="btn btn-accent btn-lg">
              {submitting ? "Publishing..." : "Publish Project"}
            </button>
            {message ? <p className="text-sm text-[var(--color-danger)]">{message}</p> : null}
          </div>
        </form>
      </div>
    </div>
  );
}
