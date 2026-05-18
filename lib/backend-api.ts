type ApiRequestOptions = {
  cache?: RequestCache;
};

let sessionCache:
  | { fetchedAt: number; data: OnboardingMeData | null }
  | null = null;
let sessionInFlight: Promise<OnboardingMeData | null> | null = null;
const SESSION_CACHE_TTL_MS = 5000;
const TASKS_CACHE_TTL_MS = 45000;
const INQUIRIES_CACHE_TTL_MS = 30000;
const PROFILE_CACHE_TTL_MS = 30000;
const SERVICES_CACHE_TTL_MS = 30000;
const DASHBOARD_SUMMARY_CACHE_TTL_MS = 30000;
const ANALYTICS_CACHE_TTL_MS = 30000;
const SUBSCRIPTION_CACHE_TTL_MS = 30000;
const PUBLIC_FIRMS_CACHE_TTL_MS = 60000;
const BUYER_INQUIRIES_CACHE_TTL_MS = 30000;
const readCache = new Map<string, { fetchedAt: number; data: unknown }>();
const readInFlight = new Map<string, Promise<unknown>>();

function clearReadCache(keys: string[]) {
  for (const key of keys) {
    readCache.delete(key);
    readInFlight.delete(key);
  }
}

function clearReadCacheByPrefix(prefixes: string[]) {
  for (const key of Array.from(readCache.keys())) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      readCache.delete(key);
    }
  }
  for (const key of Array.from(readInFlight.keys())) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      readInFlight.delete(key);
    }
  }
}

async function readWithCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T | null>,
  options?: { forceRefresh?: boolean },
): Promise<T | null> {
  const now = Date.now();
  const cached = readCache.get(key);
  if (!options?.forceRefresh && cached && now - cached.fetchedAt < ttlMs) {
    return cached.data as T | null;
  }

  const inFlight = readInFlight.get(key);
  if (!options?.forceRefresh && inFlight) {
    return (await inFlight) as T | null;
  }

  const request = (async () => {
    const data = await loader();
    if (data !== null) {
      readCache.set(key, { fetchedAt: Date.now(), data });
    }
    readInFlight.delete(key);
    return data;
  })();

  readInFlight.set(key, request as Promise<unknown>);
  return request;
}

/** Auth0 login/logout must hit the Express server directly (not proxied). */
export const AUTH_API_ORIGIN =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

/**
 * API calls from the browser use same-origin `/api/v1` (proxied to Express in
 * next.config.ts) so session cookies set at login are sent correctly.
 */
function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return normalized;
  }
  return `${AUTH_API_ORIGIN}${normalized}`;
}

export type HealthResponse = {
  status: string;
  timestamp: string;
};

export type OnboardingMeData = {
  authenticated: boolean;
  user: null | {
    id: string;
    auth0Id: string;
    email: string;
    fullName: string;
    role: string;
    buyer: null | {
      id: string;
      companyName: string | null;
      companySize: number | null;
    };
    firmMember: null | {
      id: string;
      role: string;
      title: string | null;
      firm: { id: string; name: string; slug: string };
    };
  };
};

export type OnboardingMeResponse =
  | { status: "ok"; data: OnboardingMeData }
  | { status: "error"; message: string };

export type OnboardingFirmResult = {
  onboarding: "firm";
  completed: boolean;
  firm: { id: string; name: string; slug: string };
  firmMemberId: string;
};

export type OnboardingBuyerResult = {
  onboarding: "buyer";
  completed: boolean;
  buyerId: string;
  buyer?: unknown;
};

export function isFirmUser(me: OnboardingMeData | null | undefined): boolean {
  if (!me?.authenticated || !me.user) return false;
  return me.user.role === "FIRM_USER" || Boolean(me.user.firmMember);
}

export function isFirmAdmin(me: OnboardingMeData | null | undefined): boolean {
  if (!isFirmUser(me)) return false;
  return me?.user?.firmMember?.role === "ADMIN";
}

export function isBuyerUser(me: OnboardingMeData | null | undefined): boolean {
  if (!me?.authenticated || !me.user) return false;
  return me.user.role === "BUYER" || Boolean(me.user.buyer);
}

export function hasCompletedOnboarding(
  me: OnboardingMeData | null | undefined,
): boolean {
  if (!me?.authenticated || !me.user) return false;
  return Boolean(me.user.buyer) || Boolean(me.user.firmMember);
}

export function companySizeToFormValue(
  size: number | null | undefined,
): string {
  if (size == null) return "";
  const options = ["5", "25", "100", "500"];
  if (options.includes(String(size))) return String(size);
  const numeric = Number(size);
  if (Number.isNaN(numeric)) return "";
  const buckets = [5, 25, 100, 500];
  const closest = buckets.reduce((prev, curr) =>
    Math.abs(curr - numeric) < Math.abs(prev - numeric) ? curr : prev,
  );
  return String(closest);
}

