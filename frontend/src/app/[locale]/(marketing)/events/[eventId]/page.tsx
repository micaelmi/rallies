import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Calendar, MapPin, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageFrame } from "@/components/shared/page-frame";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { EventRecordView } from "@/components/events/events-marketplace-client";
import { getApiBaseUrl } from "@/lib/api/config";
import { cn } from "@/lib/utils";

type EventDetailPageProps = {
  params: Promise<{
    locale: string;
    eventId: string;
  }>;
};

export default async function EventDetailPage({
  params
}: EventDetailPageProps) {
  const { locale, eventId } = await params;
  const t = await getTranslations({ locale, namespace: "events" });

  const response = await fetch(
    `${getApiBaseUrl()}/events/${encodeURIComponent(eventId)}`,
    {
      headers: { "x-locale": locale },
      cache: "no-store"
    }
  ).catch(() => null);

  if (!response || response.status === 404 || !response.ok) {
    notFound();
  }

  const event = (await response
    .json()
    .catch(() => null)) as EventRecordView | null;
  if (!event) {
    notFound();
  }

  const locationParts = [event.city, event.state, event.country].filter(Boolean);

  return (
    <PageFrame className="py-10">
      <div className="space-y-6">
        <Link
          href="/events"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-2"
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("backToEvents")}</span>
        </Link>

        <Card className="space-y-4 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{t(`statuses.${event.status}`)}</Badge>
            {event.isBoosted && (
              <Badge variant="default" className="gap-1">
                <Sparkles className="w-3 h-3" />
                <span>{t("promotedBadge")}</span>
              </Badge>
            )}
          </div>

          <h1 className="font-bold text-foreground text-3xl tracking-tight">
            {event.title}
          </h1>

          <div className="space-y-2 text-muted-foreground text-sm">
            <p className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <span>
                {new Date(event.startAt).toLocaleString(locale)} —{" "}
                {new Date(event.endAt).toLocaleString(locale)}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span>
                {event.address} ({locationParts.join(", ")})
              </span>
            </p>
          </div>

          <p className="pt-2 text-foreground/90 text-sm leading-relaxed">
            {event.description}
          </p>
        </Card>
      </div>
    </PageFrame>
  );
}
