import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authSignupPath, getOnboardingReturnTo } from "@/lib/backend-api";

async function resolveReturnTo(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto =
      h.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
    if (host) {
      return `${proto}://${host}/onboarding`;
    }
  } catch {
    // headers() not available — fall through
  }
  return getOnboardingReturnTo();
}

export default async function SignupPage() {
  const returnTo = await resolveReturnTo();
  redirect(authSignupPath(returnTo));
}