export async function getHealth(
  options: ApiRequestOptions = {},
): Promise<HealthResponse | null> {
  try {
    const res = await fetch(apiUrl("/api/v1/health"), {
      cache: options.cache ?? "no-store",
      credentials: "include",
    });
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}

/** Convenience for components that only need data or null. */
export async function fetchSession(): Promise<OnboardingMeData | null> {
  const now = Date.now();
  if (sessionCache && now - sessionCache.fetchedAt < SESSION_CACHE_TTL_MS) {
    return sessionCache.data;
  }
  if (sessionInFlight) return sessionInFlight;

  sessionInFlight = (async () => {
    const result = await getOnboardingMe();
    const data = result.status === "ok" ? result.data : null;
    sessionCache = { fetchedAt: Date.now(), data };
    sessionInFlight = null;
    return data;
  })();

  return sessionInFlight;
}

export async function getOnboardingMe(): Promise<OnboardingMeResponse> {
  try {
    const res = await fetch(apiUrl("/api/v1/onboarding/me"), {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) {
      if (res.status === 429) {
        return {
          status: "error",
          message:
            "Too many auth checks in a short time. Please wait a few seconds and refresh.",
        };
      }
      return {
        status: "error",
        message: `API returned ${res.status}. Is the backend running on ${AUTH_API_ORIGIN}?`,
      };
    }
    const payload = (await res.json()) as {
      success: boolean;
      data: OnboardingMeData;
    };
    return { status: "ok", data: payload.data };
  } catch {
    return {
      status: "error",
      message: `Could not reach the API at ${AUTH_API_ORIGIN}. Start the backend and try again.`,
    };
  }
}

export async function postOnboardFirm(payload: {
  name: string;
  industries: string[];
  contactEmail: string;
  location?: string;
  description?: string;
  websiteUrl?: string;
  specialties?: string[];
  teamMembers?: Array<{
    fullName: string;
    email: string;
    title?: string;
    specialties?: string[];
    role?: "ADMIN" | "MEMBER";
  }>;
}): Promise<OnboardingFirmResult | null> {
  try {
    const res = await fetch(apiUrl("/api/v1/onboarding/firm"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      success: boolean;
      data: OnboardingFirmResult;
    };
    clearReadCache(["firm-profile", "firm-services"]);
    clearReadCacheByPrefix(["firm-inquiries:", "firm-tasks:"]);
    return body.data;
  } catch {
    return null;
  }
}

export async function postOnboardBuyer(payload: {
  companyName?: string;
  companySize?: number;
}): Promise<OnboardingBuyerResult | null> {
  try {
    const res = await fetch(apiUrl("/api/v1/onboarding/buyer"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      success: boolean;
      data: OnboardingBuyerResult;
    };
    clearReadCacheByPrefix(["buyer-inquiries:"]);
    return body.data;
  } catch {
    return null;
  }
}

export type InquiryStatus =
  | "SUBMITTED"
  | "REVIEWING"
  | "QUOTED"
  | "ACCEPTED"
  | "CLOSED";

export type FirmInquiry = {
  id: string;
  status: InquiryStatus;
  submittedAt: string;
  company: string;
  contactName: string;
  contactEmail: string;
  project: string;
  category: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  desiredTimeline: string | null;
  assigneeId: string | null;
  assignee: string | null;
};

export type FirmInquiriesData = {
  firm: { id: string; name: string; slug: string };
  summary: {
    total: number;
    open: number;
    counts: Record<InquiryStatus, number>;
  };
  teamMembers?: Array<{ id: string; fullName: string; role: "ADMIN" | "MEMBER" }>;
  inquiries: FirmInquiry[];
};

export type FirmDashboardSummaryData = {
  firm: { id: string; name: string; slug: string };
  summary: {
    openInquiries: number;
    quotesSent: number;
    activeServices: number;
    teamMembers: number;
  };
};

export type FirmSubscriptionPlanName =
  | "FREELANCER"
  | "STUDIO"
  | "AGENCY"
  | "ENTERPRISE";

export type FirmSubscriptionStatus =
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED"
  | "TRIALING";

export type FirmSubscriptionData = {
  firm: { id: string; name: string; slug: string };
  subscription: null | {
    plan: FirmSubscriptionPlanName;
    status: FirmSubscriptionStatus;
    serviceLimit: number;
    teamSeatLimit: number;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    cancelAtPeriodEnd: boolean;
  };
  provider: {
    stripeConfigured: boolean;
    billingPortalUrl: string | null;
  };
  usage: {
    services: {
      limit: number | null;
      used: number;
      remaining: number | null;
      ratio: number | null;
    };
    seats: {
      limit: number | null;
      used: number;
      remaining: number | null;
      ratio: number | null;
    };
    leadsThisMonth: number;
  };
  plans: Array<{
    name: FirmSubscriptionPlanName;
    label: string;
    priceLabel: string;
    serviceLimit: number;
    teamSeatLimit: number;
    features: string[];
    isCurrent: boolean;
  }>;
};

export type AnalyticsMetric = {
  value: number;
  changePct: number;
};

export type FirmAnalyticsSummaryData = {
  firm: { id: string; name: string; slug: string };
  period: {
    currentStart: string;
    currentEnd: string;
    previousStart: string;
    previousEnd: string;
  };
  summary: {
    totalViews: AnalyticsMetric;
    totalLeads: AnalyticsMetric;
    avgResponseTimeHours: AnalyticsMetric;
    quoteConversionRate: AnalyticsMetric;
  };
};

export type FirmAnalyticsTrendsData = {
  firm: { id: string; name: string; slug: string };
  trends: Array<{ month: string; leads: number; views: number }>;
};

export type FirmAnalyticsServicesData = {
  firm: { id: string; name: string; slug: string };
  services: Array<{
    id: string;
    title: string;
    category: string | null;
    views: number;
    leads: number;
  }>;
};

export type FirmAnalyticsPipelineData = {
  firm: { id: string; name: string; slug: string };
  pipeline: Array<{ stage: InquiryStatus; count: number }>;
};

export type BuyerInquiry = {
  id: string;
  status: InquiryStatus;
  submittedAt: string;
  firm: { id: string; name: string; slug: string };
  serviceTitle: string | null;
  project: string;
  budgetMin: number | null;
  budgetMax: number | null;
  desiredTimeline: string | null;
};

export type BuyerInquiriesData = {
  summary: {
    total: number;
    active: number;
    counts: Record<InquiryStatus, number>;
  };
  inquiries: BuyerInquiry[];
};

export type SubmitBuyerInquiryPayload = {
  firmSlug?: string;
  firmId?: string;
  servicePackageId?: string;
  companyName?: string;
  companySize?: number;
  contactName?: string;
  category?: string;
  problemDescription: string;
  desiredOutcome: string;
  problemDuration?: string;
  currentTools?: string;
  budgetMin: number;
  budgetMax?: number;
  desiredTimeline: string;
  preferredComms?: string;
};

export type SubmitBuyerInquiryResult = {
  id: string;
  status: InquiryStatus;
  submittedAt: string;
  firm: { id: string; name: string; slug: string };
};

export type SubmitBuyerInquiryResponse =
  | { status: "ok"; data: SubmitBuyerInquiryResult }
  | { status: "error"; message: string };

export async function submitBuyerInquiry(
  payload: SubmitBuyerInquiryPayload,
): Promise<SubmitBuyerInquiryResponse> {
  try {
    const res = await fetch(apiUrl("/api/v1/buyers/me/inquiries"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as {
      success?: boolean;
      data?: SubmitBuyerInquiryResult;
      message?: string;
    };
    if (!res.ok) {
      return {
        status: "error",
        message: body.message ?? `Request failed (${res.status})`,
      };
    }
    if (!body.data) {
      return { status: "error", message: "Unexpected response from server" };
    }
    clearReadCacheByPrefix(["buyer-inquiries:"]);
    return { status: "ok", data: body.data };
  } catch {
    return {
      status: "error",
      message: "Could not reach the API. Is the backend running?",
    };
  }
}

export async function fetchBuyerInquiries(
  status?: InquiryStatus,
  options?: { forceRefresh?: boolean },
): Promise<BuyerInquiriesData | null> {
  const key = `buyer-inquiries:${status ?? "ALL"}`;
  return readWithCache(
    key,
    BUYER_INQUIRIES_CACHE_TTL_MS,
    async () => {
      try {
        const query = status ? `?status=${status}` : "";
        const res = await fetch(apiUrl(`/api/v1/buyers/me/inquiries${query}`), {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return null;
        const body = (await res.json()) as {
          success: boolean;
          data: BuyerInquiriesData;
        };
        return body.data;
      } catch {
        return null;
      }
    },
    options,
  );
}

export type PublicServiceListItem = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priceMin: number;
  priceMax: number;
  timeline: string | null;
  tags: string[];
};

export type PublicFirmListItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  industries: string[];
  location: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  isVerified: boolean;
  serviceCount: number;
  services?: PublicServiceListItem[];
};

export type PublicFirmsData = {
  firms: PublicFirmListItem[];
  meta: {
    cached: boolean;
    cachedAt: string | null;
    count: number;
  };
};

export async function fetchPublicFirms(options?: {
  refresh?: boolean;
  includeServices?: boolean;
  cache?: RequestCache;
  forceRefresh?: boolean;
}): Promise<PublicFirmsData | null> {
  const key = `public-firms:${options?.refresh ? "refresh" : "default"}:${options?.includeServices ? "services" : "basic"}`;
  return readWithCache(
    key,
    PUBLIC_FIRMS_CACHE_TTL_MS,
    async () => {
      try {
        const params = new URLSearchParams();
        if (options?.refresh) params.set("refresh", "true");
        if (options?.includeServices) params.set("include", "services");
        const query = params.toString() ? `?${params.toString()}` : "";
        const res = await fetch(apiUrl(`/api/v1/firms${query}`), {
          cache: options?.cache ?? "default",
          credentials: "include",
        });
        if (!res.ok) return null;
        const body = (await res.json()) as {
          success: boolean;
          data: PublicFirmsData;
        };
        return body.data;
      } catch {
        return null;
      }
    },
    { forceRefresh: options?.forceRefresh || options?.refresh },
  );
}

export function findPublicFirm(
  firms: PublicFirmListItem[],
  idOrSlug: string,
): PublicFirmListItem | undefined {
  return firms.find((f) => f.id === idOrSlug || f.slug === idOrSlug);
}

export async function fetchPublicFirm(
  slugOrId: string,
  options?: { cache?: RequestCache },
): Promise<PublicFirmListItem | null> {
  try {
    const res = await fetch(
      apiUrl(`/api/v1/firms/${encodeURIComponent(slugOrId)}`),
      {
        cache: options?.cache ?? "default",
        credentials: "include",
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      success: boolean;
      data: { firm: PublicFirmListItem };
    };
    return body.data?.firm ?? null;
  } catch {
    return null;
  }
}

export type FirmServicePackage = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priceMin: number;
  priceMax: number;
  timeline: string | null;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FirmServicesData = {
  firm: { id: string; name: string; slug: string };
  subscription: null | {
    plan: string;
    serviceLimit: number;
    servicesUsed: number;
  };
  services: FirmServicePackage[];
};

export type CreateFirmServicePayload = {
  title: string;
  description?: string;
  category?: string;
  priceMin: number;
  priceMax: number;
  timeline: string;
  tags?: string[];
};

export type UpdateFirmServicePayload = {
  title?: string;
  description?: string | null;
  category?: string | null;
  priceMin?: number;
  priceMax?: number;
  timeline?: string | null;
  tags?: string[];
};

export async function fetchFirmServices(options?: {
  forceRefresh?: boolean;
}): Promise<FirmServicesData | null> {
  return readWithCache(
    "firm-services",
    SERVICES_CACHE_TTL_MS,
    async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/firms/me/services"), {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return null;
        const body = (await res.json()) as { success: boolean; data: FirmServicesData };
        return body.data;
      } catch {
        return null;
      }
    },
    options,
  );
}

export async function createFirmService(
  payload: CreateFirmServicePayload,
): Promise<{ status: "ok"; data: FirmServicesData } | { status: "error"; message: string }> {
  try {
    const res = await fetch(apiUrl("/api/v1/firms/me/services"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as {
      success?: boolean;
      data?: {
        firm: FirmServicesData["firm"];
        subscription: FirmServicesData["subscription"];
        service: FirmServicePackage;
      };
      message?: string;
    };
    if (!res.ok || !body.data) {
      return {
        status: "error",
        message: body.message ?? `Request failed (${res.status})`,
      };
    }
    return {
      status: "ok",
      data: {
        firm: body.data.firm,
        subscription: body.data.subscription,
        services: [body.data.service],
      },
    };
  } catch {
    return {
      status: "error",
      message: "Could not reach the API. Is the backend running?",
    };
  } finally {
    clearReadCache(["firm-services"]);
    clearReadCache(["firm-dashboard-summary"]);
    clearReadCache(["firm-subscription"]);
  }
}

export async function updateFirmService(
  serviceId: string,
  payload: UpdateFirmServicePayload,
): Promise<{ status: "ok"; service: FirmServicePackage } | { status: "error"; message: string }> {
  try {
    const res = await fetch(apiUrl(`/api/v1/firms/me/services/${serviceId}`), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as {
      success?: boolean;
      data?: { service: FirmServicePackage };
      message?: string;
    };
    if (!res.ok || !body.data?.service) {
      return {
        status: "error",
        message: body.message ?? `Request failed (${res.status})`,
      };
    }
    return { status: "ok", service: body.data.service };
  } catch {
    return {
      status: "error",
      message: "Could not reach the API. Is the backend running?",
    };
  } finally {
    clearReadCache(["firm-services"]);
    clearReadCache(["firm-dashboard-summary"]);
    clearReadCache(["firm-subscription"]);
  }
}

export async function deactivateFirmService(
  serviceId: string,
): Promise<{ status: "ok"; service: FirmServicePackage } | { status: "error"; message: string }> {
  try {
    const res = await fetch(
      apiUrl(`/api/v1/firms/me/services/${serviceId}/deactivate`),
      {
        method: "PATCH",
        credentials: "include",
      },
    );
    const body = (await res.json()) as {
      success?: boolean;
      data?: { service: FirmServicePackage };
      message?: string;
    };
    if (!res.ok || !body.data?.service) {
      return {
        status: "error",
        message: body.message ?? `Request failed (${res.status})`,
      };
    }
    return { status: "ok", service: body.data.service };
  } catch {
    return {
      status: "error",
      message: "Could not reach the API. Is the backend running?",
    };
  } finally {
    clearReadCache(["firm-services"]);
    clearReadCache(["firm-dashboard-summary"]);
    clearReadCache(["firm-subscription"]);
  }
}

export async function fetchFirmInquiries(
  status?: InquiryStatus,
  options?: { forceRefresh?: boolean },
): Promise<FirmInquiriesData | null> {
  const key = `firm-inquiries:${status ?? "ALL"}`;
  return readWithCache(
    key,
    INQUIRIES_CACHE_TTL_MS,
    async () => {
      try {
        const query = status ? `?status=${status}` : "";
        const res = await fetch(apiUrl(`/api/v1/firms/me/inquiries${query}`), {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return null;
        const body = (await res.json()) as {
          success: boolean;
          data: FirmInquiriesData;
        };
        return body.data;
      } catch {
        return null;
      }
    },
    options,
  );
}

export async function fetchFirmDashboardSummary(options?: {
  forceRefresh?: boolean;
}): Promise<FirmDashboardSummaryData | null> {
  return readWithCache(
    "firm-dashboard-summary",
    DASHBOARD_SUMMARY_CACHE_TTL_MS,
    async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/firms/me/dashboard"), {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return null;
        const body = (await res.json()) as {
          success: boolean;
          data: FirmDashboardSummaryData;
        };
        return body.data;
      } catch {
        return null;
      }
    },
    options,
  );
}

export async function fetchMyFirmSubscription(options?: {
  forceRefresh?: boolean;
}): Promise<FirmSubscriptionData | null> {
  return readWithCache(
    "firm-subscription",
    SUBSCRIPTION_CACHE_TTL_MS,
    async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/firms/me/subscription"), {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return null;
        const body = (await res.json()) as {
          success: boolean;
          data: FirmSubscriptionData;
        };
        return body.data;
      } catch {
        return null;
      }
    },
    options,
  );
}

export async function updateMyFirmSubscriptionPlan(
  plan: FirmSubscriptionPlanName,
): Promise<{ status: "ok"; data: FirmSubscriptionData } | { status: "error"; message: string }> {
  try {
    const res = await fetch(apiUrl("/api/v1/firms/me/subscription/plan"), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ plan }),
    });
    const body = (await res.json()) as {
      success?: boolean;
      data?: FirmSubscriptionData;
      message?: string;
    };
    if (!res.ok || !body.data) {
      return {
        status: "error",
        message: body.message ?? `Request failed (${res.status})`,
      };
    }
    return { status: "ok", data: body.data };
  } catch {
    return {
      status: "error",
      message: "Could not reach the API. Is the backend running?",
    };
  } finally {
    clearReadCache(["firm-subscription"]);
    clearReadCache(["firm-services"]);
    clearReadCache(["firm-profile"]);
  }
}

export async function createMyFirmSubscriptionCheckout(
  plan: FirmSubscriptionPlanName,
): Promise<
  | { status: "ok"; checkoutUrl: string; updated: false }
  | { status: "ok"; updated: true }
  | { status: "error"; message: string }
> {
  try {
    const res = await fetch(apiUrl("/api/v1/firms/me/subscription/checkout"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ plan }),
    });
    const body = (await res.json()) as {
      success?: boolean;
      data?: { checkoutUrl?: string; updated?: boolean };
      message?: string;
    };
    if (!res.ok || !body.data) {
      return {
        status: "error",
        message: body.message ?? `Request failed (${res.status})`,
      };
    }
    if (body.data.updated) {
      return { status: "ok", updated: true };
    }
    if (!body.data.checkoutUrl) {
      return {
        status: "error",
        message: body.message ?? "Stripe did not return a checkout URL",
      };
    }
    return { status: "ok", checkoutUrl: body.data.checkoutUrl, updated: false };
  } catch {
    return {
      status: "error",
      message: "Could not reach the API. Is the backend running?",
    };
  } finally {
    clearReadCache(["firm-subscription"]);
    clearReadCache(["firm-services"]);
    clearReadCache(["firm-profile"]);
  }
}

export async function cancelMyFirmSubscription(): Promise<
  { status: "ok"; data: FirmSubscriptionData } | { status: "error"; message: string }
> {
  try {
    const res = await fetch(apiUrl("/api/v1/firms/me/subscription/cancel"), {
      method: "POST",
      credentials: "include",
    });
    const body = (await res.json()) as {
      success?: boolean;
      data?: FirmSubscriptionData;
      message?: string;
    };
    if (!res.ok || !body.data) {
      return {
        status: "error",
        message: body.message ?? `Request failed (${res.status})`,
      };
    }
    return { status: "ok", data: body.data };
  } catch {
    return {
      status: "error",
      message: "Could not reach the API. Is the backend running?",
    };
  } finally {
    clearReadCache(["firm-subscription"]);
    clearReadCache(["firm-services"]);
    clearReadCache(["firm-profile"]);
  }
}

export async function syncMyFirmSubscriptionFromStripe(): Promise<
  { status: "ok"; data: FirmSubscriptionData } | { status: "error"; message: string }
> {
  try {
    const res = await fetch(apiUrl("/api/v1/firms/me/subscription/sync"), {
      method: "POST",
      credentials: "include",
    });
    const body = (await res.json()) as {
      success?: boolean;
      data?: FirmSubscriptionData;
      message?: string;
    };
    if (!res.ok || !body.data) {
      return {
        status: "error",
        message: body.message ?? `Request failed (${res.status})`,
      };
    }
    return { status: "ok", data: body.data };
  } catch {
    return {
      status: "error",
      message: "Could not reach the API. Is the backend running?",
    };
  } finally {
    clearReadCache(["firm-subscription"]);
    clearReadCache(["firm-services"]);
    clearReadCache(["firm-profile"]);
  }
}

export async function createMyFirmBillingPortalSession(): Promise<
  { status: "ok"; url: string } | { status: "error"; message: string }
> {
  try {
    const res = await fetch(
      apiUrl("/api/v1/firms/me/subscription/billing-portal"),
      {
        method: "POST",
        credentials: "include",
      },
    );
    const body = (await res.json()) as {
      success?: boolean;
      data?: { url?: string };
      message?: string;
    };
    if (!res.ok || !body.data?.url) {
      return {
        status: "error",
        message: body.message ?? `Request failed (${res.status})`,
      };
    }
    return { status: "ok", url: body.data.url };
  } catch {
    return {
      status: "error",
      message: "Could not reach the API. Is the backend running?",
    };
  }
}

export async function fetchFirmAnalyticsSummary(options?: {
  forceRefresh?: boolean;
}): Promise<FirmAnalyticsSummaryData | null> {
  return readWithCache(
    "firm-analytics-summary",
    ANALYTICS_CACHE_TTL_MS,
    async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/analytics/summary"), {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return null;
        const body = (await res.json()) as {
          success: boolean;
          data: FirmAnalyticsSummaryData;
        };
        return body.data;
      } catch {
        return null;
      }
    },
    options,
  );
}

