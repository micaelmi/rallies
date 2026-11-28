import { Suspense } from "react";
import { Show, UserButton } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { WalletBalanceBadge } from "@/components/wallet/wallet-balance-badge";
import { cn } from "@/lib/utils";

export const AuthControls = async () => {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return null;
  }

  const t = await getTranslations("nav");

  return (
    <Suspense fallback={null}>
      <Show when="signed-out">
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "font-medium"
            )}
          >
            {t("signIn")}
          </Link>
          <Link
            href="/sign-up"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "font-medium"
            )}
          >
            {t("signUp")}
          </Link>
        </div>
      </Show>
      <Show when="signed-in">
        <div className="flex items-center gap-3">
          <WalletBalanceBadge />
          <Link
            href="/profiles/me"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "font-medium"
            )}
          >
            {t("myProfile")}
          </Link>
          <UserButton />
        </div>
      </Show>
    </Suspense>
  );
};
