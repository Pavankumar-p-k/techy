"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { ImageCropper } from "@/components/settings/ImageCropper";
import { useAuthUser } from "@/hooks/useAuthUser";
import { POST_TYPE_LABELS } from "@/lib/social-utils";
import { postInputSchema } from "@/lib/validation";
import type { PostType } from "@/lib/types";

const TYPE_OPTIONS: { value: PostType; label: string }[] = [
  { value: "normal", label: "Post" },
  { value: "achievement", label: "Achievement" },
  { value: "course_completion", label: "Course Completed" },
  { value: "learning_update", label: "Learning Update" },
];

export function CreatePostClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, supabase } = useAuthUser();

  const requestedType = searchParams.get("type") as PostType | null;
  const initialType = requestedType && TYPE_OPTIONS.some((option) => option.value === requestedType) ? requestedType : "normal";

  const [postType, setPostType] = useState<PostType>(initialType);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage("Image must be under 20MB.");
      return;
    }
    setMessage(null);
    setPendingCropFile(file);
  }

  async function handleCroppedImage(blob: Blob) {
    if (!user) {
      return;
    }

    setUploadingImage(true);
    setPendingCropFile(null);

    const filePath = `${user.id}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("community-media")
      .upload(filePath, blob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/jpeg",
      });

    if (uploadError) {
      setMessage("Image upload failed. Try again or paste an image link instead.");
      setUploadingImage(false);
      return;
    }

    const { data } = supabase.storage.from("community-media").getPublicUrl(filePath);
    setImageUrl(data.publicUrl);
    setUploadingImage(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const parsed = postInputSchema.safeParse({
      postType,
      title,
      content,
      imageUrl,
      tags: tagsInput
        .split(",")
        .map((tag) => tag.trim().replace(/^#/, "").toLowerCase())
        .filter(Boolean),
    });

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Please check your input.");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      post_type: parsed.data.postType,
      title: parsed.data.title,
      content: parsed.data.content,
      image_url: parsed.data.imageUrl,
      tags: parsed.data.tags,
    });

    if (error) {
      setMessage(error.message);
      setSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-0">
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-0">
        <div className="card p-8 text-center">
          <h1 className="section-title text-2xl font-black tracking-tight">Login required</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">You need an account to post.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/login?next=/create/post" className="btn btn-primary btn-md">
              Login
            </Link>
            <Link href="/register" className="btn btn-ghost btn-md">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const needsTitle = postType !== "normal";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-0">
      <div className="card p-5 sm:p-6">
        <h1 className="section-title text-2xl font-black tracking-tight">Create Post</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Share what you&apos;re learning or building.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Type selector */}
          <div>
            <p className="label">Post type</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPostType(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    postType === option.value
                      ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
                      : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {needsTitle ? (
            <label className="label">
              {POST_TYPE_LABELS[postType]} title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={postType === "achievement" ? "Won 2nd place at Smart India Hackathon" : "Python for Everybody"}
                className="field"
                maxLength={120}
              />
            </label>
          ) : null}

          <label className="label">
            Content
            <textarea
              required
              rows={5}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Finally completed my Python course. #Python #Learning"
              className="field"
              maxLength={3000}
            />
          </label>

          {/* Image attach — upload (with crop) or paste link */}
          <div>
            <p className="label">Image (optional)</p>
            {imageUrl ? (
              <div className="relative mt-1.5 overflow-hidden rounded-xl border border-[var(--color-line)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="max-h-64 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  aria-label="Remove image"
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
                className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-line)] py-6 text-sm font-semibold text-[var(--color-muted)] transition hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
              >
                {uploadingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4" />
                    Upload course screenshot, certificate, or photo
                  </>
                )}
              </button>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelected}
              className="hidden"
            />
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] font-semibold text-[var(--color-faint)] hover:text-[var(--color-ink)]">
                or paste an image link
              </summary>
              <input
                type="url"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://... image URL"
                className="field mt-1.5"
              />
            </details>
          </div>

          <label className="label">
            Tags (comma separated)
            <input
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="python, learning, ai"
              className="field"
            />
          </label>

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={submitting || uploadingImage} className="btn btn-accent btn-lg">
              {submitting ? "Publishing..." : "Publish"}
            </button>
            {message ? (
              <p className={`text-sm ${isSuccess ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{message}</p>
            ) : null}
          </div>
        </form>
      </div>

      {/* Instagram-style crop modal for the attached image */}
      {pendingCropFile ? (
        <ImageCropper
          file={pendingCropFile}
          title="Crop post image"
          onCancel={() => setPendingCropFile(null)}
          onCropped={handleCroppedImage}
        />
      ) : null}
    </div>
  );
}
