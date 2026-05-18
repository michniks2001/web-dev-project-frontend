import { Suspense } from "react";
import VerifyFirmClient from "./verify-firm-client";

export default function VerifyFirmPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading verification...
        </div>
      }
    >
      <VerifyFirmClient />
    </Suspense>
  );
}
