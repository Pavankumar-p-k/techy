import type { FreeType } from "@/lib/types";

export const TOOL_CATEGORIES = [
  "Coding",
  "Writing",
  "Image Generation",
  "Video",
  "Research",
  "Design",
  "Productivity",
  "Math",
  "Resume",
  "Learning",
] as const;

export const RESOURCE_CATEGORIES = [
  "Courses",
  "Career",
  "Open Source",
  "Design",
  "Documentation",
  "Practice",
] as const;

export const FREE_TYPE_LABELS: Record<FreeType, string> = {
  free_forever: "Free Forever",
  freemium: "Freemium",
  trial: "Free Trial",
  open_source: "Open Source",
  student_plan: "Student Plan",
};

export const DEFAULT_ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";
