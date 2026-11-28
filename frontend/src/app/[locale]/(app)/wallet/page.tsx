import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/shared/page-frame";
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

  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    const { getToken } = await auth.protect();
    token = await getToken();
    if (!token) {
      redirect(`/${locale}/sign-in`);
    }
  }

  const [balanceRes, packagesRes] = await Promise.all([
    token
      ? fetch(`${getApiBaseUrl()}/wallet/balance`, {
          headers: { Authorization: `Bearer ${token}`, "x-locale": locale },
          cache: "no-store"
        }).catch(() => null)
      : Promise.resolve(null),
    fetch(`${getApiBaseUrl()}/billing/packages`, {
      headers: { "x-locale": locale },
      cache: "no-store"
    }).catch(() => null)
  ]);

  if (balanceRes?.ok) {
    const data = (await balanceRes.json()) as { balance: number };
    balance = data.balance;
  }

  let packages: BillingPackageView[] = [];
  if (packagesRes?.ok) {
    const data = (await packagesRes.json()) as {
      packages: BillingPackageView[];
    };
    packages = data.packages;
  }

  return (
    <PageFrame className="py-10">
      <WalletPackagesClient balance={balance} packages={packages} />
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
