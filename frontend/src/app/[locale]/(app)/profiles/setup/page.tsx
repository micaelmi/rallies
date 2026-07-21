import React from "react";
import { ProfileSetupWizard } from "@/components/profiles/profile-setup-wizard";

type ProfileSetupPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function ProfileSetupPage({ params }: ProfileSetupPageProps) {
  await params;
  return (
    <div className="page-shell">
      <ProfileSetupWizard />
    </div>
  );
}
