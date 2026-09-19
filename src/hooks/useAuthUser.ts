/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const profileColumns = [
  "id",
  "full_name",
  "avatar_url",
  "bio",
  "role",
  "username",
  "branch",
  "year",
  "college",
  "skills",
  "tools_used",
  "interests",
  "currently_building",
  "looking_for",
  "link_github",
  "link_linkedin",
  "link_instagram",
  "link_portfolio",
  "link_youtube",
  "link_x",
  "link_other",
  "show_links",
  "portfolio_enabled",
  "portfolio_type",
  "portfolio_html",
  "portfolio_storage_path",
  "portfolio_external_url",
  "portfolio_updated_at",
  "created_at",
  "updated_at",
].join(", ");

export function useAuthUser() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    setLoading(true);

    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    setUser(currentUser);

    // Do not use select("*"): the production RLS hardening intentionally
    // withholds profiles.email from browser clients.
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(profileColumns)
      .eq("id", currentUser.id)
      .single();

    if (profileError) {
      console.error("Failed to load user profile:", profileError.message);
      setProfile(null);
    } else {
      setProfile(profileData);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUser, supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [supabase]);

  return {
    supabase,
    user,
    profile,
    loading,
    signOut,
    refresh: loadUser,
  };
}
