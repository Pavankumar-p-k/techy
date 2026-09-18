import { z } from "zod";
import { slugify } from "./utils";

const freeTypeSchema = z.enum(["free_forever", "freemium", "trial", "open_source", "student_plan"]);

function parseHttpUrl(value: string): URL | null {
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function normalizeUrl(value: string): string | null {
  const parsed = parseHttpUrl(value);
  if (!parsed) {
    return null;
  }

  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();

  if ((parsed.protocol === "https:" && parsed.port === "443") || (parsed.protocol === "http:" && parsed.port === "80")) {
    parsed.port = "";
  }

  const normalizedPath = parsed.pathname.replace(/\/+$/, "");
  const path = normalizedPath === "" || normalizedPath === "/" ? "" : normalizedPath;
  parsed.searchParams.sort();
  const search = parsed.search;

  return `${parsed.protocol}//${parsed.host}${path}${search}`;
}

export function slugCandidateFromName(name: string): string {
  const candidate = slugify(name);
  return candidate || "tool";
}

export function parseTagsInput(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

const toolTagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Each tag must be at least 2 characters.")
  .max(24, "Each tag must be at most 24 characters.")
  .regex(/^[a-z0-9-]+$/, "Tags can only include letters, numbers, and hyphens.");

export const toolSubmissionInputSchema = z.object({
  name: z.string().trim().min(2, "Tool name is required.").max(80, "Tool name is too long."),
  url: z
    .string()
    .trim()
    .refine((value) => Boolean(parseHttpUrl(value)), "Enter a valid http(s) URL."),
  category: z.string().trim().min(2, "Category is required.").max(40, "Category is too long."),
  shortDescription: z
    .string()
    .trim()
    .min(16, "Short description should be at least 16 characters.")
    .max(240, "Short description should be under 240 characters."),
  howItWorks: z
    .string()
    .trim()
    .min(24, "How it works should be at least 24 characters.")
    .max(4000, "How it works should be under 4000 characters."),
  freeType: freeTypeSchema,
  freeDetails: z.string().trim().min(8, "Free details are required.").max(400, "Free details are too long."),
  tags: z
    .array(toolTagSchema)
    .max(8, "Use up to 8 tags.")
    .transform((tags) => Array.from(new Set(tags))),
});

export const reviewInputSchema = z.object({
  rating: z.number().int().min(1, "Rating must be between 1 and 5.").max(5, "Rating must be between 1 and 5."),
  reviewText: z
    .string()
    .trim()
    .max(1200, "Review text should be under 1200 characters.")
    .transform((value) => value || null),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().max(80, "Full name should be under 80 characters.").transform((value) => value || null),
  bio: z.string().trim().max(600, "Bio should be under 600 characters.").transform((value) => value || null),
  avatarUrl: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || Boolean(parseHttpUrl(value)), "Avatar URL must be a valid http(s) URL.")
    .transform((value) => value || null),
});

export type ToolSubmissionInput = z.infer<typeof toolSubmissionInputSchema>;
export type ReviewInput = z.infer<typeof reviewInputSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// ============================================================
// Social community schemas
// ============================================================

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(24, "Username must be at most 24 characters.")
  .regex(/^[a-z0-9_]+$/, "Username can only include lowercase letters, numbers, and underscores.");

export const socialLinksSchema = z
  .object({
    github: z
      .string()
      .trim()
      .refine((v) => v.length === 0 || Boolean(parseHttpUrl(v)), "GitHub link must be a valid http(s) URL.")
      .transform((v) => v || null),
    linkedin: z
      .string()
      .trim()
      .refine((v) => v.length === 0 || Boolean(parseHttpUrl(v)), "LinkedIn link must be a valid http(s) URL.")
      .transform((v) => v || null),
    instagram: z
      .string()
      .trim()
      .refine((v) => v.length === 0 || Boolean(parseHttpUrl(v)), "Instagram link must be a valid http(s) URL.")
      .transform((v) => v || null),
    portfolio: z
      .string()
      .trim()
      .refine((v) => v.length === 0 || Boolean(parseHttpUrl(v)), "Portfolio link must be a valid http(s) URL.")
      .transform((v) => v || null),
    youtube: z
      .string()
      .trim()
      .refine((v) => v.length === 0 || Boolean(parseHttpUrl(v)), "YouTube link must be a valid http(s) URL.")
      .transform((v) => v || null),
    x: z
      .string()
      .trim()
      .refine((v) => v.length === 0 || Boolean(parseHttpUrl(v)), "X link must be a valid http(s) URL.")
      .transform((v) => v || null),
    other: z
      .string()
      .trim()
      .refine((v) => v.length === 0 || Boolean(parseHttpUrl(v)), "Custom link must be a valid http(s) URL.")
      .transform((v) => v || null),
  })
  .partial({ github: true, linkedin: true });

export const communityProfileSchema = profileUpdateSchema.extend({
  username: usernameSchema,
  branch: z.string().trim().max(60, "Branch is too long.").transform((v) => v || null),
  year: z.string().trim().max(20, "Year is too long.").transform((v) => v || null),
  college: z.string().trim().max(120, "College name is too long.").transform((v) => v || null),
  skills: z.array(z.string().trim().min(1).max(30)).max(15, "Up to 15 skills."),
  toolsUsed: z.array(z.string().trim().min(1).max(30)).max(15, "Up to 15 tools."),
  interests: z.array(z.string().trim().min(1).max(30)).max(10, "Up to 10 interests."),
  currentlyBuilding: z.string().trim().max(280).transform((v) => v || null),
  lookingFor: z.string().trim().max(280).transform((v) => v || null),
  links: socialLinksSchema,
});

export const postTypeSchema = z.enum([
  "normal",
  "project",
  "achievement",
  "course_completion",
  "learning_update",
  "project_update",
]);

export const postInputSchema = z.object({
  postType: postTypeSchema,
  title: z.string().trim().max(120, "Title should be under 120 characters.").transform((v) => v || null),
  content: z.string().trim().min(1, "Write something first.").max(3000, "Post should be under 3000 characters."),
  imageUrl: z
    .string()
    .trim()
    .refine((v) => v.length === 0 || Boolean(parseHttpUrl(v)), "Image URL must be a valid http(s) URL.")
    .transform((v) => v || null),
  tags: z
    .array(z.string().trim().toLowerCase().min(1).max(24))
    .max(8, "Up to 8 tags.")
    .transform((tags) => Array.from(new Set(tags))),
  projectId: z.string().uuid().nullable().optional(),
});

export const commentInputSchema = z.object({
  content: z.string().trim().min(1, "Comment cannot be empty.").max(1000, "Comment should be under 1000 characters."),
});

export const projectInputSchema = z.object({
  title: z.string().trim().min(2, "Project title is required.").max(120, "Title should be under 120 characters."),
  description: z.string().trim().min(16, "Description should be at least 16 characters.").max(6000, "Description is too long."),
  category: z.string().trim().min(2).max(40),
  status: z.enum(["planning", "building", "completed", "maintaining", "archived"]),
  coverUrl: z
    .string()
    .trim()
    .refine((v) => v.length === 0 || Boolean(parseHttpUrl(v)), "Cover image must be a valid http(s) URL.")
    .transform((v) => v || null),
  demoUrl: z
    .string()
    .trim()
    .refine((v) => v.length === 0 || Boolean(parseHttpUrl(v)), "Demo link must be a valid http(s) URL.")
    .transform((v) => v || null),
  githubUrl: z
    .string()
    .trim()
    .refine((v) => v.length === 0 || Boolean(parseHttpUrl(v)), "GitHub link must be a valid http(s) URL.")
    .transform((v) => v || null),
  otherUrl: z
    .string()
    .trim()
    .refine((v) => v.length === 0 || Boolean(parseHttpUrl(v)), "Link must be a valid http(s) URL.")
    .transform((v) => v || null),
  technologies: z.array(z.string().trim().min(1).max(30)).max(12, "Up to 12 technologies."),
  toolsUsed: z.array(z.string().trim().min(1).max(30)).max(12, "Up to 12 tools."),
});

export const feedbackInputSchema = z.object({
  feedbackType: z.enum(["bug", "suggestion", "question", "improvement"]),
  content: z.string().trim().min(4, "Feedback should be at least 4 characters.").max(2000, "Feedback is too long."),
});

export const messageInputSchema = z.object({
  content: z.string().trim().min(1, "Message cannot be empty.").max(4000, "Message is too long."),
});

export type CommunityProfileInput = z.infer<typeof communityProfileSchema>;
export type PostInput = z.infer<typeof postInputSchema>;
export type CommentInput = z.infer<typeof commentInputSchema>;
export type ProjectInput = z.infer<typeof projectInputSchema>;
export type FeedbackInput = z.infer<typeof feedbackInputSchema>;
export type MessageInput = z.infer<typeof messageInputSchema>;
