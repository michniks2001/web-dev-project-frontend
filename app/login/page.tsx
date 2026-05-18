import { redirect } from "next/navigation";
import { AUTH_API_ORIGIN } from "@/lib/backend-api";

function getOnboardingReturnTo(): string {
  const fallback = "http://localhost:3000/onboarding";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return fallback;

  try {
    const normalized = appUrl.startsWith("http")
      ? appUrl
      : `http://${appUrl}`;
    const url = new URL(normalized);
    url.pathname = "/onboarding";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return fallback;
  }
}

export default function LoginPage() {
  const returnTo = getOnboardingReturnTo();
  redirect(`${AUTH_API_ORIGIN}/login?returnTo=${encodeURIComponent(returnTo)}`);
}
