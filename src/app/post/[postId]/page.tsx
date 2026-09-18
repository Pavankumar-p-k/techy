import { PostDetail } from "@/components/social/PostDetail";

interface PostPageProps {
  params: Promise<{ postId: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { postId } = await params;
  return <PostDetail postId={postId} />;
}
