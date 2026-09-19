import Link from "next/link";
import { Award, FileEdit, GraduationCap, Rocket } from "lucide-react";

const CREATE_OPTIONS = [
  {
    href: "/create/post",
    title: "Post",
    description: "Share an update, question, or something you learned.",
    Icon: FileEdit,
  },
  {
    href: "/create/project",
    title: "Project",
    description: "Showcase a project with screenshots, links, and tech stack.",
    Icon: Rocket,
  },
  {
    href: "/create/post?type=achievement",
    title: "Achievement",
    description: "Hackathon wins, certificates, milestones, internships.",
    Icon: Award,
  },
  {
    href: "/create/post?type=course_completion",
    title: "Course Completion",
    description: "Share a completed course with your certificate.",
    Icon: GraduationCap,
  },
];

export default function CreatePage() {
  return (
    <div className="container-app max-w-2xl py-8 md:py-12">
      <h1 className="section-title text-3xl font-black tracking-tight">Create</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">Share progress, showcase work, and inspire the community.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]">
        {CREATE_OPTIONS.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className="group flex items-center gap-3 border-b border-[var(--color-line)] px-4 py-3.5 transition last:border-b-0 hover:bg-[var(--color-surface-2)]"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-ink)]">
              <option.Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-[var(--color-ink)]">{option.title}</span>
              <span className="block truncate text-xs text-[var(--color-faint)]">{option.description}</span>
            </span>
            <span aria-hidden="true" className="text-[var(--color-faint)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-ink)]">
              ›
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
