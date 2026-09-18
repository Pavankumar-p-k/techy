"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PortfolioRenderer, type PortfolioSource } from "@/components/portfolio/PortfolioRenderer";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type PortfolioType = "html" | "zip" | "external";

const MAX_ZIP_BYTES = 10 * 1024 * 1024; // 10 MB

function isSafeZipPath(path: string): boolean {
  return (
    !path.startsWith("/") &&
    !/(^|\/)\.\.($|\/)/.test(path) &&
    !path.includes("\\") &&
    !/(^|\/)\.[^/.]/.test(path) &&
    /^[A-Za-z0-9][A-Za-z0-9 _\-.\/]*$/.test(path) &&
    path.length <= 200
  );
}

export function PortfolioSettings({ username }: { username: string }) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { profile, user, refresh } = useAuthUser();

  const [enabled, setEnabled] = useState(profile?.portfolio_enabled ?? false);
  const [portfolioType, setPortfolioType] = useState<PortfolioType>(profile?.portfolio_type ?? "html");
  const [html, setHtml] = useState(profile?.portfolio_html ?? "");
  const [externalUrl, setExternalUrl] = useState(profile?.portfolio_external_url ?? "");
  const [zipPath, setZipPath] = useState(profile?.portfolio_storage_path ?? "");
  const [zipFileName, setZipFileName] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Unsaved draft state used for preview + save
  const draftSource: PortfolioSource | null = useMemo(() => {
    if (portfolioType === "html" && html.trim()) {
      return { kind: "html", html };
    }
    if (portfolioType === "zip" && zipPath) {
      return { kind: "zip", username };
    }
    if (portfolioType === "external" && externalUrl.trim()) {
      return { kind: "external", url: externalUrl.trim() };
    }
    return null;
  }, [portfolioType, html, zipPath, externalUrl, username]);

  function validateExternalUrl(value: string): string | null {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "URL must start with http:// or https://";
      }
      return null;
    } catch {
      return "Enter a valid URL.";
    }
  }

  async function handleZipUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) {
      return;
    }

    setMessage(null);

    // Size validation
    if (file.size > MAX_ZIP_BYTES) {
      setMessage("ZIP must be under 10 MB.");
      return;
    }

    // Type validation
    const isZip = file.name.toLowerCase().endsWith(".zip") || file.type === "application/zip";
    if (!isZip) {
      setMessage("Only .zip files are accepted.");
      return;
    }

    setUploading(true);

    try {
      // Structural validation BEFORE upload: must contain index.html and no unsafe entries
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const entryNames = Object.keys(zip.files).filter((name) => !zip.files[name].dir);

      if (entryNames.length === 0) {
        setMessage("The ZIP archive is empty.");
        setUploading(false);
        return;
      }

      // Path traversal / unsafe filename check
      for (const name of entryNames) {
        const relative = name.replace(/^[^/]+\//, "");
        if (!isSafeZipPath(name.replace(/^[^/]+/, name.includes("/") ? name : name)) ||
            !isSafeZipPath(name) && !name.includes("/")) {
          setMessage(`Unsafe file in archive: ${name}`);
          setUploading(false);
          return;
        }
        if (!isSafeZipPath(relative)) {
          setMessage(`Unsafe file path in archive: ${name}`);
          setUploading(false);
          return;
        }
      }

      // Required index.html (at root or single root folder)
      const hasRootIndex = zip.file("index.html") || entryNames.some((name) => name === "index.html");
      const rootPrefix = entryNames[0].split("/")[0];
      const allShareRoot = entryNames.every((name) => name.startsWith(`${rootPrefix}/`));
      const hasIndex = hasRootIndex || (allShareRoot && Boolean(zip.file(`${rootPrefix}/index.html`)));

      if (!hasIndex) {
        setMessage("Archive must contain index.html at the root (or inside a single top-level folder).");
        setUploading(false);
        return;
      }

      // Reject obviously executable types
      const blockedExtensions = [".exe", ".bat", ".sh", ".cmd", ".msi", ".dll", ".php"];
      const hasBlocked = entryNames.some((name) =>
        blockedExtensions.some((ext) => name.toLowerCase().endsWith(ext))
      );
      if (hasBlocked) {
        setMessage("Archive contains executable files, which are not allowed.");
        setUploading(false);
        return;
      }

      // Upload to private bucket under user's own folder
      const filePath = `${user.id}/portfolio-${Date.now()}.zip`;
      const { error: uploadError } = await supabase.storage
        .from("portfolios")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: "application/zip",
        });

      if (uploadError) {
        setMessage("Upload failed. The 'portfolios' storage bucket is required (run the migration).");
        setUploading(false);
        return;
      }

      // Clean up previous portfolio file
      if (zipPath && zipPath !== filePath) {
        await supabase.storage.from("portfolios").remove([zipPath]);
      }

      setZipPath(filePath);
      setZipFileName(file.name);
      setMessage(`ZIP validated and uploaded: ${file.name}. Press Save to apply.`);
      setIsSuccess(true);
    } catch {
      setMessage("Could not read the ZIP file. It may be corrupted or password-protected.");
    }

    setUploading(false);
  }

  async function handleSave(enableAfterSave: boolean) {
    if (!user) {
      return;
    }

    setMessage(null);

    // Validation per type
    if (enableAfterSave) {
      if (portfolioType === "html" && !html.trim()) {
        setMessage("Paste your portfolio HTML first.");
        return;
      }
      if (portfolioType === "zip" && !zipPath) {
        setMessage("Upload a portfolio ZIP first.");
        return;
      }
      if (portfolioType === "external") {
        const urlError = validateExternalUrl(externalUrl);
        if (urlError) {
          setMessage(urlError);
          return;
        }
      }
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        portfolio_enabled: enableAfterSave,
        portfolio_type: enableAfterSave ? portfolioType : null,
        portfolio_html: portfolioType === "html" ? html : null,
        portfolio_storage_path: portfolioType === "zip" ? zipPath : null,
        portfolio_external_url: portfolioType === "external" ? externalUrl.trim() : null,
        portfolio_updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    await refresh();
    setSaving(false);
    setIsSuccess(true);
    setMessage(
      enableAfterSave
        ? "Portfolio saved and enabled. Your profile now shows your live portfolio."
        : "Portfolio disabled. Your profile shows the normal social profile."
    );
    if (username) {
      router.refresh();
    }
  }

  // ===== Preview mode uses the same sandboxed renderer as the public profile =====
  if (isPreviewing && draftSource) {
    return (
      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--color-line)] px-4 py-2.5">
          <button type="button" onClick={() => setIsPreviewing(false)} className="text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]">
            ← Back to settings
          </button>
          <span className="ml-auto chip">Preview — exactly what visitors see</span>
        </div>
        <PortfolioRenderer source={draftSource} ownerName={profile?.full_name || username || "You"} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="card p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--color-ink)]"
          />
          <span>
            <span className="block text-sm font-bold text-[var(--color-ink)]">
              Show my portfolio when someone opens my profile
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-[var(--color-muted)]">
              When enabled, /u/{username || "your-username"} renders your live portfolio immediately instead of the social profile.
              Your posts, projects, and followers stay accessible via the &quot;Social Profile&quot; link.
            </span>
          </span>
        </label>
      </div>

      {/* Source selection */}
      <div className="card p-4">
        <p className="overline">Portfolio source</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {(
            [
              { value: "html" as PortfolioType, label: "Paste HTML", hint: "Standalone HTML" },
              { value: "zip" as PortfolioType, label: "Upload ZIP", hint: "Multi-file site" },
              { value: "external" as PortfolioType, label: "External URL", hint: "Existing site" },
            ]
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPortfolioType(option.value)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                portfolioType === option.value
                  ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
                  : "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-line-strong)]"
              }`}
            >
              <span className="block text-sm font-bold">{option.label}</span>
              <span className={`mt-0.5 block text-xs ${portfolioType === option.value ? "text-[var(--color-paper)]/70" : "text-[var(--color-faint)]"}`}>
                {option.hint}
              </span>
            </button>
          ))}
        </div>

        {/* HTML editor */}
        {portfolioType === "html" ? (
          <div className="mt-4">
            <label className="label">
              Portfolio HTML
              <textarea
                rows={10}
                value={html}
                onChange={(event) => setHtml(event.target.value)}
                placeholder={"<!DOCTYPE html>\n<html>\n  <head><style>...</style></head>\n  <body>\n    <h1>Hello, I'm a developer</h1>\n  </body>\n</html>"}
                className="field font-mono text-xs"
                spellCheck={false}
              />
            </label>
            <p className="mt-1 text-xs text-[var(--color-faint)]">
              Rendered in a sandboxed frame — your CSS and JavaScript run isolated from the platform.
            </p>
          </div>
        ) : null}

        {/* ZIP upload */}
        {portfolioType === "zip" ? (
          <div className="mt-4">
            <label className="label">
              Portfolio ZIP (max 10 MB)
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip"
                onChange={handleZipUpload}
                className="field file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-ink)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--color-paper)]"
              />
            </label>
            <ul className="mt-2 space-y-1 text-xs text-[var(--color-faint)]">
              <li>• Must contain index.html (root or single top-level folder)</li>
              <li>• CSS, JS, images, and fonts are served with correct types</li>
              <li>• Executables, dotfiles, and path traversal are rejected</li>
            </ul>
            {zipFileName ? (
              <p className="mt-2 chip">{zipFileName} ready</p>
            ) : zipPath ? (
              <p className="mt-2 chip">Existing portfolio ZIP uploaded</p>
            ) : null}
          </div>
        ) : null}

        {/* External URL */}
        {portfolioType === "external" ? (
          <div className="mt-4">
            <label className="label">
              Portfolio URL
              <input
                type="url"
                value={externalUrl}
                onChange={(event) => setExternalUrl(event.target.value)}
                placeholder="https://your-portfolio.vercel.app"
                className="field"
              />
            </label>
            <p className="mt-1 text-xs text-[var(--color-faint)]">
              If the site blocks embedding, visitors get a one-click &quot;Open Portfolio&quot; fallback.
            </p>
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="card flex flex-wrap items-center gap-2 p-4">
        <button
          type="button"
          onClick={() => setIsPreviewing(true)}
          disabled={!draftSource}
          className="btn btn-ghost btn-md"
        >
          Preview Portfolio
        </button>
        <button type="button" onClick={() => handleSave(enabled)} disabled={saving || uploading} className="btn btn-primary btn-md">
          {saving ? "Saving..." : "Save"}
        </button>
        {enabled ? (
          <button type="button" onClick={() => handleSave(false)} disabled={saving} className="btn btn-ghost btn-md">
            Disable Portfolio
          </button>
        ) : null}
        {message ? (
          <p className={`text-sm ${isSuccess ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{message}</p>
        ) : null}
      </div>

      {uploading ? <p className="text-sm text-[var(--color-muted)]">Validating and uploading ZIP...</p> : null}
    </div>
  );
}
