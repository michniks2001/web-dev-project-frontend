"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  companySizeToFormValue,
  fetchPublicFirms,
  fetchSession,
  findPublicFirm,
  isBuyerUser,
  isFirmUser,
  submitBuyerInquiry,
  type OnboardingMeData,
  type PublicFirmListItem,
} from "@/lib/backend-api";

const steps = ["Your Business", "Project Details", "Budget & Timeline", "Review"];

const categoryOptions = [
  "Strategy",
  "Operations",
  "Go-To-Market",
  "Finance",
  "Technology",
  "HR & People",
  "Other",
];
const commsOptions = [
  "async",
  "weekly calls",
  "daily check-ins",
  "email only",
  "flexible",
];
const timelineOptions = [
  "ASAP (within 2 weeks)",
  "1 month",
  "1–3 months",
  "3–6 months",
  "Flexible",
];

export default function NewInquiryPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [me, setMe] = useState<OnboardingMeData | null>(null);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submittedFirmName, setSubmittedFirmName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [profileLocked, setProfileLocked] = useState(false);
  const [firmSlug, setFirmSlug] = useState<string | null>(null);
  const [servicePackageId, setServicePackageId] = useState<string | null>(null);
  const [selectedServiceTitle, setSelectedServiceTitle] = useState<string | null>(
    null,
  );
  const [targetFirm, setTargetFirm] = useState<PublicFirmListItem | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [companySize, setCompanySize] = useState("");

  const [category, setCategory] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [problemDuration, setProblemDuration] = useState("");
  const [currentTools, setCurrentTools] = useState("");

  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [desiredTimeline, setDesiredTimeline] = useState("");
  const [preferredComms, setPreferredComms] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFirmSlug(params.get("firm"));
    setServicePackageId(params.get("service"));
  }, []);

  useEffect(() => {
    if (!firmSlug) {
      setTargetFirm(null);
      setSelectedServiceTitle(null);
      return;
    }
    let cancelled = false;
    fetchPublicFirms({ includeServices: true }).then((data) => {
      if (cancelled || !data) return;
      const firm = findPublicFirm(data.firms, firmSlug) ?? null;
      setTargetFirm(firm);
      if (firm && servicePackageId) {
        const service = firm.services?.find((s) => s.id === servicePackageId);
        if (service) {
          setSelectedServiceTitle(service.title);
          if (service.category) setCategory(service.category);
        } else {
          setSelectedServiceTitle(null);
        }
      } else {
        setSelectedServiceTitle(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [firmSlug, servicePackageId]);

  useEffect(() => {
    let cancelled = false;
    fetchSession().then((data) => {
      if (cancelled) return;
      setMe(data);
      if (data?.authenticated && data.user) {
        setContactName(data.user.fullName ?? "");
        setEmail(data.user.email ?? "");
        if (isBuyerUser(data) && data.user.buyer) {
          setCompanyName(data.user.buyer.companyName ?? "");
          setCompanySize(
            companySizeToFormValue(data.user.buyer.companySize),
          );
          setProfileLocked(true);
        }
      }
      setAuthLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const firmUser = isFirmUser(me);
  const buyerUser = isBuyerUser(me);

  const canProceed = () => {
    if (step === 0) return companyName.trim() && contactName.trim() && email.trim();
    if (step === 1) return category && problemDescription.trim() && desiredOutcome.trim();
    if (step === 2) return budgetMin && desiredTimeline;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    if (!me?.authenticated) {
      setSubmitError("Log in to submit an inquiry to a consulting firm.");
      return;
    }

    if (!firmSlug) {
      setSubmitError("Choose a firm from the directory before submitting.");
      return;
    }

    setSubmitting(true);
    const result = await submitBuyerInquiry({
      firmSlug,
      servicePackageId: servicePackageId ?? undefined,
      companyName: companyName.trim(),
      companySize: companySize ? Number(companySize) : undefined,
      contactName: contactName.trim(),
      category,
      problemDescription: problemDescription.trim(),
      desiredOutcome: desiredOutcome.trim(),
      problemDuration: problemDuration.trim() || undefined,
      currentTools: currentTools.trim() || undefined,
      budgetMin: Number(budgetMin),
      budgetMax: budgetMax ? Number(budgetMax) : undefined,
      desiredTimeline,
      preferredComms: preferredComms || undefined,
    });
    setSubmitting(false);

    if (result.status === "ok") {
      setSubmittedFirmName(result.data.firm.name);
      setSubmitted(true);
      return;
    }

    setSubmitError(result.message);
  };

  if (authLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading...
      </div>
    );
  }

  if (firmUser) {
    const firmName = me?.user?.firmMember?.firm?.name;
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-semibold text-slate-950">
            Quote requests are for buyers
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            You are signed in as a consulting firm
            {firmName ? ` (${firmName})` : ""}. Firm accounts manage incoming
            inquiries from the dashboard instead of submitting new quote requests.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Open dashboard
            </Link>
            <Link
              href="/dashboard/inquiries"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View inquiries
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <svg
              className="h-7 w-7 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">
            Inquiry Submitted!
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {submittedFirmName
              ? `Your intake has been sent to ${submittedFirmName}. They can review it in their dashboard.`
              : "Your inquiry has been submitted."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/my-requests"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              View my requests
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setSubmittedFirmName(null);
                setStep(0);
                if (!profileLocked) {
                  setCompanyName("");
                  setContactName("");
                  setEmail("");
                  setCompanySize("");
                }
                setCategory("");
                setProblemDescription("");
                setDesiredOutcome("");
                setProblemDuration("");
                setCurrentTools("");
                setBudgetMin("");
                setBudgetMax("");
                setDesiredTimeline("");
                setPreferredComms("");
              }}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Submit another inquiry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 md:space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          New Inquiry
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Fill out this structured intake so firms can respond with accurate
          quotes.
        </p>
        {targetFirm && (
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            Sending to{" "}
            <span className="font-semibold text-slate-900">{targetFirm.name}</span>
            {selectedServiceTitle && (
              <>
                {" "}
                · Service:{" "}
                <span className="font-semibold text-slate-900">
                  {selectedServiceTitle}
                </span>
              </>
            )}
          </p>
        )}
        {firmSlug && !targetFirm && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Firm not found.{" "}
            <Link href="/marketplace" className="font-medium underline">
              Browse marketplace
            </Link>{" "}
            to pick a valid profile.
          </p>
        )}
        {!firmSlug && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Link href="/marketplace" className="font-medium underline">
              Choose a firm
            </Link>{" "}
            first, then request a quote from their profile.
          </p>
        )}
        {buyerUser && profileLocked && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Your business details are prefilled from your buyer profile.
          </p>
        )}
        {me?.authenticated && !buyerUser && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Complete{" "}
            <Link href="/onboarding" className="font-medium underline">
              buyer onboarding
            </Link>{" "}
            to save your company details for future quote requests.
          </p>
        )}
        {!me?.authenticated && (
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <Link href="/login" className="font-medium text-slate-800 underline">
              Log in
            </Link>{" "}
            as a buyer to prefill your business information.
          </p>
        )}
      </section>

      <div className="flex items-start gap-0 px-1">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  i < step
                    ? "bg-emerald-500 text-white"
                    : i === step
                      ? "bg-slate-900 text-white"
                      : "border-2 border-slate-200 text-slate-400"
                }`}
              >
                {i < step ? (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-px flex-1 transition-colors ${i < step ? "bg-emerald-400" : "bg-slate-200"}`}
                />
              )}
            </div>
            <span
              className={`mt-1.5 text-center text-xs leading-tight ${i === step ? "font-medium text-slate-900" : "text-slate-400"}`}
            >
              {s}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 md:p-6">
        {step === 0 && (
          <>
            <h2 className="text-base font-semibold text-slate-900">
              Tell us about your business
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Company name *
                </label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  readOnly={profileLocked}
                  placeholder="Acme Inc."
                  className={`w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 ${profileLocked ? "bg-slate-50 text-slate-700" : ""}`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Your name *
                </label>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  readOnly={profileLocked}
                  placeholder="Jane Smith"
                  className={`w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 ${profileLocked ? "bg-slate-50 text-slate-700" : ""}`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={profileLocked}
                  placeholder="jane@acme.com"
                  className={`w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 ${profileLocked ? "bg-slate-50 text-slate-700" : ""}`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Company size
                </label>
                <select
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  disabled={profileLocked}
                  className={`w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 ${profileLocked ? "bg-slate-50 text-slate-700" : "bg-white"}`}
                >
                  <option value="">Select size</option>
                  <option value="5">1–10 employees</option>
                  <option value="25">11–50 employees</option>
                  <option value="100">51–200 employees</option>
                  <option value="500">200+ employees</option>
                </select>
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-base font-semibold text-slate-900">
              Describe your project
            </h2>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Service category *
              </label>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${category === cat ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Problem description *
              </label>
              <textarea
                rows={3}
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Describe the challenge you are facing..."
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Desired outcome *
              </label>
              <textarea
                rows={2}
                value={desiredOutcome}
                onChange={(e) => setDesiredOutcome(e.target.value)}
                placeholder="What does success look like?"
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  How long has this been an issue?
                </label>
                <input
                  value={problemDuration}
                  onChange={(e) => setProblemDuration(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Current tools / stack
                </label>
                <input
                  value={currentTools}
                  onChange={(e) => setCurrentTools(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-base font-semibold text-slate-900">
              Budget & timeline
            </h2>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Budget range (USD) *
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    placeholder="Min"
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-7 pr-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  />
                </div>
                <span className="text-sm text-slate-400">–</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="Max (optional)"
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-7 pr-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Desired start timeline *
              </label>
              <div className="flex flex-wrap gap-2">
                {timelineOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDesiredTimeline(opt)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${desiredTimeline === opt ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Preferred communication style
              </label>
              <div className="flex flex-wrap gap-2">
                {commsOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPreferredComms(opt)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${preferredComms === opt ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-base font-semibold text-slate-900">
              Review your inquiry
            </h2>
            <div className="space-y-3 rounded-lg bg-slate-50 p-4 text-sm">
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                <div>
                  <p className="text-xs text-slate-500">Company</p>
                  <p className="font-medium text-slate-800">{companyName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Contact</p>
                  <p className="font-medium text-slate-800">{contactName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="break-all font-medium text-slate-800">{email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Category</p>
                  <p className="font-medium text-slate-800">{category}</p>
                </div>
              </div>
              <hr className="border-slate-200" />
              <div>
                <p className="text-xs text-slate-500">Problem</p>
                <p className="text-slate-700">{problemDescription}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Desired outcome</p>
                <p className="text-slate-700">{desiredOutcome}</p>
              </div>
              <hr className="border-slate-200" />
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                <div>
                  <p className="text-xs text-slate-500">Budget</p>
                  <p className="font-medium text-slate-800">
                    ${budgetMin}
                    {budgetMax ? ` – $${budgetMax}` : "+"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Start</p>
                  <p className="font-medium text-slate-800">{desiredTimeline}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0 || submitting}
          className="rounded-md border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        <span className="text-xs text-slate-400">
          {step + 1} / {steps.length}
        </span>
        {step < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !canProceed() || !firmSlug || !targetFirm}
            className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Submitting…" : "Submit Inquiry"}
          </button>
        )}
      </div>
    </div>
  );
}
