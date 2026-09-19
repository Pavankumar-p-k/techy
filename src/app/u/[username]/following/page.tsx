import type { Metadata } from "next";
import { FollowListClient } from "@/components/social/FollowListClient";

interface FollowingPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: FollowingPageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} — Following · StudentHub` };
}

export default async function FollowingPage({ params }: FollowingPageProps) {
  const { username } = await params;
  return <FollowListClient username={username} mode="following" />;
}
