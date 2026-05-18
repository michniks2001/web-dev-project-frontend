"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchAssignedFirmTasks,
  fetchSession,
  isFirmAdmin,
  isFirmUser,
  updateAssignedTaskStatus,
  type FirmInquiry,
  type InquiryStatus,
} from "@/lib/backend-api";

const statusColors: Record<InquiryStatus, string> = {
  SUBMITTED: "text-blue-700",
  REVIEWING: "text-amber-700",
  QUOTED: "text-violet-700",
  ACCEPTED: "text-emerald-700",
  CLOSED: "text-slate-500",
};

function nextStatus(status: InquiryStatus): InquiryStatus | null {
  if (status === "SUBMITTED") return "REVIEWING";
  if (status === "REVIEWING") return "QUOTED";
  if (status === "QUOTED") return "ACCEPTED";
  if (status === "ACCEPTED") return "CLOSED";
  return null;
}

function formatBudget(min: number | null, max: number | null) {
  if (min == null && max == null) return "—";
  const fmt = (n: number) => `$${(n / 100).toLocaleString()}`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  if (max != null) return `Up to ${fmt(max)}`;
  return "—";
}

export default function AssignedTasksPage() {
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<FirmInquiry[]>([]);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(forceRefresh: boolean = false) {
      const me = await fetchSession();
      if (cancelled) return;
      if (!isFirmUser(me)) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      setAdmin(isFirmAdmin(me));

      const data = await fetchAssignedFirmTasks(undefined, { forceRefresh });
      if (cancelled) return;
      setTasks(data?.inquiries ?? []);
      setLoading(false);
    }

    load();
    const interval = window.setInterval(() => {
      void (async () => {
        await load(true);
      })();
    }, 60000);

    const onFocus = () => {
      void load(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  async function advanceTask(task: FirmInquiry) {
    const next = nextStatus(task.status);
    if (!next) return;
    setError(null);
    setUpdatingId(task.id);
    const result = await updateAssignedTaskStatus(task.id, next);
    setUpdatingId(null);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    setTasks((curr) =>
      curr.map((t) => (t.id === task.id ? { ...t, status: next } : t)),
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading your assigned tasks...
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Firm login required.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-3xl font-semibold tracking-tight">My assigned tasks</h1>
        <p className="mt-2 text-sm text-slate-600">
          Work through inquiries assigned to you.
        </p>
      </section>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {tasks.length === 0 ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">No assigned tasks yet.</p>
          {admin ? (
            <Link href="/dashboard/inquiries" className="mt-3 inline-block text-sm font-medium underline">
              View all requests
            </Link>
          ) : (
            <p className="mt-3 text-xs text-slate-500">
              New assignments will appear here automatically.
            </p>
          )}
        </section>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const next = nextStatus(task.status);
            return (
              <article
                key={task.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{task.company}</p>
                    <p className="text-sm text-slate-600">{task.project}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {task.category ?? "General"} · {formatBudget(task.budgetMin, task.budgetMax)}
                    </p>
                  </div>
                  <span className={`text-xs font-medium ${statusColors[task.status]}`}>
                    {task.status}
                  </span>
                </div>

                {next && (
                  <button
                    type="button"
                    onClick={() => advanceTask(task)}
                    disabled={updatingId === task.id}
                    className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    {updatingId === task.id ? "Updating..." : `Move to ${next}`}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

