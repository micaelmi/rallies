import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { PageFrame } from "@/components/shared/page-frame";
import { CreateEventWizardClient } from "@/components/events/create-event-wizard-client";

type CreateEventPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

async function ProtectedCreateEventView() {
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    await auth.protect();
  }

  return (
    <PageFrame className="py-10">
      <CreateEventWizardClient />
    </PageFrame>
  );
}

export default async function CreateEventPage({
  params
}: CreateEventPageProps) {
  await params;

  return (
    <Suspense fallback={null}>
      <ProtectedCreateEventView />
    </Suspense>
  );
}
