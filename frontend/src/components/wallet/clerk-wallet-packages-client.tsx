"use client";

import React from "react";
import { useAuth } from "@clerk/nextjs";
import {
  WalletPackagesClient,
  type BillingPackageView
} from "./wallet-packages-client";

type ClerkWalletPackagesClientProps = {
  balance: number;
  packages: BillingPackageView[];
};

export const ClerkWalletPackagesClient: React.FC<
  ClerkWalletPackagesClientProps
> = ({ balance, packages }) => {
  const { getToken } = useAuth();

  return (
    <WalletPackagesClient
      balance={balance}
      packages={packages}
      getToken={getToken}
    />
  );
};
