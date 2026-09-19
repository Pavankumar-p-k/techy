import type { Metadata } from "next";
import { FollowListClient } from "@/components/social/FollowListClient";

interface FollowersPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: FollowersPageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} — Followers · StudentHub` };
}

export default async function FollowersPage({ params }: FollowersPageProps) {
  const { username } = await params;
  return <FollowListClient username={username} mode="followers" />;
}
