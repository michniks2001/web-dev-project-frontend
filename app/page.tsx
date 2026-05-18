import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Layers,
  MessageSquareQuote,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FIRM_PLANS, formatPlanLimit } from "@/lib/plans";

const audiences = [
  {
    icon: Building2,
    title: "For businesses",
    description:
      "Compare consulting firms, choose a service package or send a general brief, and receive structured quotes without endless email threads.",
    cta: { href: "/marketplace", label: "Browse marketplace" },
  },
  {
    icon: Users,
    title: "For consulting firms",
    description:
      "Publish a storefront, list service packages, manage inbound leads, assign work to your team, and track quotes in one pipeline.",
    cta: { href: "/onboarding", label: "List your firm" },
  },
];

const offerings = [
  {
    icon: Layers,
    title: "Service storefronts",
    description: "Firms list packages with price ranges, timelines, and categories buyers can compare side by side.",
  },
  {
    icon: MessageSquareQuote,
    title: "Structured inquiries",
    description: "Buyers submit scope, budget, and timeline once — firms respond with quotes instead of chasing details.",
  },
  {
    icon: CheckCircle2,
    title: "Lead pipeline",
    description: "Firms move requests from submitted to quoted to accepted, with team assignment and analytics built in.",
  },
];

export default function Home() {
  return (
    <div className="-mx-4 -mt-8 md:-mx-6">
      {/* Hero */}
      <section className="border-b border-border/60 bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:px-6 md:py-24">
          <div className="space-y-6">
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Consulting marketplace
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl md:leading-[1.1]">
              Find consultants. Request quotes. Close deals faster.
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              Clarity is a B2B marketplace where businesses discover consulting firms,
              pick services, and submit clear quote requests — while firms run their
              storefront and pipeline in one place.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/marketplace">
                  Shop firms & services
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/onboarding">I&apos;m a consulting firm</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background p-8 shadow-sm">
            <ol className="space-y-5 text-sm">
              {[
                "Browse firms and optional service packages on the marketplace.",
                "Request a quote for a specific service or a general inquiry.",
                "Firms review, quote, and manage the deal in their dashboard.",
              ].map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="pt-1 text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* What it is */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            What Clarity is
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            A minimal storefront and intake layer for consulting engagements. Buyers
            get transparency on who offers what; firms get qualified leads with
            context up front — not scattered DMs and PDFs.
          </p>
        </div>
      </section>

      <Separator className="mx-auto max-w-6xl" />

      {/* Who it's for */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Who it&apos;s for
        </h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Two sides of the same workflow — discovery for buyers, operations for firms.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {audiences.map((item) => (
            <Card key={item.title} className="border-border/80">
              <CardHeader>
                <item.icon className="mb-2 size-8 text-primary" />
                <CardTitle>{item.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {item.description}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="outline" asChild>
                  <Link href={item.cta.href}>{item.cta.label}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* What it offers */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            What it offers
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {offerings.map((item) => (
              <div key={item.title} className="space-y-3">
                <item.icon className="size-7 text-primary" />
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Firm subscription plans */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Plans for consulting firms
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Subscription tiers control how many service packages and team seats your
              firm can use on Clarity.
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link href="/dashboard/subscription">Firm billing dashboard</Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FIRM_PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={`flex flex-col ${plan.name === "STUDIO" ? "border-primary shadow-md" : ""}`}
            >
              <CardHeader>
                <CardTitle className="text-lg">{plan.label}</CardTitle>
                <p className="text-2xl font-semibold">{plan.priceLabel}</p>
                <CardDescription>
                  {formatPlanLimit(plan.serviceLimit)} services ·{" "}
                  {formatPlanLimit(plan.teamSeatLimit)} seats
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={plan.name === "STUDIO" ? "default" : "outline"} asChild>
                  <Link href="/onboarding">Get started</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <h2 className="text-2xl font-semibold">Ready to request a quote?</h2>
            <p className="mt-2 max-w-lg text-primary-foreground/85">
              Pick a firm, choose a service from the dropdown, or send a general inquiry —
              all from the marketplace.
            </p>
          </div>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/marketplace">Go to marketplace</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
