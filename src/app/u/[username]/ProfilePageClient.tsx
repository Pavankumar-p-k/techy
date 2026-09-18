"use client";

import { useEffect, useMemo, useState } from "react";
import { ProfileView } from "@/components/social/ProfileView";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SocialProfile } from "@/lib/types";

interface ProfilePageClientProps {
  username: string;
}

export function ProfilePageClient({ username }: ProfilePageClientProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", decodeURIComponent(username).toLowerCase())
        .maybeSingle();

      if (!mounted) {
        return;
      }

      if (error || !data) {
        setNotFound(true);
      } else {
        setProfile(data);
      }

      setIsLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [supabase, username]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-0">
        <div className="skeleton h-40 w-full" />
        <div className="skeleton mt-4 h-24 w-full" />
      </div>
    );
  }

  if (notFound || !profile) {
    throw new Response("Profile not found", { status: 404 });
  }

  return <ProfileView profile={profile} />;
}
