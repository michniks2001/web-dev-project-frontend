"use client";

import { useState } from "react";
import Link from "next/link";

// Matches FirmMember schema: role (ADMIN | MEMBER), title, specialties, isActive
type FirmRole = "ADMIN" | "MEMBER";

const initialTeam = [
  { id: "1", fullName: "Sarah Connor",  email: "sarah@apexconsulting.com", role: "ADMIN" as FirmRole,  title: "Managing Director", specialties: ["Strategy", "Operations"], isActive: true,  leads: 8 },
  { id: "2", fullName: "John Reese",    email: "john@apexconsulting.com",  role: "MEMBER" as FirmRole, title: "Senior Consultant", specialties: ["SaaS", "Product Strategy"], isActive: true, leads: 5 },
  { id: "3", fullName: "Alex Rivera",   email: "alex@apexconsulting.com",  role: "MEMBER" as FirmRole, title: "Consultant",        specialties: ["GTM", "Finance"], isActive: true, leads: 3 },
  { id: "4", fullName: "Taylor Moss",   email: "taylor@apexconsulting.com",role: "MEMBER" as FirmRole, title: "Analyst",           specialties: [], isActive: false, leads: 0 },
];

export default function TeamPage() {
  const [team, setTeam] = useState(initialTeam);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<FirmRole>("MEMBER");
  const [inviteTitle, setInviteTitle] = useState("");

  const activeCount = team.filter((m) => m.isActive).length;
  const pendingCount = team.filter((m) => !m.isActive).length;
  // Matches STUDIO plan default: teamSeatLimit = 5
  const seatLimit = 5;
  const planName = "STUDIO";

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    setTeam((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        fullName: inviteEmail.split("@")[0],
        email: inviteEmail,
        role: inviteRole,
        title: inviteTitle || "Consultant",
        specialties: [],
        isActive: false,
        leads: 0,
      },
    ]);
    setInviteEmail("");
    setInviteTitle("");
    setShowInvite(false);
  };

  const handleRoleChange = (id: string, role: FirmRole) =>
    setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));

  const handleRemove = (id: string) =>
    setTeam((prev) => prev.filter((m) => m.id !== id));

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">← Dashboard</Link>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Team</h1>
            <p className="mt-1 text-sm text-slate-600">Manage firm members and inquiry ownership.</p>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            disabled={activeCount >= seatLimit}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            + Invite Member
          </button>
        </div>
      </section>

      {/* Invite panel */}
      {showInvite && (
        <section className="rounded-xl border border-slate-300 bg-white p-4 md:p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Invite a team member</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="email"
              placeholder="colleague@yourfirm.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            />
            <input
              type="text"
              placeholder="Title (e.g. Senior Consultant)"
              value={inviteTitle}
              onChange={(e) => setInviteTitle(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as FirmRole)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none"
            >
              <option value="MEMBER">MEMBER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <button onClick={handleInvite} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors">
              Send Invite
            </button>
            <button onClick={() => setShowInvite(false)} className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
          <p className="text-xs text-slate-500">They'll receive an email to join your firm workspace.</p>
        </section>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active</p>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900">{activeCount}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Pending</p>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900">{pendingCount}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Seats</p>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900">
            {activeCount}<span className="text-sm font-normal text-slate-400"> / {seatLimit}</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{planName} plan</p>
        </article>
      </div>

      {/* Seat usage bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-500">Seat usage</span>
          <span className="font-medium text-slate-700">{activeCount} / {seatLimit} used</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div
            className={`h-2 rounded-full transition-all ${activeCount / seatLimit >= 0.8 ? "bg-amber-500" : "bg-slate-800"}`}
            style={{ width: `${(activeCount / seatLimit) * 100}%` }}
          />
        </div>
        {activeCount >= seatLimit && (
          <p className="mt-2 text-xs text-amber-600 font-medium">Seat limit reached. Upgrade to add more members.</p>
        )}
      </div>

      {/* Member list */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 md:px-5">
          <p className="text-sm font-semibold text-slate-900">Members</p>
        </div>
        <div className="divide-y divide-slate-100">
          {team.map((member) => (
            <div key={member.id} className="flex items-center gap-3 px-4 py-4 hover:bg-slate-50 transition-colors md:px-5">
              {/* Avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                {member.fullName[0]}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900 text-sm">{member.fullName}</p>
                  <span className="text-xs text-slate-500">{member.role}</span>
                  {!member.isActive && (
                    <span className="text-xs text-amber-700">· Invited</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">{member.title} · {member.email}</p>
                {member.specialties.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">{member.specialties.join(" · ")}</p>
                )}
              </div>
              {/* Leads */}
              <div className="hidden sm:block text-center shrink-0">
                <p className="text-xs text-slate-400">Leads</p>
                <p className="text-sm font-semibold text-slate-900">{member.leads}</p>
              </div>
              {/* Role select */}
              <select
                value={member.role}
                onChange={(e) => handleRoleChange(member.id, e.target.value as FirmRole)}
                className="hidden sm:block rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none"
              >
                <option value="MEMBER">MEMBER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              {/* Remove */}
              <button
                onClick={() => handleRemove(member.id)}
                className="shrink-0 text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Lead assignment bars */}
      {team.some((m) => m.leads > 0) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
          <p className="text-sm font-semibold text-slate-900">Lead Assignments</p>
          <p className="mt-0.5 text-xs text-slate-500">Open inquiries by assignee.</p>
          <div className="mt-4 space-y-3">
            {team.filter((m) => m.leads > 0).map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <span className="w-20 truncate text-xs font-medium text-slate-700">{member.fullName.split(" ")[0]}</span>
                <div className="flex-1 rounded-full bg-slate-100 h-2">
                  <div className="h-2 rounded-full bg-slate-800 transition-all" style={{ width: `${(member.leads / 10) * 100}%` }} />
                </div>
                <span className="w-12 text-right text-xs text-slate-500">{member.leads} leads</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
