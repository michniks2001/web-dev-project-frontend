"use client";

import { useEffect, useMemo, useState } from "react";
import MarketplaceFirmCard from "@/app/_components/MarketplaceFirmCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchPublicFirms, type PublicFirmListItem } from "@/lib/backend-api";

export default function MarketplacePage() {
  const [firms, setFirms] = useState<PublicFirmListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("All");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublicFirms({ includeServices: true, cache: "no-store" }).then((data) => {
      if (cancelled) return;
      if (!data) {
        setError("Could not load firms. Make sure the backend is running.");
        setFirms([]);
      } else {
        setFirms(data.firms);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const industries = useMemo(() => {
    const values = new Set<string>();
    for (const firm of firms) {
      for (const i of firm.industries) values.add(i);
    }
    return ["All", ...Array.from(values).sort()];
  }, [firms]);

  const filtered = firms.filter((f) => {
    const q = search.toLowerCase();
    const matchSearch =
      search === "" ||
      f.name.toLowerCase().includes(q) ||
      (f.description ?? "").toLowerCase().includes(q) ||
      f.industries.some((i) => i.toLowerCase().includes(q));
    const matchIndustry =
      industry === "All" || f.industries.includes(industry);
    const matchVerified = !verifiedOnly || f.isVerified;
    return matchSearch && matchIndustry && matchVerified;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Marketplace</h1>
        <p className="max-w-2xl text-muted-foreground">
          Browse consulting firms, pick a service package from the dropdown, or
          request a general quote. No separate inquiry page in the menu — start here.
        </p>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-4 md:p-5">
        <Input
          placeholder="Search firms by name, industry, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          {industries.map((ind) => (
            <Button
              key={ind}
              type="button"
              size="sm"
              variant={industry === ind ? "default" : "outline"}
              onClick={() => setIndustry(ind)}
            >
              {ind}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={verifiedOnly ? "default" : "outline"}
            className="ml-auto"
            onClick={() => setVerifiedOnly((v) => !v)}
          >
            Verified only
          </Button>
        </div>
      </section>

      {loading && (
        <p className="text-sm text-muted-foreground">Loading firms…</p>
      )}
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {!loading && !error && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{filtered.length}</span>{" "}
          firms
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {filtered.map((firm) => (
          <MarketplaceFirmCard key={firm.id} firm={firm} />
        ))}
      </div>

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">No firms match your filters.</p>
          <Button
            type="button"
            variant="link"
            className="mt-2"
            onClick={() => {
              setSearch("");
              setIndustry("All");
              setVerifiedOnly(false);
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
