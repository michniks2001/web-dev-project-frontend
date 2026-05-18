"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  assignFirmInquiry,
  fetchFirmInquiries,
  fetchSession,
  isFirmAdmin,
  isFirmUser,
  updateFirmInquiryStatus,
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

const allStatuses: (InquiryStatus | "ALL")[] = [
  "ALL",
  "SUBMITTED",
  "REVIEWING",
  "QUOTED",
  "ACCEPTED",
  "CLOSED",
];

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
  });
}

export default function InquiryPipelinePage() {
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [inquiries, setInquiries] = useState<FirmInquiry[]>([]);
  const [counts, setCounts] = useState<Record<InquiryStatus, number>>({
    SUBMITTED: 0,
    REVIEWING: 0,
    QUOTED: 0,
    ACCEPTED: 0,
    CLOSED: 0,
  });
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<InquiryStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [canAssign, setCanAssign] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; fullName: string }>>([]);

  async function applyStatus(inquiryId: string, nextStatus: InquiryStatus) {
    setStatusError(null);
    setUpdatingId(inquiryId);
    const result = await updateFirmInquiryStatus(inquiryId, nextStatus);
    if (result.status === "error") {
      setStatusError(result.message);
      setUpdatingId(null);
      return;
    }
    setInquiries((curr) =>
      curr.map((inq) =>
        inq.id === inquiryId ? { ...inq, status: nextStatus } : inq,
      ),
    );
    setCounts((curr) => {
      const next = { ...curr };
      const currentStatus = inquiries.find((i) => i.id === inquiryId)?.status;
      if (currentStatus) {
        next[currentStatus] = Math.max(0, next[currentStatus] - 1);
      }
      next[nextStatus] = (next[nextStatus] ?? 0) + 1;
      return next;
    });
    setUpdatingId(null);
  }

  async function assignInquiry(inquiryId: string, assigneeMemberId: string) {
    setStatusError(null);
    setAssigningId(inquiryId);
    const result = await assignFirmInquiry(inquiryId, assigneeMemberId);
    if (result.status === "error") {
      setStatusError(result.message);
      setAssigningId(null);
      return;
    }
    setInquiries((curr) =>
      curr.map((inq) =>
        inq.id === inquiryId
          ? { ...inq, assigneeId: result.assigneeId, assignee: result.assignee }
          : inq,
      ),
    );
    setAssigningId(null);
  }

  function getNextStatus(status: InquiryStatus): InquiryStatus | null {
    if (status === "SUBMITTED") return "REVIEWING";
    if (status === "REVIEWING") return "QUOTED";
    if (status === "QUOTED") return "ACCEPTED";
    if (status === "ACCEPTED") return "CLOSED";
    return null;
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const session = await fetchSession();
      if (cancelled) return;

      if (!isFirmUser(session)) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      setCanAssign(isFirmAdmin(session));

      const data = await fetchFirmInquiries();
      if (cancelled) return;

      if (data) {
        setInquiries(data.inquiries);
        setCounts(data.summary.counts);
        setTotal(data.summary.total);
        setTeamMembers((data.teamMembers ?? []).map((m) => ({ id: m.id, fullName: m.fullName })));
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = inquiries.filter((inq) => {
    const matchStatus = filter === "ALL" || inq.status === filter;
    const q = search.toLowerCase();
    const matchSearch =
      q === "" ||
      inq.company.toLowerCase().includes(q) ||
      inq.project.toLowerCase().includes(q) ||
      inq.contactName.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading requests...
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-semibold">Requests</h1>
          <p className="mt-2 text-sm text-slate-600">
            Firm access is required to view incoming quote requests.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-slate-800 underline"
          >
            Log in
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Dashboard
        </Link>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Incoming requests
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {total} total request{total === 1 ? "" : "s"} from businesses.
        </p>
      </section>

      <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-5">
        {(
          ["SUBMITTED", "REVIEWING", "QUOTED", "ACCEPTED", "CLOSED"] as InquiryStatus[]
        ).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(filter === s ? "ALL" : s)}
            className={`w-36 shrink-0 rounded-xl border p-3 text-left transition-all md:w-auto ${
              filter === s
                ? "border-slate-400 bg-white shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {s}
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {counts[s]}
            </p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search by company, project, or contact..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as InquiryStatus | "ALL")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none sm:hidden"
        >
          {allStatuses.map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? "All statuses" : s}
            </option>
          ))}
        </select>
      </div>

      {statusError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {statusError}
        </p>
      )}

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {[
                  "Company",
                  "Project",
                  "Category",
                  "Budget",
                  "Assignee",
                  "Submitted",
                  "Status",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((inq) => (
                <tr key={inq.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{inq.company}</p>
                    <p className="text-xs text-slate-500">{inq.contactName}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{inq.project}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {inq.category ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {formatBudget(inq.budgetMin, inq.budgetMax)}
                  </td>
                  <td className="px-4 py-3">
                    {canAssign ? (
                      <select
                        value={inq.assigneeId ?? ""}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          void assignInquiry(inq.id, e.target.value);
                        }}
                        disabled={assigningId === inq.id || teamMembers.length === 0}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                      >
                        <option value="" disabled>
                          {teamMembers.length ? "Assign to..." : "No team members"}
                        </option>
                        {teamMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.fullName}
                          </option>
                        ))}
                      </select>
                    ) : inq.assignee ? (
                      <span className="text-xs text-slate-600">{inq.assignee}</span>
                    ) : (
                      <span className="text-xs font-medium text-amber-600">Unassigned</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {formatDate(inq.submittedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${statusColors[inq.status]}`}>
                      {inq.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {getNextStatus(inq.status) ? (
                      <button
                        type="button"
                        onClick={() =>
                          applyStatus(inq.id, getNextStatus(inq.status) as InquiryStatus)
                        }
                        disabled={updatingId === inq.id}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                      >
                        {updatingId === inq.id ? "Updating..." : `Move to ${getNextStatus(inq.status)}`}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-10 text-center text-sm text-slate-500">
            No requests match your filters.
          </div>
        )}
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.map((inq) => (
          <div
            key={inq.id}
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-slate-900">{inq.company}</p>
                <p className="text-xs text-slate-500">
                  {inq.contactName} · {formatDate(inq.submittedAt)}
                </p>
              </div>
              <span className={`shrink-0 text-xs font-medium ${statusColors[inq.status]}`}>
                {inq.status}
              </span>
            </div>
            <p className="text-sm text-slate-700">{inq.project}</p>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{inq.category ?? "General"}</span>
              <span>{formatBudget(inq.budgetMin, inq.budgetMax)}</span>
            </div>
            <div className="text-xs">
              {canAssign ? (
                <select
                  value={inq.assigneeId ?? ""}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    void assignInquiry(inq.id, e.target.value);
                  }}
                  disabled={assigningId === inq.id || teamMembers.length === 0}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                >
                  <option value="" disabled>
                    {teamMembers.length ? "Assign to..." : "No team members"}
                  </option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName}
                    </option>
                  ))}
                </select>
              ) : inq.assignee ? (
                <span className="text-slate-600">
                  Assigned to <strong>{inq.assignee}</strong>
                </span>
              ) : (
                <span className="font-medium text-amber-600">Unassigned</span>
              )}
            </div>
            {getNextStatus(inq.status) && (
              <button
                type="button"
                onClick={() =>
                  applyStatus(inq.id, getNextStatus(inq.status) as InquiryStatus)
                }
                disabled={updatingId === inq.id}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                {updatingId === inq.id
                  ? "Updating..."
                  : `Move to ${getNextStatus(inq.status)}`}
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            No requests match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
