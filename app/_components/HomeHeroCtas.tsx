"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchSession,
  isBuyerUser,
  isFirmUser,
  type OnboardingMeData,
} from "@/lib/backend-api";

export default function HomeHeroCtas() {
  const [me, setMe] = useState<OnboardingMeData | null>(null);

  useEffect(() => {
    fetchSession().then(setMe);
  }, []);

  const firmUser = isFirmUser(me);
  const buyerUser = isBuyerUser(me);

  if (firmUser) {
    return (
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/dashboard"
          className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          Open dashboard
        </Link>
      </div>
    );
  }

  if (buyerUser) {
    return (
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/firms"
          className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          Browse firms
        </Link>
        <Link
          href="/my-requests"
          className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          My requests
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-7 flex flex-wrap gap-3">
      <Link
        href="/firms"
        className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
      >
        Explore firms
      </Link>
      <Link
        href="/inquiries/new"
        className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        Request a quote
      </Link>
    </div>
  );
}
