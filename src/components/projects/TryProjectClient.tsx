/* eslint-disable react-hooks/set-state-in-effect -- loading/blocked state derives from iframe lifecycle events, not render data */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface TryProjectClientProps {
  projectId: string;
}

/**
 * TRY IT — loads the student's deployed project inside an isolated iframe.
 *
 * The deployment is untrusted external code: it is loaded directly in a
 * sandboxed iframe and never proxied, injected, or executed server-side.
 * Sites that refuse embedding (X-Frame-Options / CSP frame-ancestors) get a
 * clean fallback pointing at the real deployment — we never bypass headers.
 */
export function TryProjectClient({ projectId }: TryProjectClientProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "notfound" }
    | { kind: "nourl" }
    | { kind: "ready"; title: string; url: string }
  >({ kind: "loading" });
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [frameLoading, setFrameLoading] = useState(true);
  const [timeoutRef, setTimeoutRef] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from("projects")
        .select("title, demo_url")
        .eq("id", projectId)
        .maybeSingle();

      if (!active) return;

      if (!data) {
        setState({ kind: "notfound" });
        return;
      }
      if (!data.demo_url) {
        setState({ kind: "nourl" });
        return;
      }
      setState({ kind: "ready", title: data.title, url: data.demo_url });
    })();
    return () => {
      active = false;
    };
  }, [supabase, projectId]);

  // Heuristic: external sites that refuse embedding never fire iframe onLoad.
  useEffect(() => {
    if (state.kind !== "ready") return;
    setFrameLoading(true);
    setIframeBlocked(false);
    const timer = setTimeout(() => {
      setFrameLoading(false);
      setIframeBlocked(true);
    }, 5000);
    setTimeoutRef(timer);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    return () => {
      if (timeoutRef) clearTimeout(timeoutRef);
    };
  }, [timeoutRef]);

  if (state.kind === "loading") {
    return (
      <div className="container-app max-w-4xl py-16">
        <div className="skeleton mx-auto h-64 w-full" />
      </div>
    );
  }

  if (state.kind === "notfound") {
    return (
      <div className="container-app max-w-4xl py-10">
        <div className="card p-8 text-center">
          <p className="text-sm font-semibold text-[var(--color-ink)]">Project not found.</p>
          <Link href="/projects" className="btn btn-primary btn-md mt-4">
            Browse Projects
          </Link>
        </div>
      </div>
    );
  }

  if (state.kind === "nourl") {
    return (
      <div className="container-app max-w-4xl py-10">
        <div className="card p-8 text-center">
          <p className="text-sm font-semibold text-[var(--color-ink)]">This project doesn&apos;t have a live deployment yet.</p>
          <Link href={`/projects/${projectId}`} className="btn btn-ghost btn-md mt-4">
            ← Back to Project
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-[var(--color-surface)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-3">
        <Link href={`/projects/${projectId}`} className="text-sm font-bold text-[var(--color-ink)] hover:underline">
          ← Back to Project
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-black tracking-tight text-[var(--color-ink)]">{state.title}</p>
          <p className="truncate text-[11px] text-[var(--color-faint)]">{state.url}</p>
        </div>
        <a
          href={state.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm"
        >
          ↗ Open Full Site
        </a>
      </div>

      {/* Embedded deployment */}
      <div className="relative flex-1 overflow-hidden">
        {frameLoading ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="skeleton mx-auto h-10 w-40" />
              <p className="mt-3 text-sm text-[var(--color-muted)]">Loading live project...</p>
            </div>
          </div>
        ) : null}

        {iframeBlocked ? (
          <div className="absolute inset-0 grid place-items-center p-6">
            <div className="card max-w-md p-6 text-center">
              <Lock aria-hidden="true" className="mx-auto h-8 w-8 text-[var(--color-muted)]" />
              <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                This project doesn&apos;t allow embedded viewing.
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                You can still open the original deployment in a new tab.
              </p>
              <a
                href={state.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-md mt-4"
              >
                ↗ VISIT SITE
              </a>
            </div>
          </div>
        ) : null}

        <iframe
          title={`${state.title} — live deployment`}
          src={state.url}
          referrerPolicy="no-referrer"
          allow="fullscreen"
          className={`h-full w-full border-0 bg-white transition-opacity ${frameLoading || iframeBlocked ? "opacity-0" : "opacity-100"}`}
          onLoad={() => {
            if (timeoutRef) clearTimeout(timeoutRef);
            setFrameLoading(false);
          }}
          onError={() => {
            if (timeoutRef) clearTimeout(timeoutRef);
            setFrameLoading(false);
            setIframeBlocked(true);
          }}
        />
      </div>
    </div>
  );
}
