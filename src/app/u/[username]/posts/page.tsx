import type { Metadata } from "next";
import { UserContentClient } from "@/components/social/UserContentClient";

interface UserPostsPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: UserPostsPageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} — Posts · StudentHub` };
}

export default async function UserPostsPage({ params }: UserPostsPageProps) {
  const { username } = await params;
  return <UserContentClient username={username} mode="posts" />;
}
