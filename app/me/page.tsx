"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  addMyFirmTeamMember,
  AUTH_API_ORIGIN,
  fetchMyFirmProfile,
  getOnboardingMe,
  isFirmUser,
  removeMyFirmTeamMember,
  type FirmProfileData,
  updateMyFirmProfile,
} from "@/lib/backend-api";

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Awaited<ReturnType<typeof getOnboardingMe>> | null>(null);
  const [profile, setProfile] = useState<FirmProfileData | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [location, setLocation] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [industries, setIndustries] = useState("");

  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberTitle, setMemberTitle] = useState("");
  const [memberRole, setMemberRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [memberSpecialties, setMemberSpecialties] = useState("");
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const me = await getOnboardingMe();
      if (cancelled) return;
      setSession(me);

      if (me.status !== "ok") {
        setError(me.message);
        setLoading(false);
        return;
      }

      if (!me.data.authenticated || !me.data.user) {
        setLoading(false);
        return;
      }

      if (!isFirmUser(me.data)) {
        setLoading(false);
        return;
      }

      const firmProfile = await fetchMyFirmProfile();
      if (cancelled) return;

      if (!firmProfile) {
        setError("Could not load firm profile.");
      } else {
        setProfile(firmProfile);
        setName(firmProfile.firm.name);
        setContactEmail(firmProfile.firm.contactEmail);
        setLocation(firmProfile.firm.location ?? "");
        setWebsiteUrl(firmProfile.firm.websiteUrl ?? "");
        setDescription(firmProfile.firm.description ?? "");
        setIndustries(firmProfile.firm.industries.join(", "));
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshProfile() {
    const firmProfile = await fetchMyFirmProfile();
    if (!firmProfile) return;
    setProfile(firmProfile);
  }

  async function saveFirmProfile() {
    setSaveMessage(null);
    const result = await updateMyFirmProfile({
      name: name.trim(),
      contactEmail: contactEmail.trim(),
      location: location.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
      description: description.trim() || undefined,
      industries: industries
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    });
    if (result.status === "error") {
      setSaveMessage(result.message);
      return;
    }
    setSaveMessage("Firm profile updated.");
    await refreshProfile();
  }

  async function addTeamMember() {
    setSaveMessage(null);
    if (!memberName.trim() || !memberEmail.trim()) {
      setSaveMessage("Team member name and email are required.");
      return;
    }
    const result = await addMyFirmTeamMember({
      fullName: memberName.trim(),
      email: memberEmail.trim(),
      title: memberTitle.trim() || undefined,
      role: memberRole,
      specialties: memberSpecialties
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    });
    if (result.status === "error") {
      setSaveMessage(result.message);
      return;
    }
    setMemberName("");
    setMemberEmail("");
    setMemberTitle("");
    setMemberRole("MEMBER");
    setMemberSpecialties("");
    setSaveMessage("Team member added.");
    await refreshProfile();
  }

  async function removeTeamMember(memberId: string) {
    setSaveMessage(null);
    setRemovingMemberId(memberId);
    const result = await removeMyFirmTeamMember(memberId);
    setRemovingMemberId(null);
    if (result.status === "error") {
      setSaveMessage(result.message);
      return;
    }
    setSaveMessage("Team member removed.");
    await refreshProfile();
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading account...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-semibold text-red-900">Could not load account</h1>
        <p className="mt-2 text-sm text-red-800">{error}</p>
        <p className="mt-3 text-sm text-red-700">
          Backend URL: <code className="rounded bg-red-100 px-1">{AUTH_API_ORIGIN}</code>
        </p>
      </div>
    );
  }

  if (!session || session.status !== "ok" || !session.data.authenticated || !session.data.user) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-950">Account</h1>
        <p className="mt-2 text-sm text-slate-600">Log in to view and manage your account.</p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Log in
        </Link>
      </div>
    );
  }

  if (!isFirmUser(session.data)) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-950">Account</h1>
        <p className="mt-2 text-sm text-slate-600">This view is focused on firm account management.</p>
        <Link
          href="/onboarding"
          className="mt-4 inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Open onboarding
        </Link>
      </div>
    );
  }

  const isAdmin = session.data.user.firmMember?.role === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            My account
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Signed in as {session.data.user.fullName} ({session.data.user.email})
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Firm details</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="font-medium text-slate-700">Firm name</dt>
              <dd className="text-slate-600">{profile?.firm.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Account manager</dt>
              <dd className="text-slate-600">
                {profile?.accountManager
                  ? `${profile.accountManager.fullName} (${profile.accountManager.email})`
                  : "Not set"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">My role</dt>
              <dd className="text-slate-600">{session.data.user.firmMember?.role}</dd>
            </div>
          </dl>
          <Link
            href="/dashboard/tasks"
            className="mt-5 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Open my tasks
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Firm account</h1>
        <p className="mt-2 text-sm text-slate-600">
          Signed in as {session.data.user.email}
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Overview</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="font-medium text-slate-700">Firm name</dt>
              <dd className="text-slate-600">{profile?.firm.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Account manager</dt>
              <dd className="text-slate-600">
                {profile?.accountManager
                  ? `${profile.accountManager.fullName} (${profile.accountManager.email})`
                  : "Not set"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Team size</dt>
              <dd className="text-slate-600">
                {profile?.team.length ?? 0}
                {profile?.subscription
                  ? profile.subscription.teamSeatLimit >= 0
                    ? ` / ${profile.subscription.teamSeatLimit} seats`
                    : " / unlimited seats"
                  : ""}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Update firm information</h2>
          <div className="mt-4 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Firm name"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="Contact email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="Website URL"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={industries}
              onChange={(e) => setIndustries(e.target.value)}
              placeholder="Industries (comma separated)"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="min-h-[100px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={saveFirmProfile}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Save changes
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Team members</h2>
        <p className="mt-1 text-sm text-slate-600">
          {profile?.team.length
            ? "Manage your current firm team."
            : "No team members yet. Add your team here."}
        </p>

        {profile?.team.length ? (
          <ul className="mt-4 space-y-2">
            {profile.team.map((member) => (
              <li key={member.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {member.fullName} · {member.role}
                    </p>
                    <p className="text-slate-600">{member.email}</p>
                    {member.title && <p className="text-slate-600">{member.title}</p>}
                  </div>
                  {session.data.user.firmMember?.id !== member.id && (
                    <button
                      type="button"
                      onClick={() => removeTeamMember(member.id)}
                      disabled={removingMemberId === member.id}
                      className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      {removingMemberId === member.id ? "Removing..." : "Remove"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <input
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            placeholder="Full name"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            placeholder="Email"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={memberTitle}
            onChange={(e) => setMemberTitle(e.target.value)}
            placeholder="Title (optional)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={memberRole}
            onChange={(e) => setMemberRole(e.target.value as "ADMIN" | "MEMBER")}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
          <input
            value={memberSpecialties}
            onChange={(e) => setMemberSpecialties(e.target.value)}
            placeholder="Specialties (comma separated)"
            className="md:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={addTeamMember}
          className="mt-3 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Add team member
        </button>
      </section>

      {saveMessage && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {saveMessage}
        </p>
      )}
    </div>
  );
}

