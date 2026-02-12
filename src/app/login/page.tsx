import { LoginClient } from "@/components/auth/LoginClient";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolved = await searchParams;
  const nextPath = resolved.next?.startsWith("/") ? resolved.next : "/";

  return <LoginClient nextPath={nextPath} />;
}
