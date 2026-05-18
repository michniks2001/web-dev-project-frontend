"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  cancelMyFirmSubscription,
  createMyFirmBillingPortalSession,
  createMyFirmSubscriptionCheckout,
  fetchMyFirmSubscription,
  syncMyFirmSubscriptionFromStripe,
  type FirmSubscriptionData,
  type FirmSubscriptionPlanName,
} from "@/lib/backend-api";

function formatLimit(limit: number): string {
  return limit < 0 ? "Unlimited" : String(limit);
}

export default function SubscriptionPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<FirmSubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState<FirmSubscriptionPlanName | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stripeStatus = searchParams.get("stripe");
      if (stripeStatus === "cancel") {
        setError("Checkout was cancelled. No plan changes were applied.");
      }
      const syncResult = await syncMyFirmSubscriptionFromStripe();
      if (cancelled) return;
      if (syncResult.status === "ok") {
        setData(syncResult.data);
        setLoading(false);
        return;
      }
      if (stripeStatus === "success") {
        setError(syncResult.message);
      }
      const res = await fetchMyFirmSubscription({ forceRefresh: true });
      if (cancelled) return;
      if (!res) {
        setError("Could not load subscription data. Make sure the backend is running.");
      } else {
        setData(res);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const currentPlanIndex = useMemo(
    () => data?.plans.findIndex((plan) => plan.isCurrent) ?? -1,
    [data],
  );

  async function changePlan(plan: FirmSubscriptionPlanName) {
    setError(null);
    setSuccessMessage(null);
    setUpdatingPlan(plan);
    const result = await createMyFirmSubscriptionCheckout(plan);
    if (result.status === "error") {
      setError(result.message);
      setUpdatingPlan(null);
      return;
    }
    if (result.updated) {
      const syncResult = await syncMyFirmSubscriptionFromStripe();
      if (syncResult.status === "ok") {
        setData(syncResult.data);
        setSuccessMessage("Your plan was updated successfully.");
      } else {
        setError(syncResult.message);
      }
      setUpdatingPlan(null);
      return;
    }
    window.location.href = result.checkoutUrl;
  }

  async function handleCancelSubscription() {
    if (
      !window.confirm(
        "Cancel your subscription? You will keep access until the end of the current billing period.",
      )
    ) {
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setCancelling(true);
    const result = await cancelMyFirmSubscription();
    setCancelling(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    setData(result.data);
    setSuccessMessage(
      "Your subscription will cancel at the end of the current billing period.",
    );
  }

  async function openBillingPortal() {
    setOpeningPortal(true);
    const result = await createMyFirmBillingPortalSession();
    if (result.status === "ok") {
      window.location.href = result.url;
    } else {
      setError(result.message);
      setOpeningPortal(false);
    }
  }

  const billingDate = data?.subscription?.currentPeriodEnd
    ? new Date(data.subscription.currentPeriodEnd).toLocaleDateString()
    : "Not available";

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">← Dashboard</Link>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Subscription</h1>
            <p className="mt-1 text-sm text-slate-600">Plan limits, usage, and billing.</p>
          </div>
          {data && (
            <p className="text-sm text-slate-600">
              {data.plans.find((plan) => plan.isCurrent)?.label ?? "No active plan"}
              {data.subscription?.status && (
                <span className="text-slate-400"> · {data.subscription.status}</span>
              )}
            </p>
          )}
        </div>
      </section>

      {loading && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Loading subscription...
        </section>
      )}

      {error && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </section>
      )}

      {successMessage && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {successMessage}
        </section>
      )}

      {!loading && data && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 space-y-4">
            <p className="text-sm font-semibold text-slate-900">Current Usage</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Services Listed",
                  used: data.usage.services.used,
                  max:
                    data.usage.services.limit === null || data.usage.services.limit < 0
                      ? null
                      : data.usage.services.limit,
                },
                {
                  label: "Team Seats",
                  used: data.usage.seats.used,
                  max:
                    data.usage.seats.limit === null || data.usage.seats.limit < 0
                      ? null
                      : data.usage.seats.limit,
                },
                {
                  label: "Leads This Month",
                  used: data.usage.leadsThisMonth,
                  max: null,
                },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {item.used}
                    <span className="text-sm font-normal text-slate-400">
                      {item.max !== null ? ` / ${item.max}` : " / ∞"}
                    </span>
                  </p>
                  {item.max !== null && (
                    <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                      <div
                        className={`h-1.5 rounded-full transition-all ${item.max > 0 && item.used / item.max >= 0.8 ? "bg-amber-500" : "bg-slate-800"}`}
                        style={{ width: `${Math.min(item.max > 0 ? (item.used / item.max) * 100 : 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
            <p className="text-sm font-semibold text-slate-900">Billing</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="text-xs text-slate-500">Next billing date</p>
                <p className="mt-0.5 font-medium text-slate-900">{billingDate}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="text-xs text-slate-500">Stripe billing portal</p>
                <p className="mt-0.5 font-medium text-slate-900">
                  {data.provider.stripeConfigured ? "Available" : "Not configured"}
                </p>
              </div>
            </div>
            {data.subscription?.cancelAtPeriodEnd && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Your subscription is set to cancel on {billingDate}. You can keep using
                your plan until then, or manage billing in the Stripe portal.
              </p>
            )}
            {data.provider.stripeConfigured && data.subscription && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openBillingPortal}
                  disabled={openingPortal || cancelling}
                  className="inline-flex rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  {openingPortal ? "Opening..." : "Open Billing Portal"}
                </button>
                {data.subscription.status !== "CANCELLED" &&
                  !data.subscription.cancelAtPeriodEnd &&
                  data.subscription.stripeSubscriptionId && (
                    <button
                      type="button"
                      onClick={handleCancelSubscription}
                      disabled={cancelling || openingPortal}
                      className="inline-flex rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                    >
                      {cancelling ? "Cancelling..." : "Cancel subscription"}
                    </button>
                  )}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Available Plans</p>
            <div className="grid gap-4 md:grid-cols-4">
              {data.plans.map((plan, index) => {
                const hasSubscription = data.subscription !== null;
                const higherTier = hasSubscription && index > currentPlanIndex;
                const lowerTier = hasSubscription && index < currentPlanIndex;
                return (
                  <div
                    key={plan.name}
                    className={`flex flex-col rounded-xl border p-5 ${plan.isCurrent ? "border-slate-900 shadow-sm" : "border-slate-200 bg-white"}`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">{plan.label}</h3>
                    </div>
                    <p className="mb-1 text-xl font-semibold text-slate-900">{plan.priceLabel}</p>
                    <p className="mb-4 text-xs text-slate-500">
                      {formatLimit(plan.serviceLimit)} services · {formatLimit(plan.teamSeatLimit)} seats
                    </p>
                    <ul className="flex-1 space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>{feature}
                        </li>
                      ))}
                    </ul>
                    {!plan.isCurrent && (
                      <button
                        type="button"
                        disabled={updatingPlan !== null || cancelling}
                        onClick={() => changePlan(plan.name)}
                        className={`mt-5 w-full rounded-md border py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                          !hasSubscription || higherTier
                            ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-700"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {updatingPlan === plan.name
                          ? "Updating..."
                          : !hasSubscription
                            ? "Subscribe"
                            : higherTier
                              ? "Upgrade"
                              : lowerTier
                                ? "Downgrade"
                                : "Switch plan"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
