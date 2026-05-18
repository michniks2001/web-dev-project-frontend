"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  confirmFirmVerification,
  type FirmVerificationStatus,
} from "@/lib/backend-api";

type ConfirmState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      firm: { id: string; name: string; slug: string };
      verification: FirmVerificationStatus;
    }
  | { status: "error"; message: string };

export default function VerifyFirmClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<ConfirmState>({ status: "idle" });
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setState({
        status: "error",
        message: "No verification token was provided in the URL.",
      });
      return;
    }
    if (requestedRef.current) return;
    requestedRef.current = true;
    setState({ status: "loading" });
    (async () => {
      const result = await confirmFirmVerification(token);
      if (result.status === "ok") {
        setState({
          status: "success",
          firm: result.firm,
          verification: result.verification,
        });
      } else {
        setState({ status: "error", message: result.message });
      }
    })();
  }, [token]);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Firm verification
        </h1>

        {state.status === "loading" && (
          <p className="mt-3 text-sm text-slate-600">
            Verifying your firm domain...
          </p>
        )}

        {state.status === "error" && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {state.message}
          </div>
        )}

        {state.status === "success" && (
          <div className="mt-4 space-y-3">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-medium">
                <span aria-hidden>✓ </span>
                {state.firm.name} is now verified on{" "}
                <span className="font-mono">
                  {state.verification.verifiedDomain}
                </span>
                .
              </p>
              <p className="mt-1 text-emerald-800/80">
                Your firm will show as verified in the public directory.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/firms/${state.firm.slug}`}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View public profile
              </Link>
              <Link
                href="/dashboard/profile"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Back to firm profile
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
