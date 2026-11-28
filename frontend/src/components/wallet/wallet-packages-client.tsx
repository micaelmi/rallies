"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  CheckCircle2,
  Coins,
  Loader2,
  Sparkles,
  X
} from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getApiBaseUrl } from "@/lib/api/config";
import { StripeEmbeddedCheckout } from "./stripe-embedded-checkout";
import { dispatchWalletUpdated } from "./wallet-balance-badge";

export type BillingPackageView = {
  id: string;
  priceId: string;
  coinsAmount: number;
  kind: "ONE_TIME" | "SUBSCRIPTION";
  displayPriceCents: number;
  currency: "USD";
};

type WalletPackagesClientProps = {
  balance: number;
  packages: BillingPackageView[];
  getToken?: () => Promise<string | null>;
};

const defaultGetToken = async (): Promise<string | null> => null;

type StatusNotice = {
  tone: "success" | "info" | "error";
  message: string;
};

type SyncCheckoutResponse = {
  status: "credited" | "already_processed" | "pending";
  balance: number;
};

const MAX_SYNC_ATTEMPTS = 4;
const SYNC_RETRY_DELAY_MS = 1500;

const formatUsd = (cents: number): string =>
  `$${(cents / 100).toFixed(2)}`;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const WalletPackagesClient: React.FC<WalletPackagesClientProps> = ({
  balance,
  packages,
  getToken = defaultGetToken
}) => {
  const t = useTranslations("wallet");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [currentBalance, setCurrentBalance] = useState(balance);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<StatusNotice | null>(null);

  const getTokenRef = useRef(getToken);
  const tRef = useRef(t);
  const handledSearchSessionRef = useRef<string | null>(null);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    setCurrentBalance(balance);
  }, [balance]);

  const syncSessionBalance = useCallback(
    async (sessionId: string) => {
      setIsSyncing(true);
      setStatusNotice(null);

      try {
        const token = await getTokenRef.current();

        let lastResult: SyncCheckoutResponse | null = null;

        for (let attempt = 0; attempt < MAX_SYNC_ATTEMPTS; attempt++) {
          const response = await fetch(
            `${getApiBaseUrl()}/billing/checkout-sessions/${encodeURIComponent(sessionId)}/sync`,
            {
              method: "POST",
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {})
              }
            }
          );

          if (!response.ok) {
            throw new Error(`Sync failed with status ${response.status}`);
          }

          lastResult = (await response.json()) as SyncCheckoutResponse;

          if (lastResult.status !== "pending") {
            break;
          }

          if (attempt < MAX_SYNC_ATTEMPTS - 1) {
            await sleep(SYNC_RETRY_DELAY_MS);
          }
        }

        if (!lastResult) {
          throw new Error("Empty sync response");
        }

        setCurrentBalance(lastResult.balance);
        dispatchWalletUpdated(lastResult.balance);
        setSelectedPriceId(null);
        router.refresh();

        if (lastResult.status === "pending") {
          setStatusNotice({
            tone: "info",
            message: tRef.current("paymentPending")
          });
        } else {
          setStatusNotice({
            tone: "success",
            message: tRef.current("paymentSuccess")
          });
        }
      } catch (error) {
        console.error("Failed to sync checkout session balance:", error);
        setStatusNotice({
          tone: "error",
          message: tRef.current("syncError")
        });
      } finally {
        setIsSyncing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId || handledSearchSessionRef.current === sessionId) {
      return;
    }

    handledSearchSessionRef.current = sessionId;
    void syncSessionBalance(sessionId).finally(() => {
      router.replace(pathname);
    });
  }, [searchParams, syncSessionBalance, router, pathname]);

  return (
    <div className="space-y-8">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap justify-between items-center gap-4">
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
          <div className="flex items-center gap-3 bg-primary/10 px-5 py-3 border border-primary/20 rounded-xl">
            <Coins className="w-6 h-6 text-primary" />
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">
                {t("balanceLabel")}
              </p>
              <p className="font-bold text-foreground text-2xl">
                {currentBalance} {t("coinsUnit")}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {isSyncing && (
        <div className="flex items-center gap-2 bg-primary/10 p-4 border border-primary/20 rounded-xl text-foreground text-sm">
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          <span>{t("syncingBalance")}</span>
        </div>
      )}

      {!isSyncing && statusNotice && (
        <div
          className={
            statusNotice.tone === "error"
              ? "flex items-center gap-2 bg-destructive/15 p-4 border border-destructive/30 rounded-xl text-destructive text-sm"
              : "flex items-center gap-2 bg-primary/10 p-4 border border-primary/20 rounded-xl text-foreground text-sm"
          }
        >
          {statusNotice.tone === "error" ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          )}
          <span>{statusNotice.message}</span>
        </div>
      )}

      {packages.length === 0 ? (
        <Card className="p-6 text-muted-foreground text-sm">
          {t("noPackages")}
        </Card>
      ) : (
        <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
          {packages.map((pkg) => {
            const isSelected = selectedPriceId === pkg.priceId;
            return (
              <Card
                key={pkg.id}
                className="flex flex-col justify-between p-6 border-border"
              >
                <div>
                  <div className="flex justify-between items-center gap-2">
                    <Badge
                      variant={pkg.kind === "SUBSCRIPTION" ? "default" : "secondary"}
                    >
                      {pkg.kind === "SUBSCRIPTION"
                        ? t("subscriptionBadge")
                        : t("oneTimeBadge")}
                    </Badge>
                    <span className="font-bold text-foreground text-lg">
                      {formatUsd(pkg.displayPriceCents)}
                    </span>
                  </div>
                  <h2 className="mt-4 font-bold text-foreground text-xl">
                    {pkg.coinsAmount} {t("coinsUnit")}
                  </h2>
                  <p className="mt-2 text-muted-foreground text-sm">
                    {pkg.kind === "SUBSCRIPTION"
                      ? t("subscriptionBenefit")
                      : t("oneTimeDescription")}
                  </p>
                </div>

                <Button
                  className="mt-6 w-full gap-2"
                  variant={isSelected ? "outline" : "default"}
                  onClick={() =>
                    setSelectedPriceId(isSelected ? null : pkg.priceId)
                  }
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSelected ? t("closeCheckout") : t("buyCoins")}</span>
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {selectedPriceId && (
        <Card className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-foreground text-lg">
              {t("checkoutHeading")}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPriceId(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <StripeEmbeddedCheckout
            priceId={selectedPriceId}
            loadingLabel={t("loadingCheckout")}
            errorLabel={t("checkoutError")}
            getToken={getToken}
            onPaymentSuccess={syncSessionBalance}
          />
        </Card>
      )}
    </div>
  );
};
