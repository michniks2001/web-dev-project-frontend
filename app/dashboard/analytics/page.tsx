"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchFirmAnalyticsPipeline,
  fetchFirmAnalyticsServices,
  fetchFirmAnalyticsSummary,
  fetchFirmAnalyticsTrends,
  type FirmAnalyticsPipelineData,
  type FirmAnalyticsServicesData,
  type FirmAnalyticsSummaryData,
  type FirmAnalyticsTrendsData,
} from "@/lib/backend-api";

function changeLabel(value: number): string {
  if (value > 0) return `+${value}%`;
  if (value < 0) return `${value}%`;
  return "0%";
}

function MonthlyBars({
  values,
  labels,
  color,
}: {
  values: number[];
  labels: string[];
  color: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-24 items-end gap-2">
      {values.map((value, index) => (
        <div key={`${labels[index]}-${index}`} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-16 w-full items-end">
            <div
              className={`w-full rounded-t ${color}`}
              style={{ height: `${Math.max(Math.round((value / max) * 64), 4)}px` }}
            />
          </div>
          <span className="text-[10px] text-slate-500">{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<FirmAnalyticsSummaryData | null>(null);
  const [trends, setTrends] = useState<FirmAnalyticsTrendsData | null>(null);
  const [services, setServices] = useState<FirmAnalyticsServicesData | null>(null);
  const [pipeline, setPipeline] = useState<FirmAnalyticsPipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [summaryData, trendsData, servicesData, pipelineData] = await Promise.all([
        fetchFirmAnalyticsSummary({ forceRefresh: true }),
        fetchFirmAnalyticsTrends({ forceRefresh: true }),
        fetchFirmAnalyticsServices({ forceRefresh: true }),
        fetchFirmAnalyticsPipeline({ forceRefresh: true }),
      ]);

      if (cancelled) return;
      if (!summaryData || !trendsData || !servicesData || !pipelineData) {
        setError("Could not load analytics yet. Make sure the backend is running and you are logged in as a firm user.");
      } else {
        setSummary(summaryData);
        setTrends(trendsData);
        setServices(servicesData);
        setPipeline(pipelineData);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const topServices = useMemo(
    () =>
      (services?.services ?? [])
        .slice()
        .sort((a, b) => b.views - a.views)
        .slice(0, 5),
    [services],
  );

  const trendLabels = (trends?.trends ?? []).map((entry) => entry.month.split(" ")[0]);
  const leadTrendValues = (trends?.trends ?? []).map((entry) => entry.leads);
  const viewTrendValues = (trends?.trends ?? []).map((entry) => entry.views);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">← Dashboard</Link>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">Views, leads, and pipeline performance for your firm.</p>
      </section>

      {loading && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Loading analytics...
        </section>
      )}

      {error && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </section>
      )}

      {!loading && !error && summary && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: "Total Views (30d)",
                value: summary.summary.totalViews.value.toLocaleString(),
                delta: changeLabel(summary.summary.totalViews.changePct),
              },
              {
                label: "Total Leads (30d)",
                value: summary.summary.totalLeads.value.toLocaleString(),
                delta: changeLabel(summary.summary.totalLeads.changePct),
              },
              {
                label: "Conversion Rate",
                value: `${summary.summary.quoteConversionRate.value.toFixed(1)}%`,
                delta: changeLabel(summary.summary.quoteConversionRate.changePct),
              },
              {
                label: "Avg Response Time",
                value: `${summary.summary.avgResponseTimeHours.value.toFixed(1)} hrs`,
                delta: changeLabel(summary.summary.avgResponseTimeHours.changePct),
              },
            ].map((kpi) => (
              <article key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{kpi.label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 md:text-2xl">{kpi.value}</p>
                <p className="mt-1 text-xs font-medium text-slate-600">{kpi.delta} vs last period</p>
              </article>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
              <p className="text-sm font-semibold text-slate-900">Monthly Leads</p>
              <p className="text-xs text-slate-500">Last 6 months</p>
              <div className="mt-4">
                <MonthlyBars values={leadTrendValues} labels={trendLabels} color="bg-slate-900" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
              <p className="text-sm font-semibold text-slate-900">Monthly Views</p>
              <p className="text-xs text-slate-500">Last 6 months</p>
              <div className="mt-4">
                <MonthlyBars values={viewTrendValues} labels={trendLabels} color="bg-slate-700" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
            <p className="text-sm font-semibold text-slate-900">Pipeline by Stage</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(pipeline?.pipeline ?? []).map((stage) => (
                <div key={stage.stage} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">{stage.stage}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{stage.count}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-sm font-semibold text-slate-900">Performance by Service</p>
              <p className="mt-0.5 text-xs text-slate-500">Views and leads per active service.</p>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100">
                <tr>
                  {["Service", "Category", "Views", "Leads", "Conversion"].map((heading) => (
                    <th
                      key={heading}
                      className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${heading === "Service" || heading === "Category" ? "text-left" : "text-right"}`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topServices.map((service) => {
                  const conversion = service.views > 0 ? (service.leads / service.views) * 100 : 0;
                  return (
                    <tr key={service.id}>
                      <td className="px-5 py-3 font-medium text-slate-900">{service.title}</td>
                      <td className="px-5 py-3 text-slate-600">{service.category ?? "General"}</td>
                      <td className="px-5 py-3 text-right text-slate-700">{service.views}</td>
                      <td className="px-5 py-3 text-right text-slate-700">{service.leads}</td>
                      <td className="px-5 py-3 text-right font-medium text-slate-900">
                        {conversion.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
                {topServices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-5 text-center text-sm text-slate-500">
                      No active services yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
