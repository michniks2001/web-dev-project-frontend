import { redirect } from "next/navigation";
import { AUTH_API_ORIGIN, getOnboardingReturnTo } from "@/lib/backend-api";

export default function LoginPage() {
  const returnTo = getOnboardingReturnTo();
  redirect(`${AUTH_API_ORIGIN}/login?returnTo=${encodeURIComponent(returnTo)}`);
}
