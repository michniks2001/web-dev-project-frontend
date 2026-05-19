import type { NextRequest } from "next/server";
import { proxyAuthToBackend } from "@/lib/auth-proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return proxyAuthToBackend(req, "/signup");
}
