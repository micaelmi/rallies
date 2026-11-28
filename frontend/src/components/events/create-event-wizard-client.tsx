"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle2, Coins, Rocket, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useOptionalAuthToken } from "@/components/shared/client-auth-token";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { dispatchWalletUpdated } from "@/components/wallet/wallet-balance-badge";
import { getApiBaseUrl } from "@/lib/api/config";
import { cn } from "@/lib/utils";
import type { EventRecordView } from "./events-marketplace-client";

export const CreateEventWizardClient: React.FC = () => {
  const t = useTranslations("events");
  const getToken = useOptionalAuthToken();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("Brazil");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("2026-12-10T09:00");
  const [endDate, setEndDate] = useState("2026-12-11T18:00");

  const [draftEvent, setDraftEvent] = useState<EventRecordView | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const syncWalletHeader = async (token: string | null) => {
    const res = await fetch(`${getApiBaseUrl()}/wallet/balance`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      cache: "no-store"
    }).catch(() => null);
    if (res?.ok) {
      const data = (await res.json()) as { balance: number };
      dispatchWalletUpdated(data.balance);
    }
  };

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title,
          description,
          city,
          ...(state.trim() ? { state: state.trim() } : {}),
          country,
          address,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString()
        })
      });

      if (!response.ok) {
        setErrorMessage(t("wizardError"));
        return;
      }

      const created = (await response.json()) as EventRecordView;
      setDraftEvent(created);
      setStatusMessage(t("draftSaved"));
    } catch {
      setErrorMessage(t("wizardError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!draftEvent) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const token = await getToken();
      const res = await fetch(
        `${getApiBaseUrl()}/events/${draftEvent.id}/publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ idempotencyKey: crypto.randomUUID() })
        }
      );

      if (!res.ok) {
        setErrorMessage(t("wizardError"));
        return;
      }

      const updated = (await res.json()) as EventRecordView;
      setDraftEvent(updated);
      setStatusMessage(t("publishedSuccess"));
      await syncWalletHeader(token);
    } catch {
      setErrorMessage(t("wizardError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBoost = async () => {
    if (!draftEvent) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const token = await getToken();
      const res = await fetch(
        `${getApiBaseUrl()}/events/${draftEvent.id}/boost`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            durationDays: 7,
            idempotencyKey: crypto.randomUUID()
          })
        }
      );

      if (!res.ok) {
        setErrorMessage(t("wizardError"));
        return;
      }

      const updated = (await res.json()) as EventRecordView;
      setDraftEvent(updated);
      setStatusMessage(t("boostedSuccess"));
      await syncWalletHeader(token);
    } catch {
      setErrorMessage(t("wizardError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/events"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2")}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t("backToEvents")}</span>
      </Link>

      <Card className="p-6 sm:p-8">
        <p className="font-semibold text-primary text-xs uppercase tracking-[0.2em]">
          {t("createEyebrow")}
        </p>
        <h1 className="mt-2 font-bold text-foreground text-3xl tracking-tight">
          {t("createTitle")}
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          {t("createDescription")}
        </p>

        <div className="flex flex-wrap gap-3 mt-4">
          <Badge variant="secondary" className="gap-1.5">
            <Coins className="w-3.5 h-3.5 text-primary" />
            <span>{t("publishCost")}</span>
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>{t("boostCost")}</span>
          </Badge>
        </div>
      </Card>

      {!draftEvent ? (
        <Card className="p-6 sm:p-8">
          <form onSubmit={handleCreateDraft} className="space-y-4">
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-medium text-sm">{t("titleLabel")}</label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-sm">
                  {t("countryLabel")}
                </label>
                <Input
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder={t("countryPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-sm">{t("cityLabel")}</label>
                <Input
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t("cityPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-sm">{t("stateLabel")}</label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder={t("statePlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-sm">
                  {t("startDateLabel")}
                </label>
                <Input
                  required
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-sm">
                  {t("endDateLabel")}
                </label>
                <Input
                  required
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-sm">{t("addressLabel")}</label>
              <Input
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("addressPlaceholder")}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-sm">
                {t("descriptionLabel")}
              </label>
              <Input
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
              />
            </div>

            {errorMessage && (
              <p className="text-destructive text-sm">{errorMessage}</p>
            )}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("savingDraft") : t("saveDraft")}
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="space-y-5 p-6 sm:p-8">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h2 className="font-bold text-foreground text-2xl">
              {draftEvent.title}
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {t(`statuses.${draftEvent.status}`)}
              </Badge>
              {draftEvent.isBoosted && (
                <Badge variant="default" className="gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>{t("promotedBadge")}</span>
                </Badge>
              )}
            </div>
          </div>

          <p className="text-muted-foreground text-sm">
            {draftEvent.address} —{" "}
            {[draftEvent.city, draftEvent.state, draftEvent.country]
              .filter(Boolean)
              .join(", ")}
          </p>
          <p className="text-foreground/90 text-sm">{draftEvent.description}</p>

          {statusMessage && (
            <div className="flex items-center gap-2 bg-primary/10 p-3 border border-primary/20 rounded-lg text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <p className="text-destructive text-sm">{errorMessage}</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {draftEvent.status === "DRAFT" && (
              <Button
                onClick={handlePublish}
                disabled={isSubmitting}
                className="gap-2"
              >
                <Rocket className="w-4 h-4" />
                <span>
                  {isSubmitting ? t("publishing") : t("publishButton")}
                </span>
              </Button>
            )}

            {draftEvent.status === "PUBLISHED" && !draftEvent.isBoosted && (
              <Button
                onClick={handleBoost}
                disabled={isSubmitting}
                variant="secondary"
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmitting ? t("boosting") : t("boostButton")}</span>
              </Button>
            )}

            <Link
              href="/events"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {t("browseMarketplace")}
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
};
