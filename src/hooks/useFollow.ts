/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SocialProfile } from "@/lib/types";

export function useFollow(targetProfileId: string | null | undefined) {
  const supabase = getSupabaseBrowserClient();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function check() {
      if (!targetProfileId) {
        return;
      }

      const { data } = await supabase.rpc("is_following", { target_profile_id: targetProfileId });
      if (mounted) {
        setIsFollowing(Boolean(data));
      }
    }

    void check();

    return () => {
      mounted = false;
    };
  }, [supabase, targetProfileId]);

  const toggle = useCallback(async () => {
    if (!targetProfileId || isToggling) {
      return;
    }

    setIsToggling(true);
    setError(null);

    // Optimistic update
    const next = !isFollowing;
    setIsFollowing(next);

    const { error: rpcError } = await supabase.rpc(
      next ? "follow_user" : "unfollow_user",
      { target_profile_id: targetProfileId }
    );

    if (rpcError) {
      setIsFollowing(!next);
      setError(rpcError.message);
    }

    setIsToggling(false);
  }, [supabase, targetProfileId, isFollowing, isToggling]);

  return { isFollowing, isToggling, error, toggle };
}

export function useFollowCounts(profileId: string | null | undefined) {
  const supabase = getSupabaseBrowserClient();
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  const load = useCallback(async () => {
    if (!profileId) {
      return;
    }

    const [followersRes, followingRes] = await Promise.all([
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profileId),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", profileId),
    ]);

    setFollowers(followersRes.count ?? 0);
    setFollowing(followingRes.count ?? 0);
  }, [supabase, profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { followers, following, reload: load };
}

export async function fetchProfileByUsername(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  username: string
): Promise<SocialProfile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
  return data;
}

export async function fetchProfileById(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  id: string
): Promise<SocialProfile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return data;
}