export async function fetchFirmAnalyticsTrends(options?: {
  forceRefresh?: boolean;
}): Promise<FirmAnalyticsTrendsData | null> {
  return readWithCache(
    "firm-analytics-trends",
    ANALYTICS_CACHE_TTL_MS,
    async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/analytics/trends"), {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return null;
        const body = (await res.json()) as {
          success: boolean;
          data: FirmAnalyticsTrendsData;
        };
        return body.data;
      } catch {
        return null;
      }
    },
    options,
  );
}

export async function fetchFirmAnalyticsServices(options?: {
  forceRefresh?: boolean;
}): Promise<FirmAnalyticsServicesData | null> {
  return readWithCache(
    "firm-analytics-services",
    ANALYTICS_CACHE_TTL_MS,
    async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/analytics/services"), {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return null;
        const body = (await res.json()) as {
          success: boolean;
          data: FirmAnalyticsServicesData;
        };
        return body.data;
      } catch {
        return null;
      }
    },
    options,
  );
}

export async function fetchFirmAnalyticsPipeline(options?: {
  forceRefresh?: boolean;
}): Promise<FirmAnalyticsPipelineData | null> {
  return readWithCache(
    "firm-analytics-pipeline",
    ANALYTICS_CACHE_TTL_MS,
    async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/analytics/pipeline"), {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return null;
        const body = (await res.json()) as {
          success: boolean;
          data: FirmAnalyticsPipelineData;
        };
        return body.data;
      } catch {
        return null;
      }
    },
    options,
  );
}

