"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AUTH_API_ORIGIN,
  fetchSession,
  hasCompletedOnboarding,
  isBuyerUser,
  isFirmUser,
  type OnboardingMeData,
} from "@/lib/backend-api";

const publicNavLinks = [{ href: "/marketplace", label: "Marketplace" }];

const firmNavLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/tasks", label: "My Tasks" },
  { href: "/dashboard/services", label: "Services" },
  { href: "/dashboard/inquiries", label: "Requests" },
  { href: "/dashboard/subscription", label: "Subscription" },
  { href: "/dashboard/profile", label: "Profile" },
];

const firmMemberNavLinks = [
  { href: "/dashboard/tasks", label: "My Tasks" },
];

const buyerNavLinks = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/my-requests", label: "My Requests" },
];

function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  if (href === "/marketplace" && pathname.startsWith("/marketplace")) return true;
  if (href === "/marketplace" && pathname.startsWith("/firms/")) return true;
  return pathname.startsWith(`${href}/`);
}

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<OnboardingMeData | null>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    fetchSession().then((data) => {
      if (!cancelled) setMe(data);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const logoutHref = useMemo(
    () => `${AUTH_API_ORIGIN}/api/v1/logout`,
    [],
  );

  const { loginHref, signupHref } = useMemo(() => {
    const fallback = "http://localhost:3000/onboarding";
    let returnTo = fallback;
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.origin);
        url.pathname = "/onboarding";
        returnTo = url.toString();
      } catch {
        returnTo = fallback;
      }
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        const normalized = appUrl.startsWith("http")
          ? appUrl
          : `http://${appUrl}`;
        const url = new URL(normalized);
        url.pathname = "/onboarding";
        returnTo = url.toString();
      } catch {
        returnTo = fallback;
      }
    }
    const encoded = encodeURIComponent(returnTo);
    return {
      loginHref: `${AUTH_API_ORIGIN}/login?returnTo=${encoded}`,
      signupHref: `${AUTH_API_ORIGIN}/signup?returnTo=${encoded}`,
    };
  }, []);

  const authenticated = Boolean(me?.authenticated);
  const firmUser = isFirmUser(me);
  const buyerUser = isBuyerUser(me);
  const firmMemberRole = me?.user?.firmMember?.role;
  const onboardingDone = hasCompletedOnboarding(me);

  const navLinks = firmUser
    ? firmMemberRole === "ADMIN"
      ? firmNavLinks
      : firmMemberNavLinks
    : buyerUser
      ? buyerNavLinks
      : publicNavLinks;

  const homeHref = firmUser
    ? firmMemberRole === "ADMIN"
      ? "/dashboard"
      : "/dashboard/tasks"
    : "/";
  const showOnboardingLink =
    authenticated && !onboardingDone && !firmUser;

  return (
    <>
      <style>{`
        .desktop-nav { display: none; }
        .desktop-auth { display: none; }
        .desktop-cta { display: none; }
        .hamburger-btn { display: flex; }
        @media (min-width: 768px) {
          .desktop-nav { display: flex; }
          .desktop-auth { display: flex; }
          .desktop-cta { display: inline-flex; }
          .hamburger-btn { display: none; }
        }
      `}</style>

      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <Link
            href={homeHref}
            className="flex items-center gap-2"
            aria-label="Clarity home"
          >
            <Image
              src="/clarity_logo.svg"
              alt="Clarity"
              width={120}
              height={32}
              className="h-7 w-auto md:h-8"
              priority
            />
            {firmUser && me?.user?.firmMember?.firm?.name && (
              <span className="hidden text-sm font-normal text-slate-500 sm:inline">
                {" "}
                · {me.user.firmMember.firm.name}
                {me.user.firmMember.role && (
                  <span className="text-slate-400"> · {me.user.firmMember.role}</span>
                )}
              </span>
            )}
          </Link>

          <nav className="desktop-nav items-center gap-5 text-sm text-slate-700">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors hover:text-slate-950 ${
                  isNavActive(pathname, link.href)
                    ? "font-medium text-slate-950"
                    : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
            {showOnboardingLink && (
              <Link
                href="/onboarding"
                className="transition-colors hover:text-slate-950"
              >
                Onboarding
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <nav className="desktop-auth items-center gap-4 text-sm text-slate-700">
              {authenticated ? (
                <>
                  <Link href="/me" className="hover:text-slate-950">
                    Account
                  </Link>
                  <a
                    href={logoutHref}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Log out
                  </a>
                </>
              ) : (
                <>
                  <a href={loginHref} className="hover:text-slate-950">
                    Log in
                  </a>
                  <a
                    href={signupHref}
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    Sign up
                  </a>
                </>
              )}
            </nav>

            <button
              type="button"
              className="hamburger-btn h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700"
              onClick={() => setOpen((p) => !p)}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {open && (
          <>
            <div
              className="fixed inset-0 top-[65px] z-40 bg-black/20 backdrop-blur-sm md:hidden"
              onClick={() => setOpen(false)}
            />
            <div className="fixed left-0 right-0 top-[65px] z-50 border-b border-slate-200 bg-white shadow-md md:hidden">
              <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-md px-3 py-2.5 text-sm font-medium ${
                      isNavActive(pathname, link.href)
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {showOnboardingLink && (
                  <Link
                    href="/onboarding"
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-600"
                  >
                    Onboarding
                  </Link>
                )}
                {authenticated ? (
                  <>
                    <Link
                      href="/me"
                      className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-600"
                    >
                      Account
                    </Link>
                    <a
                      href={logoutHref}
                      className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-600"
                    >
                      Log out
                    </a>
                  </>
                ) : (
                  <>
                    <a
                      href={loginHref}
                      className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-600"
                    >
                      Log in
                    </a>
                    <a
                      href={signupHref}
                      className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-600"
                    >
                      Sign up
                    </a>
                  </>
                )}
              </nav>
            </div>
          </>
        )}
      </header>
    </>
  );
}
