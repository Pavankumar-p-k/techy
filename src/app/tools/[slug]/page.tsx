import { ToolDetailClient } from "@/components/tools/ToolDetailClient";

interface ToolPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  return <ToolDetailClient slug={slug} />;
}
