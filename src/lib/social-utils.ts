import type { FeedbackStatus, PostType, ProjectStatus } from "@/lib/types";

export function timeAgo(value: string): string {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const POST_TYPE_LABELS: Record<PostType, string> = {
  normal: "Post",
  project: "Project",
  achievement: "Achievement",
  course_completion: "Course Completed",
  learning_update: "Learning Update",
  project_update: "Project Update",
};

export const POST_TYPE_BADGES: Record<PostType, string> = {
  normal: "pill-neutral",
  project: "pill-accent",
  achievement: "pill-success",
  course_completion: "pill-success",
  learning_update: "pill-neutral",
  project_update: "pill-accent",
};

export const PROJECT_STATUS_BADGES: Record<ProjectStatus, string> = {
  planning: "pill-neutral",
  building: "pill-accent",
  completed: "pill-success",
  maintaining: "pill-neutral",
  archived: "pill-neutral",
};

export const PROJECT_CATEGORIES = ["AI", "Web", "Mobile", "IoT", "Research", "Other"];

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  fixed: "Fixed",
  closed: "Closed",
};

export const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  suggestion: "Suggestion",
  question: "Question",
  improvement: "Improvement",
};
