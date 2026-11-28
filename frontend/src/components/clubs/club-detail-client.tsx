"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, MapPin, Shield, UserCheck, UserPlus, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useOptionalAuthToken } from "@/components/shared/client-auth-token";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getApiBaseUrl } from "@/lib/api/config";
import { cn } from "@/lib/utils";

export type ClubMemberView = {
  id: string;
  clubId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: "ACTIVE" | "INVITED" | "REQUESTED" | "REMOVED";
  joinedAt: string | null;
};

export type ClubDetailView = {
  id: string;
  name: string;
  slug: string;
  description: string;
  email: string;
  phone: string | null;
  instagramUrl: string | null;
  country: string;
  state: string | null;
  city: string | null;
  address: string;
  mapsUrl: string | null;
  maxMembers: number | null;
  ownerId: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  memberCount: number;
  members: ClubMemberView[];
};

type ClubDetailClientProps = {
  initialClub: ClubDetailView;
};

export const ClubDetailClient: React.FC<ClubDetailClientProps> = ({
  initialClub
}) => {
  const t = useTranslations("clubs");
  const getToken = useOptionalAuthToken();

  const [club, setClub] = useState<ClubDetailView>(initialClub);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadCurrentUser = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${getApiBaseUrl()}/wallet/balance`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          cache: "no-store"
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { userId?: string };
        if (data.userId && !cancelled) {
          setCurrentUserId(data.userId);
        }
      } catch {
        // Anonymous visitor
      }
    };
    void loadCurrentUser();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const refreshClub = async () => {
    const res = await fetch(`${getApiBaseUrl()}/clubs/${club.id}`, {
      cache: "no-store"
    });
    if (res.ok) {
      const updated = (await res.json()) as ClubDetailView;
      setClub(updated);
    }
  };

  const myMembership = currentUserId
    ? club.members.find((m) => m.userId === currentUserId)
    : undefined;

  const getMyStatusLabel = (): string => {
    if (!myMembership || myMembership.status === "REMOVED") {
      return t("status.notMember");
    }
    if (myMembership.status === "REQUESTED") {
      return t("status.pending");
    }
    if (myMembership.role === "OWNER") {
      return t("status.owner");
    }
    if (myMembership.role === "ADMIN") {
      return t("status.admin");
    }
    return t("status.member");
  };

  const canManageRoster =
    myMembership?.status === "ACTIVE" &&
    (myMembership.role === "OWNER" || myMembership.role === "ADMIN");

  const handleJoinRequest = async () => {
    setIsJoining(true);
    setErrorMessage(null);
    try {
      const token = await getToken();
      const res = await fetch(`${getApiBaseUrl()}/clubs/${club.id}/join`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        setErrorMessage(t("joinError"));
        return;
      }
      await refreshClub();
    } catch {
      setErrorMessage(t("joinError"));
    } finally {
      setIsJoining(false);
    }
  };

  const handleMemberUpdate = async (
    targetUserId: string,
    payload: { action?: "ACCEPT" | "REJECT"; role?: "ADMIN" | "MEMBER" }
  ) => {
    setUpdatingUserId(targetUserId);
    setErrorMessage(null);
    try {
      const token = await getToken();
      const res = await fetch(
        `${getApiBaseUrl()}/clubs/${club.id}/members/${encodeURIComponent(targetUserId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        }
      );
      if (!res.ok) {
        setErrorMessage(t("actionError"));
        return;
      }
      await refreshClub();
    } catch {
      setErrorMessage(t("actionError"));
    } finally {
      setUpdatingUserId(null);
    }
  };

  const locationParts = [club.city, club.state, club.country].filter(Boolean);

  return (
    <div className="space-y-6">
      <Link
        href="/clubs"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2")}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t("backToClubs")}</span>
      </Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{getMyStatusLabel()}</Badge>
              <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
                <Users className="w-4 h-4" />
                {t("membersCount", { count: club.memberCount })}
              </span>
            </div>
            <h1 className="font-bold text-foreground text-3xl tracking-tight">
              {club.name}
            </h1>
            <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>
                {club.address} — {locationParts.join(", ")}
              </span>
            </p>
          </div>

          {(!myMembership || myMembership.status === "REMOVED") && (
            <Button
              onClick={handleJoinRequest}
              disabled={isJoining}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isJoining ? t("requestingJoin") : t("joinRequest")}</span>
            </Button>
          )}
        </div>

        <p className="mt-6 text-foreground/90 text-sm leading-relaxed">
          {club.description}
        </p>

        {errorMessage && (
          <p className="mt-4 text-destructive text-sm">{errorMessage}</p>
        )}
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="font-semibold text-foreground text-xl">{t("roster")}</h2>
        <div className="space-y-3 mt-4">
          {club.members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap justify-between items-center gap-3 p-3 border border-border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {member.userId}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">
                      {t(`roles.${member.role}`)}
                    </Badge>
                    <Badge
                      variant={
                        member.status === "ACTIVE" ? "default" : "secondary"
                      }
                    >
                      {t(`memberStatuses.${member.status}`)}
                    </Badge>
                  </div>
                </div>
              </div>

              {canManageRoster && member.userId !== currentUserId && (
                <div className="flex flex-wrap items-center gap-2">
                  {member.status === "REQUESTED" && (
                    <>
                      <Button
                        size="sm"
                        disabled={updatingUserId === member.userId}
                        onClick={() =>
                          handleMemberUpdate(member.userId, { action: "ACCEPT" })
                        }
                        className="gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{t("acceptMember")}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingUserId === member.userId}
                        onClick={() =>
                          handleMemberUpdate(member.userId, { action: "REJECT" })
                        }
                      >
                        {t("rejectMember")}
                      </Button>
                    </>
                  )}
                  {member.status === "ACTIVE" &&
                    member.role === "MEMBER" &&
                    myMembership?.role === "OWNER" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingUserId === member.userId}
                        onClick={() =>
                          handleMemberUpdate(member.userId, { role: "ADMIN" })
                        }
                      >
                        {t("promoteAdmin")}
                      </Button>
                    )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
