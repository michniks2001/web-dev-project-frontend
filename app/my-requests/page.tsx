"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchBuyerInquiries,
  fetchSession,
  isBuyerUser,
  type BuyerInquiry,
  type BuyerInquiriesData,
  type InquiryStatus,
} from "@/lib/backend-api";

const statusColors: Record<InquiryStatus, string> = {
  SUBMITTED: "text-blue-700",
  REVIEWING: "text-amber-700",
  QUOTED: "text-violet-700",
  ACCEPTED: "text-emerald-700",
  CLOSED: "text-slate-500",
};

function formatBudget(min: number | null, max: number | null) {
  if (min == null && max == null) return "—";
  const fmt = (n: number) => `$${(n / 100).toLocaleString()}`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  if (max != null) return `Up to ${fmt(max)}`;
  return "—";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MyRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [data, setData] = useState<BuyerInquiriesData | null>(null);
  const [filter, setFilter] = useState<InquiryStatus | "ALL">("ALL");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const session = await fetchSession();
      if (cancelled) return;

      if (!isBuyerUser(session)) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      const result = await fetchBuyerInquiries();
      if (cancelled) return;

      setData(result);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const inquiries = data?.inquiries ?? [];
  const summary = data?.summary ?? {
    total: 0,
    active: 0,
    counts: {
      SUBMITTED: 0,
      REVIEWING: 0,
      QUOTED: 0,
      ACCEPTED: 0,
      CLOSED: 0,
    },
  };

  const filtered = inquiries.filter(
    (inq) => filter === "ALL" || inq.status === filter,
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading your requests...
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-semibold text-slate-950">My requests</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in as a buyer and complete onboarding to track quote requests.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Log in
            </Link>
            <Link
              href="/onboarding"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Complete profile
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-3xl font-semibold tracking-tight">My requests</h1>
        <p className="mt-2 text-sm text-slate-600">
          Quote requests you have sent to consulting firms.
        </p>
        <Link
          href="/firms"
          className="mt-4 inline-flex text-sm font-medium text-slate-800 underline hover:text-slate-950"
        >
          Browse firms to request another quote
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Total sent
          </p>
          <p className="mt-2 text-3xl font-semibold">{summary.total}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Active
          </p>
          <p className="mt-2 text-3xl font-semibold text-amber-700">
            {summary.active}
          </p>
          <p className="mt-1 text-xs text-slate-500">Awaiting firm response</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Quoted
          </p>
          <p className="mt-2 text-3xl font-semibold">{summary.counts.QUOTED}</p>
        </article>
      </section>

      <div className="flex flex-wrap gap-2">
        {(["ALL", "SUBMITTED", "REVIEWING", "QUOTED", "ACCEPTED", "CLOSED"] as const).map(
          (s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === s
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s === "ALL" ? "All" : s}
              {s !== "ALL" && (
                <span className="ml-1 opacity-70">
                  ({summary.counts[s as InquiryStatus]})
                </span>
              )}
            </button>
          ),
        )}
      </div>

      {filtered.length === 0 ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-600">
            {summary.total === 0
              ? "You have not sent any quote requests yet."
              : "No requests match this filter."}
          </p>
          {summary.total === 0 && (
            <Link
              href="/firms"
              className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Find a firm
            </Link>
          )}
        </section>
      ) : (
        <ul className="space-y-3">
          {filtered.map((inq) => (
            <RequestCard key={inq.id} inquiry={inq} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestCard({ inquiry }: { inquiry: BuyerInquiry }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {inquiry.firm.name}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            {inquiry.project}
          </h2>
          {inquiry.serviceTitle && (
            <p className="mt-1 text-sm text-slate-600">{inquiry.serviceTitle}</p>
          )}
        </div>
        <span className={`text-xs font-medium ${statusColors[inquiry.status]}`}>
          {inquiry.status}
        </span>
      </div>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-slate-500">Submitted</dt>
          <dd className="font-medium text-slate-800">
            {formatDate(inquiry.submittedAt)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Budget</dt>
          <dd className="font-medium text-slate-800">
            {formatBudget(inquiry.budgetMin, inquiry.budgetMax)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Timeline</dt>
          <dd className="font-medium text-slate-800">
            {inquiry.desiredTimeline ?? "—"}
          </dd>
        </div>
      </dl>
      <Link
        href={`/firms/${inquiry.firm.slug}`}
        className="mt-4 inline-block text-sm font-medium text-slate-700 underline hover:text-slate-950"
      >
        View firm
      </Link>
    </li>
  );
}
