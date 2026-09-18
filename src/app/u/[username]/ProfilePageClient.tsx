"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProfileView } from "@/components/social/ProfileView";
import { PortfolioRenderer, type PortfolioSource } from "@/components/portfolio/PortfolioRenderer";
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
  // Visitor can toggle from portfolio view to the social profile
  const [showSocialProfile, setShowSocialProfile] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setNotFound(false);
      setShowSocialProfile(false);

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

  function portfolioSource(profile: SocialProfile): PortfolioSource | null {
    if (!profile.portfolio_enabled) {
      return null;
    }
    if (profile.portfolio_type === "html" && profile.portfolio_html) {
      return { kind: "html", html: profile.portfolio_html };
    }
    if (profile.portfolio_type === "zip" && profile.portfolio_storage_path) {
      return { kind: "zip", username: profile.username! };
    }
    if (profile.portfolio_type === "external" && profile.portfolio_external_url) {
      return { kind: "external", url: profile.portfolio_external_url };
    }
    return null;
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-0">
        <div className="skeleton h-40 w-full" />
        <div className="skeleton mt-4 h-24 w-full" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="container-app flex flex-col items-center py-20 text-center">
        <p className="overline">404</p>
        <h1 className="section-title mt-2 text-3xl font-black tracking-tight">Student not found</h1>
        <Link href="/explore" className="btn btn-primary btn-md mt-6">
          Explore Students
        </Link>
      </div>
    );
  }

  const source = portfolioSource(profile);

  // ===== CASE 1: Portfolio configured → live portfolio IS the profile =====
  if (source && !showSocialProfile) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-[var(--color-paper)]" style={{ top: "3.5rem" }}>
        {/* Minimal bar: back + username + social profile link */}
        <div className="flex h-11 shrink-0 items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-overlay)] px-4 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="text-sm font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
          >
            ← Back
          </button>
          <span className="ml-auto text-xs font-bold text-[var(--color-muted)]">@{profile.username}</span>
          <button
            type="button"
            onClick={() => setShowSocialProfile(true)}
            className="text-xs font-semibold text-[var(--color-muted)] underline underline-offset-4 transition hover:text-[var(--color-ink)]"
          >
            Social Profile
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <PortfolioRenderer source={source} ownerName={profile.full_name || profile.username || "Student"} />
        </div>
      </div>
    );
  }

  // ===== CASE 2: Normal social profile =====
  return <ProfileView profile={profile} />;
}
