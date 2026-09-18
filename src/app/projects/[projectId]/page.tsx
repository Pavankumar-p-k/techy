import { ProjectDetailClient } from "@/components/projects/ProjectDetailClient";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  return <ProjectDetailClient projectId={projectId} />;
}
