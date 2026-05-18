import { redirect } from "next/navigation";
import { AUTH_API_ORIGIN, getOnboardingReturnTo } from "@/lib/backend-api";

export default function SignupPage() {
  const returnTo = getOnboardingReturnTo();
  redirect(
    `${AUTH_API_ORIGIN}/signup?returnTo=${encodeURIComponent(returnTo)}`,
  );
}
