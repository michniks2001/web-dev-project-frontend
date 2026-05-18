"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchAssignedFirmTasks,
  fetchFirmDashboardSummary,
  fetchFirmInquiries,
  fetchSession,
  isFirmAdmin,
  isFirmUser,
  type FirmDashboardSummaryData,
  type FirmInquiriesData,
  type OnboardingMeData,
} from "@/lib/backend-api";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<OnboardingMeData | null>(null);
  const [summaryData, setSummaryData] = useState<FirmDashboardSummaryData | null>(null);
  const [data, setData] = useState<FirmInquiriesData | null>(null);
  const [assignedCount, setAssignedCount] = useState(0);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const sessionData = await fetchSession();
      if (cancelled) return;

      if (!isFirmUser(sessionData)) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      setSession(sessionData);

      if (isFirmAdmin(sessionData)) {
        const [summary, inquiries] = await Promise.all([
          fetchFirmDashboardSummary(),
          fetchFirmInquiries(),
        ]);
        if (cancelled) return;
        setSummaryData(summary);
        setData(inquiries);
      } else {
        const tasks = await fetchAssignedFirmTasks();
        if (cancelled) return;
        setAssignedCount(tasks?.summary.open ?? 0);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading dashboard...
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-semibold text-slate-950">Firm dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">
            This area is for consulting firm accounts. Log in as a firm user or
            complete firm onboarding.
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
              Onboarding
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const firmName = data?.firm.name ?? "Your firm";
  const summary = summaryData?.summary ?? {
    openInquiries: 0,
    quotesSent: 0,
    activeServices: 0,
    teamMembers: 0,
  };

  const recent = data?.inquiries.slice(0, 5) ?? [];
  const memberName = session?.user?.fullName ?? "Firm member";
  const admin = isFirmAdmin(session);

  if (!admin) {
    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-3xl font-semibold tracking-tight">Member dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">
            Welcome back, {memberName}. Focus on assigned work and keep inquiries moving.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Open assigned tasks
            </p>
            <p className="mt-2 text-3xl font-semibold text-amber-700">
              {assignedCount}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Next step
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Review your assigned inquiries and update their status.
            </p>
          </article>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Assigned tasks</h2>
              <p className="mt-1 text-sm text-slate-600">
                View and fulfill inquiries that are currently assigned to you.
              </p>
            </div>
            <Link
              href="/dashboard/tasks"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Open my tasks
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-3xl font-semibold tracking-tight">{firmName}</h1>
        <p className="mt-2 text-slate-600">
          Incoming quote requests from businesses interested in your services.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Open inquiries
          </p>
          <p className="mt-2 text-3xl font-semibold">{summary.openInquiries}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Quotes sent
          </p>
          <p className="mt-2 text-3xl font-semibold text-violet-700">{summary.quotesSent}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Active services
          </p>
          <p className="mt-2 text-3xl font-semibold">{summary.activeServices}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Team members
          </p>
          <p className="mt-2 text-3xl font-semibold">{summary.teamMembers}</p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Recent requests</h2>
            <p className="mt-1 text-sm text-slate-600">
              Latest inquiries submitted to your firm.
            </p>
          </div>
          <Link
            href="/dashboard/inquiries"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            View all requests
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
            No requests yet. When buyers submit inquiries to your firm, they
            will appear here.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-slate-100">
            {recent.map((inq) => (
              <li
                key={inq.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{inq.company}</p>
                  <p className="text-sm text-slate-600">{inq.project}</p>
                  <p className="text-xs text-slate-500">
                    {inq.contactName} ·{" "}
                    {new Date(inq.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-600">
                  {inq.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
