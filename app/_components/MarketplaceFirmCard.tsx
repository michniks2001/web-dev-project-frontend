"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  PublicFirmListItem,
  PublicServiceListItem,
} from "@/lib/backend-api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString()}`;
}

function formatPriceRange(min: number, max: number) {
  if (min === max) return formatPrice(min);
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

type Props = {
  firm: PublicFirmListItem;
};

export default function MarketplaceFirmCard({ firm }: Props) {
  const services = firm.services ?? [];
  const [selectedServiceId, setSelectedServiceId] = useState<string>("general");

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  const quoteHref = useMemo(() => {
    const params = new URLSearchParams({ firm: firm.slug });
    if (selectedServiceId !== "general") {
      params.set("service", selectedServiceId);
    }
    return `/inquiries/new?${params.toString()}`;
  }, [firm.slug, selectedServiceId]);

  return (
    <Card className="flex h-full flex-col border-border/80 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            {firm.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg leading-tight">{firm.name}</CardTitle>
            <CardDescription className="mt-1">
              {firm.location ?? "Location not listed"}
              {firm.isVerified && (
                <span className="text-emerald-700"> · Verified</span>
              )}
            </CardDescription>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {firm.description ?? "No description provided yet."}
        </p>
        {firm.industries.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {firm.industries.join(" · ")}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {services.length > 0 ? (
          <>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Service package</p>
              <Select
                value={selectedServiceId}
                onValueChange={setSelectedServiceId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General inquiry (no specific package)</SelectItem>
                  {services.map((service: PublicServiceListItem) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.title}
                      {service.category ? ` · ${service.category}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedService && (
              <ServicePreview service={selectedService} />
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No public packages listed. Request a general quote to discuss scope.
          </p>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 border-t border-border/60 bg-muted/30 pt-4">
        <Button variant="outline" className="flex-1" asChild>
          <Link href={`/firms/${firm.slug}`}>View profile</Link>
        </Button>
        <Button className="flex-1" asChild>
          <Link href={quoteHref}>Request quote</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function ServicePreview({ service }: { service: PublicServiceListItem }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
      <p className="font-medium text-foreground">{service.title}</p>
      {service.description && (
        <p className="mt-1 line-clamp-2 text-muted-foreground">{service.description}</p>
      )}
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Price</dt>
          <dd className="font-medium">{formatPriceRange(service.priceMin, service.priceMax)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Timeline</dt>
          <dd className="font-medium">{service.timeline ?? "Flexible"}</dd>
        </div>
      </dl>
    </div>
  );
}
