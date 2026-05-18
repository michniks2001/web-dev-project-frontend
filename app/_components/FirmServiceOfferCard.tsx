import Link from "next/link";
import type { PublicServiceListItem } from "@/lib/backend-api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString()}`;
}

function formatPriceRange(min: number, max: number) {
  if (min === max) return formatPrice(min);
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

type Props = {
  service: PublicServiceListItem;
  firmSlug: string;
};

export default function FirmServiceOfferCard({ service, firmSlug }: Props) {
  const quoteHref = `/inquiries/new?firm=${encodeURIComponent(firmSlug)}&service=${encodeURIComponent(service.id)}`;

  return (
    <Card className="flex h-full flex-col border-border/80">
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg leading-snug">{service.title}</CardTitle>
          {service.category && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {service.category}
            </span>
          )}
        </div>
        {service.description && (
          <CardDescription className="line-clamp-3 text-sm leading-relaxed">
            {service.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Price range</dt>
            <dd className="font-medium">
              {formatPriceRange(service.priceMin, service.priceMax)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Timeline</dt>
            <dd className="font-medium">{service.timeline ?? "Flexible"}</dd>
          </div>
        </dl>
        {service.tags.length > 0 && (
          <p className="text-xs text-muted-foreground">{service.tags.join(" · ")}</p>
        )}
      </CardContent>
      <CardFooter>
        <Button className="w-full" asChild>
          <Link href={quoteHref}>Request quote for this service</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
