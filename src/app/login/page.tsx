import { LoginClient } from "@/components/auth/LoginClient";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

function sanitizeNextPath(value: string | undefined): string {
  if (!value) {
    return "/";
  }

  // Allow internal app paths only (single leading slash).
  if (!/^\/(?!\/)/.test(value)) {
    return "/";
  }

  if (value.includes("\\") || value.includes("\0")) {
    return "/";
  }

  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolved = await searchParams;
  const nextPath = sanitizeNextPath(resolved.next);

  return <LoginClient nextPath={nextPath} />;
}
