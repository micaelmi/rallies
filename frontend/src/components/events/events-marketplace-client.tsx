"use client";

import React, { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar, MapPin, Plus, Search, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getApiBaseUrl } from "@/lib/api/config";
import { cn } from "@/lib/utils";

export type EventRecordView = {
  id: string;
  clubId: string | null;
  title: string;
  description: string;
  imageUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  address: string;
  mapsUrl: string | null;
  startAt: string;
  endAt: string;
  registrationUrl: string | null;
  createdById: string;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "ARCHIVED";
  isBoosted: boolean;
  boostedUntil: string | null;
};

type EventsMarketplaceClientProps = {
  initialEvents: EventRecordView[];
};

const formatDateShort = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });

export const EventsMarketplaceClient: React.FC<
  EventsMarketplaceClientProps
> = ({ initialEvents }) => {
  const t = useTranslations("events");

  const [events, setEvents] = useState<EventRecordView[]>(initialEvents);
  const [locationFilter, setLocationFilter] = useState("");
  const [boostedOnly, setBoostedOnly] = useState(false);
  const [hasActiveFilter, setHasActiveFilter] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const runSearch = useCallback(
    async (nextLocation: string, nextBoostedOnly: boolean) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (nextLocation.trim()) params.set("location", nextLocation.trim());
        if (nextBoostedOnly) params.set("boostedOnly", "true");

        const query = params.toString();
        const res = await fetch(
          `${getApiBaseUrl()}/events${query ? `?${query}` : ""}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;

        const data = (await res.json()) as { items: EventRecordView[] };
        setEvents(data.items);
        setHasActiveFilter(Boolean(nextLocation.trim() || nextBoostedOnly));
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(locationFilter, boostedOnly);
  };

  const handleClear = async () => {
    setLocationFilter("");
    setBoostedOnly(false);
    await runSearch("", false);
  };

  return (
    <div className="space-y-8">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <p className="font-semibold text-primary text-xs uppercase tracking-[0.2em]">
              {t("eyebrow")}
            </p>
            <h1 className="mt-2 font-bold text-foreground text-3xl tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              {t("description")}
            </p>
          </div>
          <Link
            href="/events/create"
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <Plus className="w-4 h-4" />
            <span>{t("createCta")}</span>
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap items-center gap-3 mt-6"
        >
          <div className="flex-1 min-w-[220px]">
            <Input
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder={t("filterByCity")}
            />
          </div>
          <label className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={boostedOnly}
              onChange={(e) => setBoostedOnly(e.target.checked)}
              className="accent-primary"
            />
            <span>{t("promotedOnly")}</span>
          </label>
          <Button type="submit" disabled={isLoading} className="gap-2">
            <Search className="w-4 h-4" />
            <span>{t("searchButton")}</span>
          </Button>
          {hasActiveFilter && (
            <Button type="button" variant="ghost" onClick={handleClear}>
              {t("clearFilters")}
            </Button>
          )}
        </form>
      </Card>

      {events.length === 0 ? (
        <Card className="p-6 text-muted-foreground text-sm">
          {t("emptyState")}
        </Card>
      ) : (
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const locationParts = [
              event.city,
              event.state,
              event.country
            ].filter(Boolean);

            return (
              <Card
                key={event.id}
                className={cn(
                  "flex flex-col justify-between p-6",
                  event.isBoosted
                    ? "border-primary/60 bg-primary/5"
                    : "border-border"
                )}
              >
                <div>
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <Badge variant="secondary">
                      {t(`statuses.${event.status}`)}
                    </Badge>
                    {event.isBoosted && (
                      <Badge variant="default" className="gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>{t("promotedBadge")}</span>
                      </Badge>
                    )}
                  </div>

                  <h2 className="mt-4 font-bold text-foreground text-xl">
                    {event.title}
                  </h2>

                  <p className="flex items-center gap-1.5 mt-2 text-muted-foreground text-xs">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {formatDateShort(event.startAt)} —{" "}
                      {formatDateShort(event.endAt)}
                    </span>
                  </p>

                  <p className="flex items-center gap-1.5 mt-1 text-muted-foreground text-xs">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{locationParts.join(", ")}</span>
                  </p>

                  <p className="mt-3 text-muted-foreground text-sm line-clamp-3">
                    {event.description}
                  </p>
                </div>

                <Link
                  href={`/events/${event.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "mt-6 w-full"
                  )}
                >
                  {t("viewEvent")}
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
