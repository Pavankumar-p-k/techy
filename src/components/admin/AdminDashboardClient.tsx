"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { FREE_TYPE_LABELS } from "@/lib/constants";
import type { Database } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Submission = Database["public"]["Tables"]["tool_submissions"]["Row"];
type Tool = Database["public"]["Tables"]["tools"]["Row"];
type Resource = Database["public"]["Tables"]["platform_resources"]["Row"];
type AdminTab = "moderation" | "tools" | "resources";
type ToolStatusFilter = "all" | "draft" | "pending" | "published" | "rejected";
type ToolStatus = Tool["status"];

interface ResourceFormState {
  name: string;
  url: string;
  category: string;
  shortDescription: string;
  freeDetails: string;
}

const INITIAL_RESOURCE_FORM: ResourceFormState = {
  name: "",
  url: "",
  category: "",
  shortDescription: "",
  freeDetails: "",
};

export function AdminDashboardClient() {
  const { supabase, user, profile, loading } = useAuthUser();

  const [activeTab, setActiveTab] = useState<AdminTab>("moderation");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pendingTools, setPendingTools] = useState<Tool[]>([]);
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [toolSearch, setToolSearch] = useState("");
  const [toolStatusFilter, setToolStatusFilter] = useState<ToolStatusFilter>("all");
  const [resourceForm, setResourceForm] = useState<ResourceFormState>(INITIAL_RESOURCE_FORM);
  const [isSavingResource, setIsSavingResource] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = profile?.role === "admin";

  const fetchAdminData = useCallback(async () => {
    const [submissionsRes, pendingToolsRes, allToolsRes, resourcesRes] = await Promise.all([
      supabase.from("tool_submissions").select("*").eq("status", "pending").order("created_at", { ascending: true }),
      supabase.from("tools").select("*").eq("status", "pending").order("created_at", { ascending: true }),
      supabase.from("tools").select("*").order("updated_at", { ascending: false }).limit(300),
      supabase.from("platform_resources").select("*").order("created_at", { ascending: false }),
    ]);

    return {
      submissions: submissionsRes.data ?? [],
      pendingTools: pendingToolsRes.data ?? [],
      allTools: allToolsRes.data ?? [],
      resources: resourcesRes.data ?? [],
    };
  }, [supabase]);

  const loadData = useCallback(
    async (showFullLoader: boolean) => {
      if (!user || !isAdmin) {
        return;
      }

      if (showFullLoader) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const data = await fetchAdminData();
      setSubmissions(data.submissions);
      setPendingTools(data.pendingTools);
      setAllTools(data.allTools);
      setResources(data.resources);

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [fetchAdminData, isAdmin, user]
  );

  useEffect(() => {
    let mounted = true;

    async function bootstrapData() {
      if (!user || !isAdmin) {
        return;
      }

      const data = await fetchAdminData();
      if (!mounted) {
        return;
      }

      setSubmissions(data.submissions);
      setPendingTools(data.pendingTools);
      setAllTools(data.allTools);
      setResources(data.resources);
      setIsLoading(false);
    }

    void bootstrapData();

    return () => {
      mounted = false;
    };
  }, [fetchAdminData, isAdmin, user]);

  const metrics = useMemo(() => {
    const published = allTools.filter((item) => item.status === "published").length;
    const rejected = allTools.filter((item) => item.status === "rejected").length;
    return {
      pendingSubmissions: submissions.length,
      pendingTools: pendingTools.length,
      publishedTools: published,
      rejectedTools: rejected,
      resourceCount: resources.length,
      totalTools: allTools.length,
    };
  }, [allTools, pendingTools.length, resources.length, submissions.length]);

  const filteredTools = useMemo(() => {
    return allTools.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
        item.category.toLowerCase().includes(toolSearch.toLowerCase()) ||
        item.slug.toLowerCase().includes(toolSearch.toLowerCase());
      const matchesStatus = toolStatusFilter === "all" || item.status === toolStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allTools, toolSearch, toolStatusFilter]);

  async function refreshData() {
    await loadData(false);
  }

  async function approveSubmission(id: string) {
    const note = noteById[id]?.trim() ?? "";
    const { error } = await supabase.rpc("approve_submission", {
      submission_id: id,
      moderation_comment: note || undefined,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Submission approved and published.");
    await refreshData();
  }

  async function rejectSubmission(id: string) {
    const note = noteById[id]?.trim() ?? "";
    const { error } = await supabase.rpc("reject_submission", {
      submission_id: id,
      moderation_comment: note || undefined,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Submission rejected.");
    await refreshData();
  }

  async function updateToolStatus(id: string, status: ToolStatus) {
    const note = noteById[id]?.trim() ?? null;
    const nextVerified = status === "published";

    const { error } = await supabase
      .from("tools")
      .update({ status, moderation_notes: note, is_verified: nextVerified })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`Tool status updated to ${status}.`);
    await refreshData();
  }

  async function toggleToolVerification(id: string, value: boolean) {
    const { error } = await supabase.from("tools").update({ is_verified: value }).eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(value ? "Tool marked as verified." : "Tool marked as unverified.");
    await refreshData();
  }

  async function createResource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!resourceForm.name.trim() || !resourceForm.url.trim() || !resourceForm.category.trim() || !resourceForm.shortDescription.trim() || !resourceForm.freeDetails.trim()) {
      setMessage("Fill all resource fields before adding.");
      return;
    }

    setIsSavingResource(true);

    const { error } = await supabase.from("platform_resources").insert({
      name: resourceForm.name.trim(),
      url: resourceForm.url.trim(),
      category: resourceForm.category.trim(),
      short_description: resourceForm.shortDescription.trim(),
      free_details: resourceForm.freeDetails.trim(),
    });

    setIsSavingResource(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setResourceForm(INITIAL_RESOURCE_FORM);
    setMessage("Resource added.");
    await refreshData();
  }

  async function deleteResource(id: string) {
    const { error } = await supabase.from("platform_resources").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Resource deleted.");
    await refreshData();
  }

  if (loading) {
    return (
      <div className="container-app py-10">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton mt-6 h-40 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-app flex justify-center py-10 md:py-16">
        <div className="card w-full max-w-md p-6 text-center sm:p-8">
          <h1 className="section-title text-2xl font-black tracking-tight">Admin Page</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Login with your account first, then admin access is verified from your profile role.</p>
          <Link href="/login?next=/admin" className="btn btn-primary btn-md mt-5">
            Login to Continue
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container-app flex justify-center py-10 md:py-16">
        <div className="card w-full max-w-lg p-6 text-center sm:p-8">
          <h1 className="section-title text-2xl font-black tracking-tight">Admin Access Required</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Your current account is logged in, but role is not admin.</p>
          <p className="mt-4 text-sm text-[var(--color-muted)]">Promote this account in Supabase SQL editor with:</p>
          <code className="mt-2 block overflow-x-auto rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-left font-mono text-xs text-[var(--color-ink)]">
            select public.set_admin_by_email(&apos;{user.email}&apos;);
          </code>
          <p className="mt-3 text-xs text-[var(--color-muted)]">After promotion, sign out and login again, then open /admin.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container-app py-10">
        <div className="skeleton h-8 w-64" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container-app py-8 md:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="section-title text-3xl font-black tracking-tight">Admin Control Center</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Moderation, tool lifecycle control, and resource management in one place.</p>
        </div>
        <button type="button" onClick={refreshData} disabled={isRefreshing} className="btn btn-ghost btn-md">
          {isRefreshing ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {message ? (
        <div className="card mt-4 flex items-center justify-between gap-3 p-3">
          <p className="text-sm text-[var(--color-muted)]">{message}</p>
          <button type="button" onClick={() => setMessage(null)} className="text-xs font-semibold text-[var(--color-faint)] hover:text-[var(--color-ink)]">
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Metrics */}
      <section className="stagger-fade mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Pending submissions" value={metrics.pendingSubmissions.toString()} />
        <StatCard label="Pending tools" value={metrics.pendingTools.toString()} />
        <StatCard label="Published tools" value={metrics.publishedTools.toString()} />
        <StatCard label="Rejected tools" value={metrics.rejectedTools.toString()} />
        <StatCard label="Total tools loaded" value={metrics.totalTools.toString()} />
        <StatCard label="Platform resources" value={metrics.resourceCount.toString()} />
      </section>

      {/* Tabs */}
      <section className="mt-6 overflow-x-auto pb-1">
        <div className="segmented">
          <button type="button" data-active={activeTab === "moderation"} onClick={() => setActiveTab("moderation")}>
            Moderation Queue
          </button>
          <button type="button" data-active={activeTab === "tools"} onClick={() => setActiveTab("tools")}>
            Tool Manager
          </button>
          <button type="button" data-active={activeTab === "resources"} onClick={() => setActiveTab("resources")}>
            Resources Manager
          </button>
        </div>
      </section>

      {activeTab === "moderation" ? (
        <section className="mt-6 space-y-8">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-ink)]">Pending submissions</h2>
            <div className="mt-4 space-y-3">
              {submissions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--color-line)] p-6 text-center text-sm text-[var(--color-muted)]">No pending submissions.</p>
              ) : (
                submissions.map((item) => (
                  <article key={item.id} className="card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="pill pill-accent">{item.category}</span>
                          <span className="pill pill-neutral">{FREE_TYPE_LABELS[item.free_type]}</span>
                        </div>
                        <h3 className="mt-2 text-lg font-bold text-[var(--color-ink)]">{item.name}</h3>
                      </div>
                      <p className="text-xs text-[var(--color-faint)]">{formatDate(item.created_at)}</p>
                    </div>

                    <p className="mt-2 text-sm text-[var(--color-muted)]">{item.short_description}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{item.how_it_works}</p>
                    <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-block break-all text-sm font-semibold text-[var(--color-ink)] underline underline-offset-4">
                      {item.url}
                    </a>

                    <textarea
                      rows={2}
                      placeholder="Moderation note (optional)"
                      value={noteById[item.id] ?? ""}
                      onChange={(event) => setNoteById((current) => ({ ...current, [item.id]: event.target.value }))}
                      className="field mt-3"
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => approveSubmission(item.id)} className="btn btn-success btn-md">
                        Approve + Publish
                      </button>
                      <button type="button" onClick={() => rejectSubmission(item.id)} className="btn btn-danger btn-md">
                        Reject
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[var(--color-ink)]">Direct pending tools</h2>
            <div className="mt-4 space-y-3">
              {pendingTools.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--color-line)] p-6 text-center text-sm text-[var(--color-muted)]">No pending tools.</p>
              ) : (
                pendingTools.map((item) => (
                  <article key={item.id} className="card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-bold text-[var(--color-ink)]">{item.name}</h3>
                      <StatusPill status={item.status} />
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{item.short_description}</p>
                    <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-block break-all text-sm font-semibold text-[var(--color-ink)] underline underline-offset-4">
                      {item.url}
                    </a>

                    <textarea
                      rows={2}
                      placeholder="Moderation note (optional)"
                      value={noteById[item.id] ?? ""}
                      onChange={(event) => setNoteById((current) => ({ ...current, [item.id]: event.target.value }))}
                      className="field mt-3"
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => updateToolStatus(item.id, "published")} className="btn btn-success btn-md">
                        Publish
                      </button>
                      <button type="button" onClick={() => updateToolStatus(item.id, "rejected")} className="btn btn-danger btn-md">
                        Reject
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "tools" ? (
        <section className="mt-6">
          <div className="card p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_200px]">
              <label className="label">
                Search tools
                <input
                  value={toolSearch}
                  onChange={(event) => setToolSearch(event.target.value)}
                  placeholder="Search by name, category, or slug"
                  className="field"
                />
              </label>
              <label className="label">
                Status filter
                <select
                  value={toolStatusFilter}
                  onChange={(event) => setToolStatusFilter(event.target.value as ToolStatusFilter)}
                  className="field"
                >
                  <option value="all">All</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="published">Published</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
            </div>
            <p className="mt-2 text-xs text-[var(--color-faint)]">
              Showing {filteredTools.length} of {allTools.length} tools loaded.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {filteredTools.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--color-line)] p-6 text-center text-sm text-[var(--color-muted)]">No tools match this filter.</p>
            ) : (
              filteredTools.map((tool) => (
                <article key={tool.id} className="card p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="overline">
                        {tool.category} · updated {formatDate(tool.updated_at)}
                      </p>
                      <h3 className="text-base font-bold text-[var(--color-ink)]">{tool.name}</h3>
                      <p className="mt-0.5 font-mono text-xs text-[var(--color-faint)]">{tool.slug}</p>
                    </div>
                    <StatusPill status={tool.status} />
                  </div>

                  <p className="mt-2 text-sm text-[var(--color-muted)]">{tool.short_description}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="chip">★ {tool.avg_rating.toFixed(1)}</span>
                    <span className="chip">{tool.review_count} reviews</span>
                    <span className="chip">{tool.click_count} clicks</span>
                    <span className={`chip ${tool.is_verified ? "text-[var(--color-success)]" : ""}`}>{tool.is_verified ? "Verified" : "Not verified"}</span>
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Internal moderation note"
                    value={noteById[tool.id] ?? tool.moderation_notes ?? ""}
                    onChange={(event) => setNoteById((current) => ({ ...current, [tool.id]: event.target.value }))}
                    className="field mt-3"
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => updateToolStatus(tool.id, "pending")} className="btn btn-ghost btn-sm">
                      Mark Pending
                    </button>
                    <button type="button" onClick={() => updateToolStatus(tool.id, "published")} className="btn btn-success btn-sm">
                      Publish
                    </button>
                    <button type="button" onClick={() => updateToolStatus(tool.id, "rejected")} className="btn btn-danger btn-sm">
                      Reject
                    </button>
                    <button type="button" onClick={() => toggleToolVerification(tool.id, !tool.is_verified)} className="btn btn-ghost btn-sm">
                      {tool.is_verified ? "Unverify" : "Verify"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "resources" ? (
        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <form onSubmit={createResource} className="card p-5">
            <h2 className="text-lg font-bold text-[var(--color-ink)]">Add Platform Resource</h2>
            <div className="mt-4 space-y-3">
              <label className="label">
                Name
                <input
                  value={resourceForm.name}
                  onChange={(event) => setResourceForm((current) => ({ ...current, name: event.target.value }))}
                  className="field"
                />
              </label>
              <label className="label">
                URL
                <input
                  value={resourceForm.url}
                  onChange={(event) => setResourceForm((current) => ({ ...current, url: event.target.value }))}
                  className="field"
                />
              </label>
              <label className="label">
                Category
                <input
                  value={resourceForm.category}
                  onChange={(event) => setResourceForm((current) => ({ ...current, category: event.target.value }))}
                  className="field"
                />
              </label>
              <label className="label">
                Short Description
                <textarea
                  rows={3}
                  value={resourceForm.shortDescription}
                  onChange={(event) => setResourceForm((current) => ({ ...current, shortDescription: event.target.value }))}
                  className="field"
                />
              </label>
              <label className="label">
                Free Details
                <textarea
                  rows={2}
                  value={resourceForm.freeDetails}
                  onChange={(event) => setResourceForm((current) => ({ ...current, freeDetails: event.target.value }))}
                  className="field"
                />
              </label>
            </div>
            <button type="submit" disabled={isSavingResource} className="btn btn-primary btn-md mt-4">
              {isSavingResource ? "Saving..." : "Add Resource"}
            </button>
          </form>

          <section className="card p-5">
            <h2 className="text-lg font-bold text-[var(--color-ink)]">Manage Resources</h2>
            <div className="mt-4 space-y-3">
              {resources.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--color-line)] p-6 text-center text-sm text-[var(--color-muted)]">No resources available.</p>
              ) : (
                resources.map((resource) => (
                  <article key={resource.id} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="overline">{resource.category}</p>
                        <p className="text-sm font-semibold text-[var(--color-ink)]">{resource.name}</p>
                      </div>
                      <button type="button" onClick={() => deleteResource(resource.id)} className="btn btn-ghost btn-sm text-[var(--color-danger)]">
                        Delete
                      </button>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">{resource.short_description}</p>
                    <a href={resource.url} target="_blank" rel="noreferrer" className="mt-2 inline-block break-all text-xs font-semibold text-[var(--color-ink)] underline underline-offset-4">
                      {resource.url}
                    </a>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="overline">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: ToolStatus }) {
  const statusClass =
    status === "published"
      ? "pill-success"
      : status === "pending"
        ? "pill-neutral"
        : status === "rejected"
          ? "pill-danger"
          : "pill-neutral";

  return <span className={`pill ${statusClass}`}>{status}</span>;
}
