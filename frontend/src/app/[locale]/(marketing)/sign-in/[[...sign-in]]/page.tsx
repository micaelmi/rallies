import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import { PageFrame } from "@/components/shared/page-frame";

type SignInPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function SignInPage({ params }: SignInPageProps) {
  const { locale } = await params;

  return (
    <PageFrame className="flex justify-center items-center py-12">
      <Suspense fallback={null}>
        <SignIn
          path={`/${locale}/sign-in`}
          routing="path"
          signUpUrl={`/${locale}/sign-up`}
          fallbackRedirectUrl={`/${locale}/app`}
        />
      </Suspense>
    </PageFrame>
  );
}
