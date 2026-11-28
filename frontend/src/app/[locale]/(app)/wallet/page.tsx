import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/shared/page-frame";
import { ClerkWalletPackagesClient } from "@/components/wallet/clerk-wallet-packages-client";
import {
  WalletPackagesClient,
  type BillingPackageView
} from "@/components/wallet/wallet-packages-client";
import { getApiBaseUrl } from "@/lib/api/config";

type WalletPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

async function AuthenticatedWalletView({ locale }: { locale: string }) {
  let balance = 0;
  let token: string | null = null;
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (hasClerk) {
    const { getToken } = await auth.protect();
    token = await getToken();
    if (!token) {
      redirect(`/${locale}/sign-in`);
    }
  }

  const [balanceRes, packagesRes] = await Promise.all([
    token || !hasClerk
      ? fetch(`${getApiBaseUrl()}/wallet/balance`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "x-locale": locale
          },
          cache: "no-store"
        }).catch(() => null)
      : Promise.resolve(null),
    fetch(`${getApiBaseUrl()}/billing/packages`, {
      headers: { "x-locale": locale },
      cache: "no-store"
    }).catch(() => null)
  ]);

  if (balanceRes?.ok) {
    const data = (await balanceRes.json().catch(() => null)) as {
      balance: number;
    } | null;
    if (data) {
      balance = data.balance;
    }
  }

  let packages: BillingPackageView[] = [];
  if (packagesRes?.ok) {
    const data = (await packagesRes.json().catch(() => null)) as {
      packages: BillingPackageView[];
    } | null;
    if (data) {
      packages = data.packages;
    }
  }

  return (
    <PageFrame className="py-10">
      {hasClerk ? (
        <ClerkWalletPackagesClient balance={balance} packages={packages} />
      ) : (
        <WalletPackagesClient balance={balance} packages={packages} />
      )}
    </PageFrame>
  );
}

export default async function WalletPage({ params }: WalletPageProps) {
  const { locale } = await params;

  return (
    <Suspense fallback={null}>
      <AuthenticatedWalletView locale={locale} />
    </Suspense>
  );
}
