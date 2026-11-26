import React, { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { ProfileSetupWizard } from "@/components/profiles/profile-setup-wizard";

type ProfileSetupPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

async function ProtectedProfileSetup() {
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    await auth.protect();
  }

  return (
    <div className="page-shell">
      <ProfileSetupWizard />
    </div>
  );
}

export default async function ProfileSetupPage({ params }: ProfileSetupPageProps) {
  await params;

  return (
    <Suspense fallback={null}>
      <ProtectedProfileSetup />
    </Suspense>
  );
}
