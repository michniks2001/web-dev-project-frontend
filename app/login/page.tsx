import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authLoginPath, getOnboardingReturnTo } from "@/lib/backend-api";

function sanitizeHost(raw: string | null): string | null {
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim();
  return first || null;
}

async function resolveReturnTo(): Promise<string> {
  try {
    const h = await headers();
    const host = sanitizeHost(h.get("x-forwarded-host")) ?? sanitizeHost(h.get("host"));
    const proto =
      h.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
      (host?.includes("localhost") ? "http" : "https");
    if (host) {
      return `${proto}://${host}/onboarding`;
    }
  } catch {
    // headers() not available — fall through
  }
  return getOnboardingReturnTo();
}

export default async function LoginPage() {
  const returnTo = await resolveReturnTo();
  redirect(authLoginPath(returnTo));
}
