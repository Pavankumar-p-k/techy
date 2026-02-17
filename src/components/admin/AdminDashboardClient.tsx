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
    return <p className="mx-auto w-full max-w-6xl px-4 py-10 text-sm text-[var(--color-muted)] md:px-6">Checking access...</p>;
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
        <section className="premium-panel rounded-2xl p-6">
          <h1 className="section-title text-3xl font-black">Admin Page</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Login with your account first, then admin access is verified from your profile role.</p>
          <Link href="/login?next=/admin" className="mt-4 inline-flex rounded-full bg-[var(--color-ink)] px-5 py-2 text-sm font-semibold text-[var(--color-paper)]">
            Login to Continue
          </Link>
        </section>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
        <section className="premium-panel rounded-2xl p-6">
          <h1 className="section-title text-3xl font-black">Admin Access Required</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Your current account is logged in, but role is not admin.</p>
          <p className="mt-3 text-sm text-[var(--color-muted)]">Promote this account in Supabase SQL editor with:</p>
          <code className="mt-2 block rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-ink)]">
            select public.set_admin_by_email(&apos;{user.email}&apos;);
          </code>
          <p className="mt-3 text-xs text-[var(--color-muted)]">After promotion, sign out and login again, then open /admin.</p>
        </section>
      </div>
    );
  }

  if (isLoading) {
    return <p className="mx-auto w-full max-w-6xl px-4 py-10 text-sm text-[var(--color-muted)] md:px-6">Loading admin dashboard...</p>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="section-title text-3xl font-black">Admin Control Center</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Moderation, tool lifecycle control, and resource management in one place.</p>
        </div>
        <button
          type="button"
          onClick={refreshData}
          disabled={isRefreshing}
          className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-60"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {message ? <p className="premium-panel mt-4 rounded-xl p-3 text-sm text-[var(--color-muted)]">{message}</p> : null}

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Pending submissions" value={metrics.pendingSubmissions.toString()} />
        <StatCard label="Pending tools" value={metrics.pendingTools.toString()} />
        <StatCard label="Published tools" value={metrics.publishedTools.toString()} />
        <StatCard label="Rejected tools" value={metrics.rejectedTools.toString()} />
        <StatCard label="Total tools loaded" value={metrics.totalTools.toString()} />
        <StatCard label="Platform resources" value={metrics.resourceCount.toString()} />
      </section>

      <section className="mt-6 flex flex-wrap gap-2">
        <TabButton label="Moderation Queue" active={activeTab === "moderation"} onClick={() => setActiveTab("moderation")} />
        <TabButton label="Tool Manager" active={activeTab === "tools"} onClick={() => setActiveTab("tools")} />
        <TabButton label="Resources Manager" active={activeTab === "resources"} onClick={() => setActiveTab("resources")} />
      </section>

      {activeTab === "moderation" ? (
        <section className="mt-6 space-y-8">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-ink)]">Pending submissions</h2>
            <div className="mt-4 space-y-4">
              {submissions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-muted)]">No pending submissions.</p>
              ) : (
                submissions.map((item) => (
                  <article key={item.id} className="premium-panel rounded-2xl p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
                          {item.category} | {FREE_TYPE_LABELS[item.free_type]}
                        </p>
                        <h3 className="text-lg font-bold text-[var(--color-ink)]">{item.name}</h3>
                      </div>
                      <p className="text-xs text-[var(--color-muted)]">{formatDate(item.created_at)}</p>
                    </div>

                    <p className="mt-2 text-sm text-[var(--color-muted)]">{item.short_description}</p>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">{item.how_it_works}</p>
                    <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-[var(--color-accent)]">
                      {item.url}
                    </a>

                    <textarea
                      rows={2}
                      placeholder="Moderation note"
                      value={noteById[item.id] ?? ""}
                      onChange={(event) => setNoteById((current) => ({ ...current, [item.id]: event.target.value }))}
                      className="mt-3 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
                    />

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => approveSubmission(item.id)}
                        className="rounded-full bg-[var(--color-success)] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Approve + Publish
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectSubmission(item.id)}
                        className="rounded-full bg-[var(--color-danger)] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[var(--color-ink)]">Direct pending tools</h2>
            <div className="mt-4 space-y-4">
              {pendingTools.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-muted)]">No pending tools.</p>
              ) : (
                pendingTools.map((item) => (
                  <article key={item.id} className="premium-panel rounded-2xl p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-bold text-[var(--color-ink)]">{item.name}</h3>
                      <StatusPill status={item.status} />
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{item.short_description}</p>
                    <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-[var(--color-accent)]">
                      {item.url}
                    </a>

                    <textarea
                      rows={2}
                      placeholder="Moderation note"
                      value={noteById[item.id] ?? ""}
                      onChange={(event) => setNoteById((current) => ({ ...current, [item.id]: event.target.value }))}
                      className="mt-3 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateToolStatus(item.id, "published")}
                        className="rounded-full bg-[var(--color-success)] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Publish
                      </button>
                      <button
                        type="button"
                        onClick={() => updateToolStatus(item.id, "rejected")}
                        className="rounded-full bg-[var(--color-danger)] px-4 py-2 text-sm font-semibold text-white"
                      >
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
          <div className="premium-panel rounded-2xl p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <label className="text-sm text-[var(--color-muted)]">
                Search tools
                <input
                  value={toolSearch}
                  onChange={(event) => setToolSearch(event.target.value)}
                  placeholder="Search by name, category, or slug"
                  className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-[var(--color-muted)]">
                Status filter
                <select
                  value={toolStatusFilter}
                  onChange={(event) => setToolStatusFilter(event.target.value as ToolStatusFilter)}
                  className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
                >
                  <option value="all">All</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="published">Published</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
            </div>
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Showing {filteredTools.length} of {allTools.length} tools loaded.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {filteredTools.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-muted)]">No tools match this filter.</p>
            ) : (
              filteredTools.map((tool) => (
                <article key={tool.id} className="premium-panel rounded-2xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
                        {tool.category} | updated {formatDate(tool.updated_at)}
                      </p>
                      <h3 className="text-base font-bold text-[var(--color-ink)]">{tool.name}</h3>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">{tool.slug}</p>
                    </div>
                    <StatusPill status={tool.status} />
                  </div>

                  <p className="mt-2 text-sm text-[var(--color-muted)]">{tool.short_description}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--color-muted)]">
                    <span>Rating {tool.avg_rating.toFixed(1)}</span>
                    <span>Reviews {tool.review_count}</span>
                    <span>Clicks {tool.click_count}</span>
                    <span>{tool.is_verified ? "Verified" : "Not verified"}</span>
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Internal moderation note"
                    value={noteById[tool.id] ?? tool.moderation_notes ?? ""}
                    onChange={(event) => setNoteById((current) => ({ ...current, [tool.id]: event.target.value }))}
                    className="mt-3 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateToolStatus(tool.id, "pending")}
                      className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)]"
                    >
                      Mark Pending
                    </button>
                    <button
                      type="button"
                      onClick={() => updateToolStatus(tool.id, "published")}
                      className="rounded-full bg-[var(--color-success)] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Publish
                    </button>
                    <button
                      type="button"
                      onClick={() => updateToolStatus(tool.id, "rejected")}
                      className="rounded-full bg-[var(--color-danger)] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleToolVerification(tool.id, !tool.is_verified)}
                      className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)]"
                    >
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
        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <form onSubmit={createResource} className="premium-panel rounded-2xl p-4">
            <h2 className="text-lg font-bold text-[var(--color-ink)]">Add Platform Resource</h2>
            <div className="mt-3 space-y-3">
              <label className="block text-sm text-[var(--color-muted)]">
                Name
                <input
                  value={resourceForm.name}
                  onChange={(event) => setResourceForm((current) => ({ ...current, name: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-[var(--color-muted)]">
                URL
                <input
                  value={resourceForm.url}
                  onChange={(event) => setResourceForm((current) => ({ ...current, url: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-[var(--color-muted)]">
                Category
                <input
                  value={resourceForm.category}
                  onChange={(event) => setResourceForm((current) => ({ ...current, category: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-[var(--color-muted)]">
                Short Description
                <textarea
                  rows={3}
                  value={resourceForm.shortDescription}
                  onChange={(event) => setResourceForm((current) => ({ ...current, shortDescription: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-[var(--color-muted)]">
                Free Details
                <textarea
                  rows={2}
                  value={resourceForm.freeDetails}
                  onChange={(event) => setResourceForm((current) => ({ ...current, freeDetails: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={isSavingResource}
              className="mt-4 rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-[var(--color-paper)] disabled:opacity-60"
            >
              {isSavingResource ? "Saving..." : "Add Resource"}
            </button>
          </form>

          <section className="premium-panel rounded-2xl p-4">
            <h2 className="text-lg font-bold text-[var(--color-ink)]">Manage Resources</h2>
            <div className="mt-3 space-y-3">
              {resources.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)]">No resources available.</p>
              ) : (
                resources.map((resource) => (
                  <article key={resource.id} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{resource.category}</p>
                        <p className="text-sm font-semibold text-[var(--color-ink)]">{resource.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteResource(resource.id)}
                        className="rounded-full border border-[var(--color-line)] px-3 py-1 text-xs font-semibold text-[var(--color-danger)]"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">{resource.short_description}</p>
                    <a href={resource.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[var(--color-accent)]">
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
    <div className="premium-panel rounded-xl p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs font-semibold transition sm:text-sm ${
        active
          ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
          : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
      }`}
    >
      {label}
    </button>
  );
}

function StatusPill({ status }: { status: ToolStatus }) {
  const statusClass =
    status === "published"
      ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
      : status === "pending"
        ? "bg-[var(--color-surface-2)] text-[var(--color-muted)]"
        : status === "rejected"
          ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
          : "bg-[var(--color-surface-2)] text-[var(--color-muted)]";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClass}`}>{status}</span>;
}
