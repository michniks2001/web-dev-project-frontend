"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AUTH_API_ORIGIN, getOnboardingMe } from "@/lib/backend-api";

type DebugState = {
  status: "loading" | "ready";
  host: string;
  apiOrigin: string;
  response:
    | { kind: "ok"; authenticated: boolean; role: string | null; firmRole: string | null }
    | { kind: "error"; message: string };
};

export default function AuthDebugPanel() {
  const params = useSearchParams();
  const enabled = params.get("authdebug") === "1";
  const [state, setState] = useState<DebugState | null>(() =>
    enabled
      ? {
          status: "loading",
          host: typeof window !== "undefined" ? window.location.host : "unknown",
          apiOrigin: AUTH_API_ORIGIN,
          response: { kind: "error", message: "Loading..." },
        }
      : null,
  );

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    getOnboardingMe().then((res) => {
      if (cancelled) return;
      if (res.status === "ok") {
        setState({
          status: "ready",
          host: typeof window !== "undefined" ? window.location.host : "unknown",
          apiOrigin: AUTH_API_ORIGIN,
          response: {
            kind: "ok",
            authenticated: Boolean(res.data.authenticated),
            role: res.data.user?.role ?? null,
            firmRole: res.data.user?.firmMember?.role ?? null,
          },
        });
        return;
      }
      setState({
        status: "ready",
        host: typeof window !== "undefined" ? window.location.host : "unknown",
        apiOrigin: AUTH_API_ORIGIN,
        response: { kind: "error", message: res.message },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const isDev = useMemo(() => process.env.NODE_ENV !== "production", []);
  if (!isDev || !enabled || !state) return null;

  return (
    <div className="fixed bottom-3 right-3 z-50 max-w-md rounded-lg border border-slate-300 bg-white/95 p-3 text-xs shadow-lg backdrop-blur">
      <p className="font-semibold text-slate-900">Auth Debug</p>
      <p className="mt-1 text-slate-700">host: {state.host}</p>
      <p className="text-slate-700">api: {state.apiOrigin}</p>
      {state.response.kind === "ok" ? (
        <p className="mt-1 text-slate-800">
          authenticated: <strong>{String(state.response.authenticated)}</strong>{" "}
          | role: <strong>{state.response.role ?? "null"}</strong> | firmRole:{" "}
          <strong>{state.response.firmRole ?? "null"}</strong>
        </p>
      ) : (
        <p className="mt-1 text-red-700">{state.response.message}</p>
      )}
      <p className="mt-1 text-slate-500">
        {state.status === "loading" ? "Checking..." : "Loaded"}
      </p>
    </div>
  );
}

