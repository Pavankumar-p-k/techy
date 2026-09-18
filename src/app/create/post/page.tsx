import { Suspense } from "react";
import { CreatePostClient } from "@/components/social/CreatePostClient";

export default function CreatePostPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-2xl px-4 py-10"><div className="skeleton h-64 w-full" /></div>}>
      <CreatePostClient />
    </Suspense>
  );
}
