/** Hosted Express API on Render — fallback when env vars are unset on Vercel. */
export const PRODUCTION_API_ORIGIN = "https://backend-eqvv.onrender.com";

/** Backend URL for server-side fetches and auth proxy route handlers. */
export function resolveBackendUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1"
  ) {
    return PRODUCTION_API_ORIGIN;
  }
  return "http://localhost:4000";
}
