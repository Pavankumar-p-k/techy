import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Server-side validation for external portfolio URLs.
 *
 * Checks (from the client these would hit CORS walls):
 *  1. URL is syntactically valid and HTTPS-only
 *  2. The site is reachable (HTTP status < 400, follows redirects)
 *  3. Whether the site allows iframe embedding, detected from
 *     X-Frame-Options / Content-Security-Policy frame-ancestors.
 *
 * We NEVER bypass these headers — the result only drives the checklist
 * UI and the renderer's "Open externally" fallback.
 */

const FETCH_TIMEOUT_MS = 8000;

interface ValidationResult {
  urlValid: boolean;
  https: boolean;
  reachable: boolean;
  /** "allowed" | "blocked" | "unknown" — unknown = headers absent/unparseable */
  embedding: "allowed" | "blocked" | "unknown";
  httpStatus: number | null;
  finalUrl: string | null;
  message: string;
}

function fail(message: string, status: number): NextResponse {
  return NextResponse.json(
    {
      urlValid: false,
      https: false,
      reachable: false,
      embedding: "unknown",
      httpStatus: null,
      finalUrl: null,
      message,
    } satisfies ValidationResult,
    { status }
  );
}

function checkEmbedding(headers: Headers): "allowed" | "blocked" | "unknown" {
  const xfo = headers.get("x-frame-options");
  if (xfo) {
    const value = xfo.trim().toLowerCase();
    if (value === "deny" || value === "sameorigin") {
      return "blocked";
    }
  }

  const csp = headers.get("content-security-policy");
  if (csp) {
    const match = /frame-ancestors\s+([^;]+)/i.exec(csp);
    if (match) {
      // Wildcard allows anyone; anything else (none, 'self', origin lists)
      // excludes embedding from our origin.
      return match[1].includes("*") ? "allowed" : "blocked";
    }
    // CSP present but no frame-ancestors directive → embedding not restricted by CSP
  }

  return xfo || csp ? "allowed" : "unknown";
}

export async function POST(request: Request): Promise<NextResponse> {
  let rawUrl = "";

  try {
    const body = (await request.json()) as { url?: string };
    rawUrl = (body.url ?? "").trim();
  } catch {
    return fail("Invalid request body.", 400);
  }

  // 1. URL validity + HTTPS
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return fail("Enter a valid URL.", 200);
  }

  if (parsed.protocol !== "https:") {
    return fail("URL must use HTTPS (https://).", 200);
  }

  // 2 + 3. Reachability and embedding headers
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsed.toString(), {
      method: "GET", // some hosts reject HEAD
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "StudentHubPortfolioValidator/1.0" },
    });

    const reachable = response.status < 400;
    const embedding = checkEmbedding(response.headers);

    let message: string;
    if (!reachable) {
      message = `Website responded with ${response.status}. Check that the deployment is public.`;
    } else if (embedding === "blocked") {
      message = "Website is reachable but blocks embedding — visitors will get an 'Open Portfolio' button.";
    } else if (embedding === "unknown") {
      message = "Website is reachable. Embedding support could not be confirmed — it will be tested live.";
    } else {
      message = "Website is reachable and allows embedding.";
    }

    return NextResponse.json({
      urlValid: true,
      https: true,
      reachable,
      embedding,
      httpStatus: response.status,
      finalUrl: response.url || parsed.toString(),
      message,
    } satisfies ValidationResult);
  } catch {
    return NextResponse.json({
      urlValid: true,
      https: true,
      reachable: false,
      embedding: "unknown",
      httpStatus: null,
      finalUrl: null,
      message: "Could not reach the website (timeout, DNS failure, or network error).",
    } satisfies ValidationResult);
  } finally {
    clearTimeout(timeout);
  }
}
