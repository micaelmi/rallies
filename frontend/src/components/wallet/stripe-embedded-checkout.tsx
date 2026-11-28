"use client";

import React, { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2, AlertCircle } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api/config";

type StripeCheckoutForm = {
  mount: (selector: string | HTMLElement) => void;
  unmount?: () => void;
  destroy?: () => void;
  on: (event: "confirm", handler: (event: unknown) => void | Promise<void>) => void;
};

type StripeCheckoutSdk = {
  createForm: (options: { layout: "expanded" | "compact" }) => StripeCheckoutForm;
  loadActions: () => Promise<
    | {
        type: "success";
        actions: {
          confirm: (params: {
            formConfirmEvent: unknown;
            redirect?: "always" | "if_required";
            returnUrl?: string;
          }) => Promise<unknown>;
        };
      }
    | { type: string; error?: { message?: string } }
  >;
};

type StripeDahliaInstance = {
  initCheckoutFormSdk: (options: {
    clientSecret: Promise<string>;
    appearance: Record<string, unknown>;
  }) => StripeCheckoutSdk;
};

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeDahliaInstance;
  }
}

const APPEARANCE = {
  theme: "stripe",
  labels: "above",
  variables: {
    borderRadius: "4px",
    colorBackground: "#ffffff",
    colorDanger: "#df1b41",
    colorPrimary: "#0570de",
    colorSuccess: "#00c853",
    colorText: "#30313d",
    fontSizeBase: "16px",
    spacingUnit: "4px"
  }
} as const;

type StripeEmbeddedCheckoutProps = {
  priceId: string;
  loadingLabel: string;
  errorLabel: string;
  getToken?: () => Promise<string | null>;
  onPaymentSuccess?: (sessionId: string) => void | Promise<void>;
};

const defaultGetToken = async (): Promise<string | null> => null;

export const StripeEmbeddedCheckout: React.FC<StripeEmbeddedCheckoutProps> = ({
  priceId,
  loadingLabel,
  errorLabel,
  getToken = defaultGetToken,
  onPaymentSuccess
}) => {
  const [scriptLoaded, setScriptLoaded] = useState(
    () => typeof window !== "undefined" && typeof window.Stripe === "function"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mountedFormRef = useRef<StripeCheckoutForm | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const getTokenRef = useRef(getToken);
  const errorLabelRef = useRef(errorLabel);
  const onPaymentSuccessRef = useRef(onPaymentSuccess);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    errorLabelRef.current = errorLabel;
  }, [errorLabel]);

  useEffect(() => {
    onPaymentSuccessRef.current = onPaymentSuccess;
  }, [onPaymentSuccess]);

  useEffect(() => {
    if (!scriptLoaded && typeof window !== "undefined" && typeof window.Stripe === "function") {
      setScriptLoaded(true);
      return;
    }

    if (!scriptLoaded) {
      return;
    }

    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey || typeof window.Stripe !== "function") {
      console.error("Stripe publishable key or window.Stripe is unavailable.");
      setErrorMessage(errorLabelRef.current);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const mountCheckoutForm = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const stripe = window.Stripe!(publishableKey);
        const token = await getTokenRef.current();
        if (cancelled) {
          return;
        }

        const response = await fetch(
          `${getApiBaseUrl()}/billing/checkout-sessions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ priceId })
          }
        );

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "");
          throw new Error(
            `Failed to initialize checkout session (${response.status}): ${errorBody}`
          );
        }

        const data = (await response.json()) as {
          sessionId: string;
          client_secret: string;
        };
        if (cancelled || !containerRef.current) {
          return;
        }

        containerRef.current.replaceChildren();

        const checkout = stripe.initCheckoutFormSdk({
          clientSecret: Promise.resolve(data.client_secret),
          appearance: APPEARANCE
        });

        const form = checkout.createForm({ layout: "expanded" });
        mountedFormRef.current = form;
        form.mount(containerRef.current);

        const loadActionsResult = await checkout.loadActions();
        if (cancelled) {
          return;
        }

        if (loadActionsResult.type === "success" && "actions" in loadActionsResult) {
          form.on("confirm", async (event) => {
            try {
              const returnUrl = `${window.location.origin}${window.location.pathname}?session_id=${encodeURIComponent(data.sessionId)}`;
              const confirmResult = await loadActionsResult.actions.confirm({
                formConfirmEvent: event,
                redirect: "if_required",
                returnUrl
              });

              if (
                confirmResult &&
                typeof confirmResult === "object" &&
                "type" in confirmResult &&
                confirmResult.type === "success"
              ) {
                await onPaymentSuccessRef.current?.(data.sessionId);
              }
            } catch (error) {
              console.error("Payment confirmation error:", error);
              setErrorMessage(errorLabelRef.current);
            }
          });
        } else {
          console.error("Stripe checkout.loadActions failed:", loadActionsResult);
          setErrorMessage(errorLabelRef.current);
        }
      } catch (error) {
        console.error("Stripe embedded checkout initialization error:", error);
        if (!cancelled) {
          setErrorMessage(errorLabelRef.current);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void mountCheckoutForm();

    return () => {
      cancelled = true;
      mountedFormRef.current?.unmount?.();
      mountedFormRef.current?.destroy?.();
      mountedFormRef.current = null;
      containerRef.current?.replaceChildren();
    };
  }, [scriptLoaded, priceId]);

  return (
    <div className="space-y-4">
      <Script
        src="https://js.stripe.com/endive/stripe.js"
        strategy="afterInteractive"
        onReady={() => setScriptLoaded(true)}
        onLoad={() => setScriptLoaded(true)}
        onError={(error) => {
          console.error("Failed to load Stripe.js:", error);
          setErrorMessage(errorLabelRef.current);
          setIsLoading(false);
        }}
      />

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{loadingLabel}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 bg-destructive/15 p-3 border border-destructive/30 rounded-lg text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div ref={containerRef} id="checkout-form" className="bg-white p-4 rounded-xl" />
    </div>
  );
};
