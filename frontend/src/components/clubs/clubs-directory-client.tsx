"use client";

import React, { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Plus, Search, Users, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useOptionalAuthToken } from "@/components/shared/client-auth-token";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { dispatchWalletUpdated } from "@/components/wallet/wallet-balance-badge";
import { getApiBaseUrl } from "@/lib/api/config";
import { cn } from "@/lib/utils";

export type ClubSummaryView = {
  id: string;
  name: string;
  slug: string;
  description: string;
  country: string;
  state: string | null;
  city: string | null;
  address: string;
  ownerId: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  memberCount: number;
};

type ClubsDirectoryClientProps = {
  initialClubs: ClubSummaryView[];
};

const createEmptyForm = () => ({
  name: "",
  description: "",
  email: "",
  country: "Brazil",
  state: "",
  city: "",
  address: ""
});

export const ClubsDirectoryClient: React.FC<ClubsDirectoryClientProps> = ({
  initialClubs
}) => {
  const t = useTranslations("clubs");
  const getToken = useOptionalAuthToken();

  const [clubs, setClubs] = useState<ClubSummaryView[]>(initialClubs);
  const [nameFilter, setNameFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [activeFilters, setActiveFilters] = useState<{
    name: string;
    location: string;
  }>({ name: "", location: "" });
  const [isSearching, setIsSearching] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formState, setFormState] = useState(createEmptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const runSearch = useCallback(
    async (nextName: string, nextLocation: string) => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams();
        if (nextName.trim()) params.set("name", nextName.trim());
        if (nextLocation.trim()) params.set("location", nextLocation.trim());

        const query = params.toString();
        const response = await fetch(
          `${getApiBaseUrl()}/clubs${query ? `?${query}` : ""}`,
          { cache: "no-store" }
        );
        if (!response.ok) return;

        const data = (await response.json()) as { items: ClubSummaryView[] };
        setClubs(data.items);
        setActiveFilters({
          name: nextName.trim(),
          location: nextLocation.trim()
        });
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(nameFilter, locationFilter);
  };

  const handleClearFilters = async () => {
    setNameFilter("");
    setLocationFilter("");
    await runSearch("", "");
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);

    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/clubs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: formState.name,
          description: formState.description,
          email: formState.email,
          country: formState.country,
          ...(formState.state.trim() ? { state: formState.state.trim() } : {}),
          ...(formState.city.trim() ? { city: formState.city.trim() } : {}),
          address: formState.address,
          idempotencyKey: crypto.randomUUID()
        })
      });

      if (!response.ok) {
        setCreateError(t("createError"));
        return;
      }

      const balanceRes = await fetch(`${getApiBaseUrl()}/wallet/balance`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        cache: "no-store"
      }).catch(() => null);
      if (balanceRes?.ok) {
        const balanceData = (await balanceRes.json()) as { balance: number };
        dispatchWalletUpdated(balanceData.balance);
      }

      setFormState(createEmptyForm());
      setShowCreateForm(false);
      await runSearch(activeFilters.name, activeFilters.location);
    } catch {
      setCreateError(t("createError"));
    } finally {
      setIsCreating(false);
    }
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
              {t("discover")}
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              {t("description")}
            </p>
          </div>
          <Button
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setCreateError(null);
            }}
            variant={showCreateForm ? "outline" : "default"}
            className="gap-2"
          >
            {showCreateForm ? (
              <X className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>
              {showCreateForm ? t("closeCreate") : t("createToggle")}
            </span>
          </Button>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="gap-3 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] mt-6"
        >
          <Input
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder={t("searchNamePlaceholder")}
          />
          <Input
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            placeholder={t("searchLocationPlaceholder")}
          />
          <Button type="submit" disabled={isSearching} className="gap-2">
            <Search className="w-4 h-4" />
            <span>{t("searchButton")}</span>
          </Button>
        </form>

        {(activeFilters.name || activeFilters.location) && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {activeFilters.name && (
              <Badge variant="secondary">
                {t("activeFilterName")}: {activeFilters.name}
              </Badge>
            )}
            {activeFilters.location && (
              <Badge variant="secondary">
                {t("activeFilterLocation")}: {activeFilters.location}
              </Badge>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
            >
              {t("clearFilters")}
            </Button>
          </div>
        )}
      </Card>

      {showCreateForm && (
        <Card className="p-6 sm:p-8">
          <div className="mb-4">
            <h2 className="font-semibold text-foreground text-xl">
              {t("createToggle")}
            </h2>
            <p className="mt-1 text-muted-foreground text-sm">
              {t("createCostNotice")}
            </p>
          </div>

          <form onSubmit={handleCreateClub} className="space-y-4">
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-medium text-sm">{t("nameLabel")}</label>
                <Input
                  required
                  value={formState.name}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, name: e.target.value }))
                  }
                  placeholder={t("namePlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-sm">{t("emailLabel")}</label>
                <Input
                  required
                  type="email"
                  value={formState.email}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, email: e.target.value }))
                  }
                  placeholder={t("emailPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-sm">
                  {t("countryLabel")}
                </label>
                <Input
                  required
                  value={formState.country}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, country: e.target.value }))
                  }
                  placeholder={t("countryPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-sm">{t("stateLabel")}</label>
                <Input
                  value={formState.state}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, state: e.target.value }))
                  }
                  placeholder={t("statePlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-sm">{t("cityLabel")}</label>
                <Input
                  value={formState.city}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, city: e.target.value }))
                  }
                  placeholder={t("cityPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-sm">
                  {t("addressLabel")}
                </label>
                <Input
                  required
                  value={formState.address}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, address: e.target.value }))
                  }
                  placeholder={t("addressPlaceholder")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-sm">
                {t("descriptionLabel")}
              </label>
              <Input
                required
                value={formState.description}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, description: e.target.value }))
                }
                placeholder={t("descriptionPlaceholder")}
              />
            </div>

            {createError && (
              <p className="text-destructive text-sm">{createError}</p>
            )}

            <Button type="submit" disabled={isCreating}>
              {isCreating ? t("creating") : t("createSubmit")}
            </Button>
          </form>
        </Card>
      )}

      {clubs.length === 0 ? (
        <Card className="p-6 text-muted-foreground text-sm">
          {t("emptyState")}
        </Card>
      ) : (
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => {
            const locationParts = [club.city, club.state, club.country].filter(
              Boolean
            );
            return (
              <Card
                key={club.id}
                className="flex flex-col justify-between p-6 border-border"
              >
                <div>
                  <div className="flex justify-between items-center gap-2">
                    <Badge variant="secondary">{club.status}</Badge>
                    <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                      <Users className="w-3.5 h-3.5" />
                      {t("membersCount", { count: club.memberCount })}
                    </span>
                  </div>
                  <h2 className="mt-4 font-bold text-foreground text-xl">
                    {club.name}
                  </h2>
                  <p className="flex items-center gap-1.5 mt-1 text-muted-foreground text-xs">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{locationParts.join(", ")}</span>
                  </p>
                  <p className="mt-3 text-muted-foreground text-sm line-clamp-3">
                    {club.description}
                  </p>
                </div>

                <Link
                  href={`/clubs/${club.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "mt-6 w-full"
                  )}
                >
                  {t("viewDetails")}
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
