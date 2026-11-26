import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import { PageFrame } from "@/components/shared/page-frame";

type SignUpPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function SignUpPage({ params }: SignUpPageProps) {
  const { locale } = await params;

  return (
    <PageFrame className="flex justify-center items-center py-12">
      <Suspense fallback={null}>
        <SignUp
          path={`/${locale}/sign-up`}
          routing="path"
          signInUrl={`/${locale}/sign-in`}
          fallbackRedirectUrl={`/${locale}/profiles/setup`}
        />
      </Suspense>
    </PageFrame>
  );
}