export async function trackAnalyticsView(payload: {
  firmId?: string;
  firmSlug?: string;
  servicePackageId?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(apiUrl("/api/v1/analytics/view"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAssignedFirmTasks(
  status?: InquiryStatus,
  options?: { forceRefresh?: boolean; maxAgeMs?: number },
): Promise<FirmInquiriesData | null> {
  const key = `firm-tasks:${status ?? "ALL"}`;
  const ttl = options?.maxAgeMs ?? TASKS_CACHE_TTL_MS;
  return readWithCache(
    key,
    ttl,
    async () => {
      try {
        const query = status ? `?status=${status}` : "";
        const res = await fetch(apiUrl(`/api/v1/firms/me/tasks${query}`), {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return null;
        const body = (await res.json()) as {
          success: boolean;
          data: FirmInquiriesData;
        };
        return body.data;
      } catch {
        return null;
      }
    },
    { forceRefresh: options?.forceRefresh },
  );
}

export type FirmTeamMember = {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  title: string | null;
  specialties: string[];
};

export type FirmProfileData = {
  firm: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    industries: string[];
    location: string | null;
    contactEmail: string;
    websiteUrl: string | null;
  };
  accountManager: null | {
    id: string;
    fullName: string;
    email: string;
    title: string | null;
  };
  team: FirmTeamMember[];
  subscription: null | {
    plan: string;
    teamSeatLimit: number;
    seatsUsed: number;
  };
};

export async function fetchMyFirmProfile(options?: {
  forceRefresh?: boolean;
}): Promise<FirmProfileData | null> {
  return readWithCache(
    "firm-profile",
    PROFILE_CACHE_TTL_MS,
    async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/firms/me/profile"), {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return null;
        const body = (await res.json()) as { success: boolean; data: FirmProfileData };
        return body.data;
      } catch {
        return null;
      }
    },
    options,
  );
}

export async function updateMyFirmProfile(payload: {
  name?: string;
  description?: string;
  industries?: string[];
  location?: string;
  contactEmail?: string;
  websiteUrl?: string;
}): Promise<{ status: "ok" } | { status: "error"; message: string }> {
  try {
    const res = await fetch(apiUrl("/api/v1/firms/me/profile"), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as { success?: boolean; message?: string };
    if (!res.ok) {
      return {
        status: "error",
        message: body.message ?? `Request failed (${res.status})`,
      };
    }
    return { status: "ok" };
  } catch {
    return {
      status: "error",
      message: "Could not reach the API. Is the backend running?",
    };
  } finally {
    clearReadCache(["firm-profile"]);
    clearReadCache(["firm-dashboard-summary"]);
    clearReadCache(["firm-subscription"]);
  }
}

export async function addMyFirmTeamMember(payload: {
  fullName: string;
  email: string;
  title?: string;
  role?: "ADMIN" | "MEMBER";
  specialties?: string[];
}): Promise<{ status: "ok" } | { status: "error"; message: string }> {
  try {
    const res = await fetch(apiUrl("/api/v1/firms/me/team"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as { success?: boolean; message?: string };
    if (!res.ok) {
      return {
        status: "error",
        message: body.message ?? `Request failed (${res.status})`,
      };
    }
    return { status: "ok" };
  } catch {
    return {
      status: "error",
      message: "Could not reach the API. Is the backend running?",
    };
  } finally {
    clearReadCache(["firm-profile"]);
    clearReadCacheByPrefix(["firm-inquiries:"]);
    clearReadCache(["firm-dashboard-summary"]);
    clearReadCache(["firm-subscription"]);
  }
}

export async function removeMyFirmTeamMember(
  memberId: string,
): Promise<{ status: "ok" } | { status: "error"; message: string }> {
  try {
    const res = await fetch(apiUrl(`/api/v1/firms/me/team/${memberId}`), {
      method: "DELETE",
      credentials: "include",
    });
    const body = (await res.json()) as { success?: boolean; message?: string };
    if (!res.ok) {
      return {
        status: "error",
        message: body.message ?? `Request failed (${res.status})`,
      };
    }
    return { status: "ok" };
  } catch {
    return {
      status: "error",
      message: "Could not reach the API. Is the backend running?",
    };
  } finally {
    clearReadCache(["firm-profile"]);
    clearReadCacheByPrefix(["firm-inquiries:"]);
    clearReadCache(["firm-dashboard-summary"]);
    clearReadCache(["firm-subscription"]);
  }
}

export async function updateFirmInquiryStatus(
  inquiryId: string,
  status: InquiryStatus,
): Promise<{ status: "ok" } | { status: "error"; message: string }> {
  try {
    const res = await fetch(apiUrl(`/api/v1/firms/me/inquiries/${inquiryId}/status`), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    const body = (await res.json()) as { success?: boolean; message?: string };
    if (!res.ok) {
      return {
        status: "error",
        message: body.message ?? `Request failed (${res.status})`,
      };
    }
    return { status: "ok" };
  } catch {
    return {
      status: "error",
      message: "Could not reach the API. Is the backend running?",
    };
  } finally {
    clearReadCacheByPrefix(["firm-inquiries:", "firm-tasks:"]);
    clearReadCache(["firm-dashboard-summary"]);
  }
}

export async function assignFirmInquiry(
  inquiryId: string,
  assigneeMemberId: string,
): Promise<
  | { status: "ok"; assigneeId: string; assignee: string }
  | { status: "error"; message: string }
> {
  try {
    const res = await fetch(apiUrl(`/api/v1/firms/me/inquiries/${inquiryId}/assign`), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ assigneeMemberId }),
    });
    const body = (await res.json()) as {
      success?: boolean;
      data?: { assigneeId: string; assignee: string };
      message?: string;
    };
    if (!res.ok || !body.data) {
      return {
        status: "error",
        message: body.message ?? `Request failed (${res.status})`,
      };
    }
    return { status: "ok", assigneeId: body.data.assigneeId, assignee: body.data.assignee };
  } catch {
    return {
      status: "error",
      message: "Could not reach the API. Is the backend running?",
    };
  } finally {
    clearReadCacheByPrefix(["firm-inquiries:", "firm-tasks:"]);
    clearReadCache(["firm-dashboard-summary"]);
  }
}

export async function updateAssignedTaskStatus(
  inquiryId: string,
  status: InquiryStatus,
): Promise<{ status: "ok" } | { status: "error"; message: string }> {
  try {
    const res = await fetch(apiUrl(`/api/v1/firms/me/tasks/${inquiryId}/status`), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    const body = (await res.json()) as { success?: boolean; message?: string };
    if (!res.ok) {
      return {
        status: "error",
        message: body.message ?? `Request failed (${res.status})`,
      };
    }
    return { status: "ok" };
  } catch {
    return {
      status: "error",
      message: "Could not reach the API. Is the backend running?",
    };
  } finally {
    clearReadCacheByPrefix(["firm-inquiries:", "firm-tasks:"]);
    clearReadCache(["firm-dashboard-summary"]);
  }
}

export type FirmVerificationStatus = {
  isVerified: boolean;
  verifiedDomain: string | null;
  pendingVerifiedDomain: string | null;
  hasActiveRequest: boolean;
  tokenExpiresAt: string | null;
};

export type FirmVerificationData = {
  firm: { id: string; name: string; slug: string };
  verification: FirmVerificationStatus;
};

export async function fetchMyFirmVerification(): Promise<FirmVerificationData | null> {
  try {
    const res = await fetch(apiUrl("/api/v1/firms/me/verification"), {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      success: boolean;
      data: FirmVerificationData;
    };
    return body.data;
  } catch {
    return null;
  }
}

export async function requestMyFirmVerification(
  domain: string,
): Promise<
  | {
      status: "ok";
      verification: FirmVerificationStatus;
      verificationLink: string;
      verifyAddress: string;
    }
  | { status: "error"; message: string }
> {
  try {
    const res = await fetch(apiUrl("/api/v1/firms/me/verification/request"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ domain }),
    });
    const body = (await res.json()) as {
      success?: boolean;
      data?: {
        verification: FirmVerificationStatus;
        verificationLink: string;
        verifyAddress: string;
      };
      message?: string;
    };
    if (!res.ok || !body.data) {
      return {
        status: "error",
        message: body.message ?? `Request failed (${res.status})`,
      };
    }
    return {
      status: "ok",
      verification: body.data.verification,
      verificationLink: body.data.verificationLink,
      verifyAddress: body.data.verifyAddress,
    };
  } catch {
    return {
      status: "error",
      message: "Could not reach the API. Is the backend running?",
    };
  }
}

export async function confirmFirmVerification(
  token: string,
): Promise<
  | {
      status: "ok";
      firm: { id: string; name: string; slug: string };
      verification: FirmVerificationStatus;
    }
  | { status: "error"; message: string }
> {
  try {
    const res = await fetch(apiUrl("/api/v1/firms/verification/confirm"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    });
    const body = (await res.json()) as {
      success?: boolean;
      data?: {
        firm: { id: string; name: string; slug: string };
        verification: FirmVerificationStatus;
      };
      message?: string;
    };
    if (!res.ok || !body.data) {
      return {
        status: "error",
        message: body.message ?? `Request failed (${res.status})`,
      };
    }
    return {
      status: "ok",
      firm: body.data.firm,
      verification: body.data.verification,
    };
  } catch {
    return {
      status: "error",
      message: "Could not reach the API. Is the backend running?",
    };
  }
}
