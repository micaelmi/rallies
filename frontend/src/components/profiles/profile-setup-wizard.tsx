"use client";

import React, { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  User,
  AtSign,
  MapPin,
  Trophy,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

type SetupStep = 1 | 2 | 3;

type GripStyle = "shakehand" | "penhold_traditional" | "penhold_modern" | "seemiller" | "";
type DominantHand = "right" | "left" | "ambidextrous" | "";
type RatingLevel = "beginner" | "intermediate" | "advanced" | "pro" | "";

interface ProfileSetupWizardProps {
  userId?: string;
}

export const ProfileSetupWizard: React.FC<ProfileSetupWizardProps> = ({ userId }) => {
  const t = useTranslations("profiles.setup");
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState<SetupStep>(1);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Form State
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gripStyle, setGripStyle] = useState<GripStyle>("");
  const [dominantHand, setDominantHand] = useState<DominantHand>("");
  const [ratingLevel, setRatingLevel] = useState<RatingLevel>("");
  const [bio, setBio] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [country, setCountry] = useState("Brazil");
  const [stateRegion, setStateRegion] = useState("");
  const [city, setCity] = useState("");

  // UI Status State
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Debounced username checking
  useEffect(() => {
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setUsernameStatus("idle");
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/profiles/${cleanUsername}`);
        if (res.status === 200) {
          setUsernameStatus("taken");
        } else {
          setUsernameStatus("available");
        }
      } catch {
        setUsernameStatus("available");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const handleNextStep = () => {
    if (step === 1) {
      if (usernameStatus === "invalid" || usernameStatus === "checking" || !username.trim()) {
        return;
      }
      if (usernameStatus === "taken") {
        setSubmitError(t("errorConflict"));
        return;
      }
    }
    setSubmitError(null);
    setStep((prev) => (prev < 3 ? ((prev + 1) as SetupStep) : prev));
  };

  const handlePrevStep = () => {
    setSubmitError(null);
    setStep((prev) => (prev > 1 ? ((prev - 1) as SetupStep) : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus === "taken" || usernameStatus === "invalid") {
      setStep(1);
      setSubmitError(t("errorConflict"));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    // Format description / sport metadata
    const sportMetadataTags = [
      gripStyle ? t(`gripStyles.${gripStyle}`) : null,
      dominantHand ? t(`dominantHands.${dominantHand}`) : null,
      ratingLevel ? t(`ratings.${ratingLevel}`) : null
    ]
      .filter(Boolean)
      .join(" | ");

    const fullDescription = [
      displayName ? `[${displayName}]` : null,
      sportMetadataTags ? `🏆 ${sportMetadataTags}` : null,
      bio.trim() ? `\n${bio.trim()}` : null
    ]
      .filter(Boolean)
      .join("\n")
      .trim();

    const payload = {
      username: username.trim(),
      city: city.trim() || undefined,
      state: stateRegion.trim() || undefined,
      country: country.trim() || "Brazil",
      instagramUrl: instagramUrl.trim() || undefined,
      description: fullDescription || undefined,
      preferredLocale: locale === "pt-BR" ? "pt-BR" : "en"
    };

    try {
      const res = await fetch("/api/v1/profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { "x-user-id": userId } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 409) {
        setStep(1);
        setUsernameStatus("taken");
        setSubmitError(t("errorConflict"));
        setIsSubmitting(false);
        return;
      }

      if (!res.ok && res.status !== 201) {
        setSubmitError(t("errorGeneric"));
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setIsSubmitting(false);
    } catch {
      setSubmitError(t("errorGeneric"));
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="mx-auto px-4 sm:px-6 py-12 max-w-xl">
        <Card className="p-8 sm:p-12 text-center">
          <div className="flex justify-center items-center bg-primary/15 mx-auto mb-6 rounded-xl w-16 h-16 text-primary">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="font-bold text-foreground text-2xl sm:text-3xl tracking-tight">
            {t("successTitle")}
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">{t("successDescription")}</p>
          <Button
            onClick={() => router.push(`/${locale}/profiles/${username.trim()}`)}
            size="lg"
            className="mt-8 gap-2"
          >
            <span>{t("viewProfile")}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-6xl">
      {/* Header */}
      <div className="mb-8 lg:text-left text-center">
        <Badge variant="default" className="gap-1.5 px-3 py-1 text-xs uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          {t("eyebrow")}
        </Badge>
        <h1 className="mt-3 font-bold text-foreground text-3xl sm:text-4xl tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground text-sm sm:text-base leading-relaxed">
          {t("description")}
        </p>
      </div>

      {/* Step Progress Bar */}
      <div className="mb-8">
        <div className="gap-2 sm:gap-4 grid grid-cols-3">
          <div
            onClick={() => step > 1 && setStep(1)}
            className={cn(
              "flex items-center gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 border rounded-xl font-medium text-xs sm:text-sm transition-all",
              step === 1
                ? "border-primary bg-primary/10 text-primary shadow-sm font-semibold"
                : step > 1
                  ? "border-border bg-card text-foreground cursor-pointer hover:border-primary/40"
                  : "border-border/50 bg-card/50 text-muted-foreground opacity-60"
            )}
          >
            <span className={cn("flex justify-center items-center rounded-full w-6 h-6 font-bold text-xs", step === 1 ? "bg-primary text-primary-foreground" : step > 1 ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground")}>
              {step > 1 ? "✓" : "1"}
            </span>
            <span className="truncate">{t("step1")}</span>
          </div>

          <div
            onClick={() => step > 2 && setStep(2)}
            className={cn(
              "flex items-center gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 border rounded-xl font-medium text-xs sm:text-sm transition-all",
              step === 2
                ? "border-primary bg-primary/10 text-primary shadow-sm font-semibold"
                : step > 2
                  ? "border-border bg-card text-foreground cursor-pointer hover:border-primary/40"
                  : "border-border/50 bg-card/50 text-muted-foreground opacity-60"
            )}
          >
            <span className={cn("flex justify-center items-center rounded-full w-6 h-6 font-bold text-xs", step === 2 ? "bg-primary text-primary-foreground" : step > 2 ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground")}>
              {step > 2 ? "✓" : "2"}
            </span>
            <span className="truncate">{t("step2")}</span>
          </div>

          <div
            className={cn(
              "flex items-center gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 border rounded-xl font-medium text-xs sm:text-sm transition-all",
              step === 3
                ? "border-primary bg-primary/10 text-primary shadow-sm font-semibold"
                : "border-border/50 bg-card/50 text-muted-foreground opacity-60"
            )}
          >
            <span className={cn("flex justify-center items-center rounded-full w-6 h-6 font-bold text-xs", step === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              3
            </span>
            <span className="truncate">{t("step3")}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Wizard Form Left, Live Card Preview Right */}
      <div className="lg:items-start gap-8 grid grid-cols-1 lg:grid-cols-12">
        {/* Mobile Preview Toggle */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setShowMobilePreview(!showMobilePreview)}
            className="flex justify-between items-center bg-card shadow-sm px-4 py-3 border border-border rounded-xl w-full font-medium text-foreground text-sm"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {t("previewHeading")}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              {showMobilePreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </span>
          </button>
          {showMobilePreview && (
            <div className="mt-3">
              <LiveCardPreview
                username={username}
                displayName={displayName}
                gripStyle={gripStyle}
                dominantHand={dominantHand}
                ratingLevel={ratingLevel}
                bio={bio}
                country={country}
                stateRegion={stateRegion}
                city={city}
                t={t}
              />
            </div>
          )}
        </div>

        {/* Wizard Form Panel */}
        <div className="lg:col-span-7">
          <Card className="p-6 sm:p-8">
            <form onSubmit={handleSubmit}>
              {submitError && (
                <div className="flex items-start gap-3 bg-destructive/15 mb-6 p-4 border border-destructive/30 rounded-lg text-destructive text-sm">
                  <AlertCircle className="flex-shrink-0 mt-0.5 w-5 h-5 text-destructive" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* STEP 1: HANDLE & DISPLAY NAME */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-3 border-border/60 border-b font-semibold text-foreground text-sm">
                    <AtSign className="w-4 h-4 text-primary" />
                    <span>{t("step1")}</span>
                  </div>

                  <div>
                    <label className="block font-medium text-foreground text-sm">
                      {t("usernameLabel")} <span className="text-primary">*</span>
                    </label>
                    <div className="relative mt-2">
                      <div className="left-0 absolute inset-y-0 flex items-center pl-3.5 font-medium text-muted-foreground pointer-events-none">
                        @
                      </div>
                      <Input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        placeholder={t("usernamePlaceholder")}
                        className={cn(
                          "py-2 pr-10 pl-9 font-medium",
                          usernameStatus === "invalid" || usernameStatus === "taken"
                            ? "border-destructive focus-visible:ring-destructive/30"
                            : usernameStatus === "available"
                              ? "border-success focus-visible:ring-success/30"
                              : "border-input"
                        )}
                      />
                      <div className="right-0 absolute inset-y-0 flex items-center pr-3.5">
                        {usernameStatus === "checking" && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
                        {usernameStatus === "available" && <CheckCircle2 className="w-4 h-4 text-success" />}
                        {(usernameStatus === "taken" || usernameStatus === "invalid") && <AlertCircle className="w-4 h-4 text-destructive" />}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-2 text-xs">
                      <span className="text-muted-foreground">{t("usernameHint")}</span>
                      {usernameStatus === "checking" && <span className="font-medium text-muted-foreground">{t("usernameChecking")}</span>}
                      {usernameStatus === "available" && <span className="font-semibold text-success">{t("usernameAvailable")}</span>}
                      {usernameStatus === "taken" && <span className="font-semibold text-destructive">{t("usernameTaken")}</span>}
                      {usernameStatus === "invalid" && username.length > 0 && <span className="font-medium text-destructive">{t("usernameInvalid")}</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-foreground text-sm">
                      {t("displayNameLabel")}
                    </label>
                    <div className="relative mt-2">
                      <div className="left-0 absolute inset-y-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                        <User className="w-4 h-4" />
                      </div>
                      <Input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={t("displayNamePlaceholder")}
                        className="py-2 pr-4 pl-10"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: SPORT IDENTITY */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-3 border-border/60 border-b font-semibold text-foreground text-sm">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span>{t("step2")}</span>
                  </div>

                  <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label className="block font-medium text-foreground text-sm">
                        {t("gripStyleLabel")}
                      </label>
                      <select
                        value={gripStyle}
                        onChange={(e) => setGripStyle(e.target.value as GripStyle)}
                        className="flex h-10 w-full mt-2 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                      >
                        <option value="">{t("gripStylePlaceholder")}</option>
                        <option value="shakehand">{t("gripStyles.shakehand")}</option>
                        <option value="penhold_traditional">{t("gripStyles.penhold_traditional")}</option>
                        <option value="penhold_modern">{t("gripStyles.penhold_modern")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-foreground text-sm">
                        {t("dominantHandLabel")}
                      </label>
                      <select
                        value={dominantHand}
                        onChange={(e) => setDominantHand(e.target.value as DominantHand)}
                        className="flex h-10 w-full mt-2 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                      >
                        <option value="">--</option>
                        <option value="right">{t("dominantHands.right")}</option>
                        <option value="left">{t("dominantHands.left")}</option>
                        <option value="ambidextrous">{t("dominantHands.ambidextrous")}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-foreground text-sm">
                      {t("ratingLabel")}
                    </label>
                    <select
                      value={ratingLevel}
                      onChange={(e) => setRatingLevel(e.target.value as RatingLevel)}
                      className="flex h-10 w-full mt-2 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    >
                      <option value="">--</option>
                      <option value="beginner">{t("ratings.beginner")}</option>
                      <option value="intermediate">{t("ratings.intermediate")}</option>
                      <option value="advanced">{t("ratings.advanced")}</option>
                      <option value="pro">{t("ratings.pro")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-foreground text-sm">
                      {t("bioLabel")}
                    </label>
                    <textarea
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={t("bioPlaceholder")}
                      className="flex w-full mt-2 p-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: LOCATION & SOCIAL */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-3 border-border/60 border-b font-semibold text-foreground text-sm">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{t("step3")}</span>
                  </div>

                  <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label className="block font-medium text-foreground text-sm">
                        {t("countryLabel")} <span className="text-primary">*</span>
                      </label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="flex h-10 w-full mt-2 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                      >
                        <option value="Brazil">Brazil</option>
                        <option value="United States">United States</option>
                        <option value="Germany">Germany</option>
                        <option value="Japan">Japan</option>
                        <option value="China">China</option>
                        <option value="France">France</option>
                        <option value="Sweden">Sweden</option>
                        <option value="South Korea">South Korea</option>
                        <option value="Portugal">Portugal</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Other">Other Country</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-foreground text-sm">
                        {t("stateLabel")}
                      </label>
                      <Input
                        type="text"
                        value={stateRegion}
                        onChange={(e) => setStateRegion(e.target.value)}
                        placeholder={t("statePlaceholder")}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-foreground text-sm">
                      {t("cityLabel")}
                    </label>
                    <Input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={t("cityPlaceholder")}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-foreground text-sm">
                      {t("instagramLabel")}
                    </label>
                    <div className="relative mt-2">
                      <div className="left-0 absolute inset-y-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                        <InstagramIcon className="w-4 h-4" />
                      </div>
                      <Input
                        type="url"
                        value={instagramUrl}
                        onChange={(e) => setInstagramUrl(e.target.value)}
                        placeholder={t("instagramPlaceholder")}
                        className="py-2 pr-4 pl-10"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mt-8 pt-6 border-border/60 border-t">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    className="gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{t("back")}</span>
                  </Button>
                ) : (
                  <div />
                )}

                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    disabled={usernameStatus === "invalid" || usernameStatus === "checking" || !username.trim()}
                    className="gap-2"
                  >
                    <span>{t("next")}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t("submitting")}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>{t("submit")}</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>

        {/* Live Card Preview Panel (Desktop) */}
        <div className="hidden lg:block lg:col-span-5">
          <div className="top-8 sticky">
            <div className="flex items-center gap-2 mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              <Eye className="w-4 h-4 text-primary" />
              <span>{t("previewHeading")}</span>
            </div>
            <LiveCardPreview
              username={username}
              displayName={displayName}
              gripStyle={gripStyle}
              dominantHand={dominantHand}
              ratingLevel={ratingLevel}
              bio={bio}
              country={country}
              stateRegion={stateRegion}
              city={city}
              t={t}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface LiveCardPreviewProps {
  username: string;
  displayName: string;
  gripStyle: GripStyle;
  dominantHand: DominantHand;
  ratingLevel: RatingLevel;
  bio: string;
  country: string;
  stateRegion: string;
  city: string;
  t: (key: string) => string;
}

const LiveCardPreview: React.FC<LiveCardPreviewProps> = ({
  username,
  displayName,
  gripStyle,
  dominantHand,
  ratingLevel,
  bio,
  country,
  stateRegion,
  city,
  t
}) => {
  const cleanUsername = username.trim() || "player_handle";
  const locationStr = [city.trim(), stateRegion.trim(), country.trim()].filter(Boolean).join(", ");

  return (
    <Card className="p-6 sm:p-8 overflow-hidden transition-all">
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <div className="flex justify-center items-center bg-primary text-primary-foreground shadow-sm rounded-xl w-14 h-14 font-bold text-xl">
            {(displayName || cleanUsername).charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg tracking-tight">
              {displayName.trim() || `@${cleanUsername}`}
            </h3>
            <p className="font-medium text-primary text-xs">@{cleanUsername}</p>
          </div>
        </div>
        <Badge variant="success" className="gap-1.5 px-2.5 py-0.5">
          <span className="bg-success rounded-full w-1.5 h-1.5" />
          Active
        </Badge>
      </div>

      {locationStr && (
        <div className="flex items-center gap-1.5 mt-4 font-medium text-muted-foreground text-xs">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span>{locationStr}</span>
        </div>
      )}

      {/* Sport Badges */}
      <div className="flex flex-wrap gap-1.5 mt-4">
        {gripStyle ? (
          <Badge variant="default" className="font-medium">
            {t(`gripStyles.${gripStyle}`)}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground font-normal">
            {t("badgeGrip")}
          </Badge>
        )}

        {dominantHand ? (
          <Badge variant="secondary" className="font-medium">
            {t(`dominantHands.${dominantHand}`)}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground font-normal">
            {t("badgeHand")}
          </Badge>
        )}

        {ratingLevel ? (
          <Badge variant="default" className="bg-warning/15 text-warning border-transparent font-medium">
            🏆 {t(`ratings.${ratingLevel}`)}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground font-normal">
            {t("badgeRating")}
          </Badge>
        )}
      </div>

      {/* Bio Section */}
      <div className="mt-5 pt-4 border-border/60 border-t">
        <p className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">Bio</p>
        <p className="mt-1 text-foreground/80 text-xs sm:text-sm line-clamp-4 leading-relaxed">
          {bio.trim() || "Player story will appear right here as you type in step 2..."}
        </p>
      </div>

      {/* Footer URL preview */}
      <div className="bg-background/80 mt-5 px-3 py-2 border border-border/40 rounded-lg font-mono text-muted-foreground text-[11px] truncate">
        rallies.app/profiles/{cleanUsername}
      </div>
    </Card>
  );
};
