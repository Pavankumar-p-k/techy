import { TryProjectClient } from "@/components/projects/TryProjectClient";

interface TryProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function TryProjectPage({ params }: TryProjectPageProps) {
  const { projectId } = await params;
  return <TryProjectClient projectId={projectId} />;
}
