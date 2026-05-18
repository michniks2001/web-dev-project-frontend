import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import FirmViewTracker from "./FirmViewTracker";
import FirmServiceOfferCard from "@/app/_components/FirmServiceOfferCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AUTH_API_ORIGIN,
  findPublicFirm,
  type PublicFirmListItem,
} from "@/lib/backend-api";

async function loadFirmFromList(
  slugOrId: string,
): Promise<PublicFirmListItem | null> {
  const res = await fetch(
    `${AUTH_API_ORIGIN}/api/v1/firms?include=services`,
    { next: { revalidate: 300 } },
  );
  if (!res.ok) return null;
  const body = (await res.json()) as {
    success: boolean;
    data: { firms: PublicFirmListItem[] };
  };
  const firm = findPublicFirm(body.data?.firms ?? [], slugOrId);
  if (!firm) return null;
  if (firm.services) return firm;
  return firm;
}

async function loadFirm(slugOrId: string): Promise<PublicFirmListItem | null> {
  const detailRes = await fetch(
    `${AUTH_API_ORIGIN}/api/v1/firms/${encodeURIComponent(slugOrId)}`,
    { next: { revalidate: 300 } },
  );
  if (detailRes.ok) {
    const body = (await detailRes.json()) as {
      success: boolean;
      data: { firm: PublicFirmListItem };
    };
    if (body.data?.firm) return body.data.firm;
  }
  return loadFirmFromList(slugOrId);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const firm = await loadFirm(id);
  if (!firm) return { title: "Firm not found · Clarity" };
  return {
    title: `${firm.name} · Clarity`,
    description:
      firm.description ??
      `View ${firm.name}'s consulting services and request a quote on Clarity.`,
  };
}

export default async function FirmProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const firm = await loadFirm(id);
  if (!firm) notFound();

  const services = firm.services ?? [];
  const websiteDisplay = firm.websiteUrl
    ? firm.websiteUrl.replace(/^https?:\/\//, "")
    : null;
  const generalQuoteHref = `/inquiries/new?firm=${encodeURIComponent(firm.slug)}`;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <FirmViewTracker firmSlug={firm.slug} />

      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to marketplace
      </Link>

      {/* Firm header */}
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
              {firm.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{firm.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {firm.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {firm.location}
                  </span>
                )}
                {firm.isVerified && (
                  <span className="text-emerald-700">Verified firm</span>
                )}
              </div>
              {firm.industries.length > 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {firm.industries.join(" · ")}
                </p>
              )}
            </div>
          </div>
          <Button size="lg" asChild className="shrink-0">
            <Link href={generalQuoteHref}>Request general quote</Link>
          </Button>
        </div>

        {firm.description && (
          <p className="mt-6 max-w-3xl text-muted-foreground leading-relaxed">
            {firm.description}
          </p>
        )}

        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Service packages
            </p>
            <p className="mt-1 text-2xl font-semibold">{services.length}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Industries
            </p>
            <p className="mt-1 text-2xl font-semibold">{firm.industries.length}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {firm.isVerified ? "Verified" : "Listed"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">What they offer</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Active consulting packages you can request a quote for directly.
            </p>
          </div>

          {services.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {services.map((service) => (
                <FirmServiceOfferCard
                  key={service.id}
                  service={service}
                  firmSlug={firm.slug}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base">No packages listed yet</CardTitle>
                <CardDescription>
                  This firm hasn&apos;t published service packages on Clarity. You can
                  still send a general inquiry to discuss your project.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href={generalQuoteHref}>Request general quote</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">About {firm.name}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {firm.description ??
                "This firm has not added a detailed description yet."}
            </p>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {firm.websiteUrl && (
                <div>
                  <p className="font-medium">Website</p>
                  <a
                    href={firm.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-muted-foreground underline hover:text-foreground"
                  >
                    {websiteDisplay}
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
              <div>
                <p className="font-medium">Location</p>
                <p className="mt-0.5 text-muted-foreground">
                  {firm.location ?? "Not listed"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Work with {firm.name}</CardTitle>
              <CardDescription>
                Submit a structured inquiry with your scope, budget, and timeline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" asChild>
                <Link href={generalQuoteHref}>General inquiry</Link>
              </Button>
              {services.length > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  Or pick a specific service above
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
