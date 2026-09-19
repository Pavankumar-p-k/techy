/* eslint-disable react-hooks/set-state-in-effect -- data-loading effects */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useFollow } from "@/hooks/useFollow";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";

interface FollowListClientProps {
  username: string;
  mode: "followers" | "following";
}

interface FollowRow {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  branch: string | null;
}

/**
 * Instagram-style followers / following list page.
 * Shows each student with a live Follow/Following toggle.
 */
export function FollowListClient({ username, mode }: FollowListClientProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user } = useAuthUser();

  const [rows, setRows] = useState<FollowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownerProfileId, setOwnerProfileId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (!active) return;

      if (!profile) {
        setError("Student not found.");
        setLoading(false);
        return;
      }
      setOwnerProfileId(profile.id);

      // followers  = people who follow this profile  -> rows where following_id = profile, embed follower's profile
      // following  = people this profile follows     -> rows where follower_id = profile, embed following's profile
      const selectColumns =
        mode === "followers"
          ? "profiles!follows_follower_id_fkey(id, username, full_name, avatar_url, branch)"
          : "profiles!follows_following_id_fkey(id, username, full_name, avatar_url, branch)";

      const { data, error: fetchError } = await supabase
        .from("follows")
        .select(selectColumns)
        .eq(mode === "followers" ? "following_id" : "follower_id", profile.id)
        .limit(200);

      if (!active) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const list = ((data ?? []) as unknown as { profiles: FollowRow | null }[])
        .map((row) => row.profiles)
        .filter((p): p is FollowRow => Boolean(p?.id));

      setRows(list);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [supabase, username, mode]);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <Link href={`/u/${username}`} className="text-sm font-bold text-[var(--color-ink)] hover:underline">
        ← @{username}
      </Link>

      <h1 className="section-title mt-3 text-2xl font-black tracking-tight capitalize">
        {mode === "followers" ? "Followers" : "Following"}
      </h1>

      {loading ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="card mt-5 p-6 text-center text-sm text-[var(--color-muted)]">{error}</div>
      ) : rows.length === 0 ? (
        <div className="card mt-5 p-8 text-center">
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {mode === "followers" ? "No followers yet." : "Not following anyone yet."}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Discover students and start connecting.</p>
          <Link href="/explore?tab=students" className="btn btn-primary btn-md mt-4">
            Explore Students
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {rows.map((row) => (
            <FollowRowItem key={row.id} row={row} viewerId={user?.id ?? null} ownerProfileId={ownerProfileId} mode={mode} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FollowRowItem({
  row,
  viewerId,
  ownerProfileId,
  mode,
}: {
  row: FollowRow;
  viewerId: string | null;
  ownerProfileId: string | null;
  mode: "followers" | "following";
}) {
  const isSelf = viewerId === row.id;

  // On another user's followers page, the relationship that matters is
  // between the VIEWER and the listed person (so Follow works naturally,
  // like Instagram). Reuse the standard follow hook.
  const { isFollowing, isToggling, toggle } = useFollow(viewerId && !isSelf ? row.id : null);

  return (
    <li className="card flex items-center gap-3 p-3">
      <Link href={`/u/${row.username ?? ""}`} className="flex min-w-0 flex-1 items-center gap-3">
        {row.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-ink)] text-xs font-black text-[var(--color-paper)]">
            {getInitials(row.full_name || "U")}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--color-ink)]">{row.full_name || "Student"}</p>
          <p className="truncate text-xs text-[var(--color-faint)]">
            @{row.username ?? "unset"}
            {row.branch ? ` • ${row.branch}` : ""}
          </p>
        </div>
      </Link>
      {!isSelf && viewerId ? (
        <button
          type="button"
          onClick={toggle}
          disabled={isToggling}
          className={`btn btn-sm shrink-0 ${isFollowing ? "btn-ghost" : "btn-primary"}`}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      ) : null}
    </li>
  );
}
