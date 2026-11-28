"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Coins } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/api/config";
import { cn } from "@/lib/utils";

export const WALLET_UPDATED_EVENT = "rallies:wallet-updated";

export const dispatchWalletUpdated = (balance: number): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<{ balance: number }>(WALLET_UPDATED_EVENT, {
      detail: { balance }
    })
  );
};

export const WalletBalanceBadge: React.FC = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const tWallet = useTranslations("wallet");
  const tNav = useTranslations("nav");
  const [balance, setBalance] = useState<number | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        return;
      }

      const response = await fetch(`${getApiBaseUrl()}/wallet/balance`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { balance: number };
      setBalance(data.balance);
    } catch {
      // Keep the last known balance if background refresh fails.
    }
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    void fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    const handleFocus = () => {
      void fetchBalance();
    };

    const handleWalletUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ balance?: number }>;
      if (typeof customEvent.detail?.balance === "number") {
        setBalance(customEvent.detail.balance);
      } else {
        void fetchBalance();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener(WALLET_UPDATED_EVENT, handleWalletUpdated);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(WALLET_UPDATED_EVENT, handleWalletUpdated);
    };
  }, [fetchBalance]);

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <Link
      href="/wallet"
      aria-label={`${tNav("wallet")}: ${balance ?? 0} ${tWallet("coinsUnit")}`}
      title={tWallet("balanceLabel")}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "gap-1.5 font-semibold"
      )}
    >
      <Coins className="w-4 h-4 text-primary" />
      <span>{balance ?? "—"}</span>
      <span className="hidden sm:inline text-muted-foreground font-normal">
        {tWallet("coinsUnit")}
      </span>
    </Link>
  );
};
