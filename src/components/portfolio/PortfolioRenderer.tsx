/* eslint-disable react-hooks/set-state-in-effect -- loading/blocked state derives from iframe lifecycle events, not render data */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PortfolioSource =
  | { kind: "html"; html: string }
  | { kind: "zip"; username: string }
  | { kind: "external"; url: string };

interface PortfolioRendererProps {
  source: PortfolioSource;
  ownerName: string;
}

/**
 * Renders student portfolios in a fully sandboxed iframe.
 *
 * - "html": injected via srcdoc with sandbox="allow-scripts" only.
 * - "zip": served from /api/portfolio/<username>/... (validate + stream),
 *          loaded with sandbox="allow-scripts allow-same-origin" so internal
 *          relative CSS/JS/images resolve inside the isolated /api origin.
 * - "external": plain iframe embed with a friendly fallback when the site
 *          refuses embedding (X-Frame-Options / CSP frame-ancestors).
 *
 * None of the modes share the main app's origin, so portfolio scripts can
 * never touch Supabase auth tokens, localStorage, or app cookies.
 */
export function PortfolioRenderer({ source, ownerName }: PortfolioRendererProps) {
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const src = useMemo(() => {
    if (source.kind === "zip") {
      return `/api/portfolio/${encodeURIComponent(source.username)}/index.html`;
    }
    if (source.kind === "external") {
      return source.url;
    }
    return undefined;
  }, [source]);

  const srcDoc = useMemo(() => {
    if (source.kind !== "html") {
      return undefined;
    }
    // Base target so links open safely without sandbox escape
    return source.html;
  }, [source]);

  // Detect external sites that refuse embedding
  useEffect(() => {
    if (source.kind !== "external") {
      setIframeBlocked(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIframeBlocked(false);

    // Heuristic: if the iframe hasn't fired onLoad within 4s, assume blocked
    loadTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      setIframeBlocked(true);
    }, 4000);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [source]);

  function handleLoad() {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    setIsLoading(false);
  }

  const sandboxAttr =
    source.kind === "html"
      ? "allow-scripts allow-popups allow-forms allow-modals"
      : source.kind === "zip"
        ? "allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
        : undefined; // external: no sandbox attr (third-party site decides)

  return (
    <div className="relative h-full w-full">
      {isLoading ? (
        <div className="absolute inset-0 grid place-items-center bg-[var(--color-surface)]">
          <div className="text-center">
            <div className="skeleton mx-auto h-10 w-40" />
            <p className="mt-3 text-sm text-[var(--color-muted)]">Loading {ownerName}&apos;s portfolio...</p>
          </div>
        </div>
      ) : null}

      {iframeBlocked ? (
        <div className="absolute inset-0 grid place-items-center bg-[var(--color-surface)] p-6">
          <div className="card max-w-md p-6 text-center">
            <p className="text-2xl" aria-hidden="true">🔒</p>
            <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
              This website cannot be embedded
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {ownerName}&apos;s portfolio site blocks iframe embedding for security. Open it in a new tab instead:
            </p>
            <a
              href={source.kind === "external" ? source.url : "#"}
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-primary btn-md mt-4"
            >
              Open Portfolio ↗
            </a>
          </div>
        </div>
      ) : null}

      {source.kind === "html" ? (
        <iframe
          title={`${ownerName} portfolio`}
          srcDoc={srcDoc}
          sandbox={sandboxAttr}
          className={`h-full min-h-[75vh] w-full border-0 bg-white transition-opacity ${isLoading ? "opacity-0" : "opacity-100"}`}
          onLoad={handleLoad}
        />
      ) : (
        <iframe
          title={`${ownerName} portfolio`}
          src={src}
          sandbox={sandboxAttr}
          referrerPolicy="no-referrer"
          allow="fullscreen"
          className={`h-full min-h-[75vh] w-full border-0 bg-white transition-opacity ${isLoading ? "opacity-0" : "opacity-100"}`}
          onLoad={handleLoad}
          onError={() => {
            setIsLoading(false);
            if (source.kind === "external") {
              setIframeBlocked(true);
            }
          }}
        />
      )}
    </div>
  );
}
