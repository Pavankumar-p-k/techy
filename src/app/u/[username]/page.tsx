import { ProfilePageClient } from "./ProfilePageClient";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  return <ProfilePageClient username={username} />;
}
