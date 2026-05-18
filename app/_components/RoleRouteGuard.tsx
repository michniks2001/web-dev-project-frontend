"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AUTH_API_ORIGIN, fetchSession, isBuyerUser, isFirmUser } from "@/lib/backend-api";

const FIRM_BLOCKED_PATHS = [
  "/",
  "/marketplace",
  "/firms",
  "/services",
  "/inquiries/new",
  "/my-requests",
];

const FIRM_BLOCKED_DASHBOARD_EXTRA = [
  "/dashboard/team",
  "/dashboard/analytics",
  "/dashboard/subscription",
];

const BUYER_ALLOWED_PREFIXES = [
  "/marketplace",
  "/firms",
  "/my-requests",
  "/inquiries",
  "/me",
  "/onboarding",
  "/login",
  "/signup",
  "/verify-firm",
];
const GUEST_ALLOWED_PREFIXES = [
  "/",
  "/login",
  "/signup",
  "/marketplace",
  "/firms",
  "/services",
  "/inquiries/new",
  "/verify-firm",
];
const AUTHED_NO_PROFILE_ALLOWED_PREFIXES = ["/onboarding", "/me", "/login", "/signup", "/verify-firm"];

function isFirmMarketplacePath(pathname: string): boolean {
  if (FIRM_BLOCKED_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/firms/")) return true;
  return false;
}

function isBuyerAllowedPath(pathname: string): boolean {
  return BUYER_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isGuestAllowedPath(pathname: string): boolean {
  return GUEST_ALLOWED_PREFIXES.some((prefix) => {
    if (prefix === "/") return pathname === "/";
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

function isAuthedNoProfileAllowedPath(pathname: string): boolean {
  return AUTHED_NO_PROFILE_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function RoleRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (typeof window !== "undefined") {
      try {
        const api = new URL(AUTH_API_ORIGIN);
        const appHost = window.location.hostname;
        const apiIsLocalhost = api.hostname === "localhost" || api.hostname === "127.0.0.1";
        if (apiIsLocalhost && appHost !== api.hostname) {
          const target = `${window.location.protocol}//${api.hostname}:${window.location.port}${window.location.pathname}${window.location.search}${window.location.hash}`;
          window.location.replace(target);
          return;
        }
      } catch {
        // Ignore invalid API origin and continue with normal auth checks.
      }
    }

    fetchSession().then((me) => {
      if (cancelled) return;

      if (isFirmUser(me)) {
        const isAdmin = me?.user?.firmMember?.role === "ADMIN";
        if (pathname === "/") {
          router.replace(isAdmin ? "/dashboard" : "/dashboard/tasks");
          return;
        }
        if (isFirmMarketplacePath(pathname) && pathname !== "/") {
          router.replace(isAdmin ? "/dashboard" : "/dashboard/tasks");
          return;
        }
        if (
          !isAdmin &&
          ["/dashboard", "/dashboard/inquiries", "/dashboard/services", "/onboarding"].some(
            (p) => pathname === p || pathname.startsWith(`${p}/`),
          )
        ) {
          router.replace("/dashboard/tasks");
          return;
        }
        if (
          !isAdmin &&
          FIRM_BLOCKED_DASHBOARD_EXTRA.some(
            (p) => pathname === p || pathname.startsWith(`${p}/`),
          )
        ) {
          router.replace(isAdmin ? "/dashboard/inquiries" : "/dashboard/tasks");
          return;
        }
      } else if (isBuyerUser(me)) {
        if (pathname === "/" || pathname === "/services" || pathname === "/firms") {
          router.replace("/marketplace");
          return;
        }
        if (pathname.startsWith("/dashboard")) {
          router.replace("/my-requests");
          return;
        }
        if (!isBuyerAllowedPath(pathname) && pathname !== "/") {
          router.replace("/marketplace");
          return;
        }
      } else if (me?.authenticated) {
        if (!isAuthedNoProfileAllowedPath(pathname)) {
          router.replace("/onboarding");
          return;
        }
      } else {
        if (!isGuestAllowedPath(pathname)) {
          router.replace("/");
          return;
        }
      }

      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}
