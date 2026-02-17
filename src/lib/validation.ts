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
