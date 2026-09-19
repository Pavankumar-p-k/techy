import type { Metadata } from "next";
import { UserContentClient } from "@/components/social/UserContentClient";

interface UserProjectsPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: UserProjectsPageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} — Projects · StudentHub` };
}

export default async function UserProjectsPage({ params }: UserProjectsPageProps) {
  const { username } = await params;
  return <UserContentClient username={username} mode="projects" />;
}
