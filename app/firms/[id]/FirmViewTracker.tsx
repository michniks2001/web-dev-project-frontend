"use client";

import { useEffect } from "react";
import { trackAnalyticsView } from "@/lib/backend-api";

export default function FirmViewTracker({ firmSlug }: { firmSlug: string }) {
  useEffect(() => {
    void trackAnalyticsView({ firmSlug });
  }, [firmSlug]);

  return null;
}
