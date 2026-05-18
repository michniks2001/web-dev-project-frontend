"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchMyFirmVerification,
  requestMyFirmVerification,
  type FirmVerificationData,
} from "@/lib/backend-api";

export default function FirmProfilePage() {
  const [data, setData] = useState<FirmVerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [domainInput, setDomainInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);
  const [verifyAddress, setVerifyAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchMyFirmVerification();
      if (cancelled) return;
      if (!res) {
        setError("Could not load verification status. Make sure the backend is running.");
      } else {
        setData(res);
        setDomainInput(
          res.verification.verifiedDomain ??
            res.verification.pendingVerifiedDomain ??
            "",
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRequest() {
    setError(null);
    setVerificationLink(null);
    setSubmitting(true);
    const result = await requestMyFirmVerification(domainInput.trim());
    setSubmitting(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    setData((prev) =>
      prev ? { ...prev, verification: result.verification } : prev,
    );
    setVerificationLink(result.verificationLink);
    setVerifyAddress(result.verifyAddress);
  }

  async function copyLink() {
    if (!verificationLink) return;
    try {
      await navigator.clipboard.writeText(verificationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable in some browser contexts.
    }
  }

  const verification = data?.verification;

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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Firm profile
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Domain verification marks your firm as verified in the public directory.
            </p>
            {data && (
              <p className="mt-2 text-sm text-slate-600">
                {verification?.isVerified ? "Verified" : "Not verified"}
              </p>
            )}
          </div>
        </div>
      </section>

      {loading && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Loading...
        </section>
      )}

      {error && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </section>
      )}

      {!loading && data && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Domain verification
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Verify that you control the email domain of your firm.
              You&rsquo;ll receive a verification link that you can open from
              that email account to prove ownership.
            </p>
          </div>

          {verification?.isVerified && verification.verifiedDomain && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-medium">
                Your firm is verified on{" "}
                <span className="font-mono">{verification.verifiedDomain}</span>
                .
              </p>
              <p className="mt-1 text-emerald-800/80">
                You can request a new verification below to change the
                associated domain.
              </p>
            </div>
          )}

          {verification?.hasActiveRequest &&
            verification.pendingVerifiedDomain && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-medium">
                  Pending verification for{" "}
                  <span className="font-mono">
                    {verification.pendingVerifiedDomain}
                  </span>
                </p>
                {verification.tokenExpiresAt && (
                  <p className="mt-1 text-amber-800/80">
                    Open the verification link before{" "}
                    {new Date(verification.tokenExpiresAt).toLocaleString()} or
                    request a new one.
                  </p>
                )}
              </div>
            )}

          <div className="space-y-2">
            <label
              htmlFor="domain"
              className="block text-sm font-medium text-slate-700"
            >
              Domain
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="domain"
                type="text"
                placeholder="acme.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
              <button
                type="button"
                onClick={handleRequest}
                disabled={submitting || !domainInput.trim()}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {submitting ? "Sending..." : "Send verification link"}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              You must sign in with an email at this domain. Your current Auth0
              email&rsquo;s domain must match.
            </p>
          </div>

          {verificationLink && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              <p className="font-medium">Verification link generated</p>
              <p className="mt-1 text-sky-800/80">
                In production this link would be emailed to{" "}
                {verifyAddress ? (
                  <span className="font-mono">{verifyAddress}</span>
                ) : (
                  "your firm address"
                )}
                . For now you can open it directly:
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <a
                  href={verificationLink}
                  className="break-all rounded-md border border-sky-300 bg-white px-3 py-2 text-xs font-mono text-sky-900 hover:bg-sky-100"
                >
                  {verificationLink}
                </a>
                <button
                  type="button"
                  onClick={copyLink}
                  className="rounded-md border border-sky-300 bg-white px-3 py-2 text-xs font-medium text-sky-900 hover:bg-sky-100"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
