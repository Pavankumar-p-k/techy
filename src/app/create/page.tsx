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

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {CREATE_OPTIONS.map((option) => (
          <Link key={option.href} href={option.href} className="card card-hover p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-ink)]">
              <option.Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-base font-bold text-[var(--color-ink)]">{option.title}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">{option.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
