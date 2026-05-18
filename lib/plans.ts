/** Mirrors backend `src/config/plans.ts` for public marketing pages. */
export const FIRM_PLANS = [
  {
    name: "FREELANCER",
    label: "Freelancer",
    priceLabel: "$49/mo",
    serviceLimit: 3,
    teamSeatLimit: 1,
    features: [
      "Listed on Clarity",
      "Up to 3 service packages",
      "Basic lead inbox",
      "Email support",
    ],
  },
  {
    name: "STUDIO",
    label: "Studio",
    priceLabel: "$149/mo",
    serviceLimit: 5,
    teamSeatLimit: 5,
    features: [
      "Everything in Freelancer",
      "Up to 5 service packages",
      "Up to 5 team seats",
      "Lead pipeline tools",
      "Profile customization",
    ],
  },
  {
    name: "AGENCY",
    label: "Agency",
    priceLabel: "$299/mo",
    serviceLimit: 10,
    teamSeatLimit: 10,
    features: [
      "Everything in Studio",
      "Up to 10 service packages",
      "Up to 10 team seats",
      "Lead export (CSV)",
      "Advanced analytics access",
    ],
  },
  {
    name: "ENTERPRISE",
    label: "Enterprise",
    priceLabel: "Custom",
    serviceLimit: null,
    teamSeatLimit: null,
    features: [
      "Everything in Agency",
      "Unlimited services and seats",
      "Priority support",
      "Dedicated account manager",
    ],
  },
] as const;

export function formatPlanLimit(limit: number | null) {
  if (limit === null || limit < 0) return "Unlimited";
  return String(limit);
}
