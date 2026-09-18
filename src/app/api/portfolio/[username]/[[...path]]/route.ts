import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";

export const dynamic = "force-dynamic";

// Service-role client — used ONLY to read private storage objects.
// The service key never reaches the browser.
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MIME_TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  txt: "text/plain; charset=utf-8",
  pdf: "application/pdf",
};

// Same safety rules as the DB's is_safe_zip_path()
function isSafePath(path: string): boolean {
  return (
    !path.startsWith("/") &&
    !/(^|\/)\.\.($|\/)/.test(path) &&
    !path.includes("\\") &&
    !/(^|\/)\.[^/.]/.test(path) &&
    /^[A-Za-z0-9][A-Za-z0-9 _\-.\/]*$/.test(path) &&
    path.length <= 200
  );
}

interface PortfolioConfig {
  storage_path: string | null;
  owner_id: string;
}

async function getPortfolioConfig(
  username: string
): Promise<PortfolioConfig | null> {
  const { data } = await serviceClient
    .from("profiles")
    .select("id, portfolio_enabled, portfolio_type, portfolio_storage_path")
    .eq("username", username.toLowerCase())
    .eq("portfolio_enabled", true)
    .eq("portfolio_type", "zip")
    .maybeSingle();

  if (!data) {
    return null;
  }

  return { storage_path: data.portfolio_storage_path, owner_id: data.id };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string; path?: string[] }> }
) {
  try {
    const { username, path } = await context.params;
    const requestedPath = (path ?? []).join("/") || "index.html";

    if (!isSafePath(requestedPath)) {
      return new NextResponse("Invalid path", { status: 400 });
    }

    const config = await getPortfolioConfig(username.toLowerCase());

    if (!config || !config.storage_path) {
      return new NextResponse("Portfolio not found", { status: 404 });
    }

    // Download the ZIP (cache per-request; could be optimized later)
    const { data: zipBlob, error: downloadError } = await serviceClient.storage
      .from("portfolios")
      .download(config.storage_path);

    if (downloadError || !zipBlob) {
      return new NextResponse("Portfolio file unavailable", { status: 404 });
    }

    const zip = await JSZip.loadAsync(await zipBlob.arrayBuffer());

    // Find the entry — try exact, then inside a single root folder
    let entry = zip.file(requestedPath);
    if (!entry) {
      const rootPrefix = findRootPrefix(zip);
      entry = zip.file(`${rootPrefix}${requestedPath}`);
    }

    if (!entry) {
      return new NextResponse("File not found in portfolio", { status: 404 });
    }

    // Defense-in-depth: validate the resolved entry path too
    const resolvedName = entry.name;
    if (!isSafePath(resolvedName.replace(/^[^/]+\//, ""))) {
      return new NextResponse("Invalid archive entry", { status: 400 });
    }

    const content = await entry.async("uint8array");
    const extension = requestedPath.split(".").pop()?.toLowerCase() ?? "";
    const mimeType = MIME_TYPES[extension] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(content), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Server error", { status: 500 });
  }
}

function findRootPrefix(zip: JSZip): string {
  const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
  if (names.length === 0) {
    return "";
  }

  const firstSegment = names[0].split("/")[0];
  const allShareRoot =
    names.every((name) => name.startsWith(`${firstSegment}/`)) &&
    firstSegment !== "index.html";

  return allShareRoot ? `${firstSegment}/` : "";
}
