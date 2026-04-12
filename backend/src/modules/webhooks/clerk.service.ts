import { verifyWebhook } from "@clerk/backend/webhooks";
import { AppError } from "../../shared/errors/app-error.js";
import type { IdentityService } from "../identity/identity.service.js";
import type { ClerkWebhookResult } from "./clerk.types.js";

type VerifyClerkWebhookInput = {
  headers: Record<string, string | string[] | undefined>;
  rawBody?: string | Buffer | undefined;
  signingSecret?: string | undefined;
};

const getPrimaryEmailAddress = (data: unknown): string | null => {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const record = data as Record<string, unknown>;
  const emailAddresses = Array.isArray(record.email_addresses)
    ? (record.email_addresses as Array<Record<string, unknown>>)
    : [];
  const primaryEmailAddressId =
    typeof record.primary_email_address_id === "string"
      ? record.primary_email_address_id
      : null;

  const primaryEmail =
    emailAddresses.find(
      (emailAddress) => emailAddress.id === primaryEmailAddressId
    ) ?? emailAddresses[0];

  return typeof primaryEmail?.email_address === "string"
    ? primaryEmail.email_address
    : null;
};

const buildRequestHeaders = (
  headers: Record<string, string | string[] | undefined>
): Headers => {
  const requestHeaders = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      requestHeaders.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      requestHeaders.set(key, value.join(","));
    }
  }

  return requestHeaders;
};

const resolveClerkUserId = (data: unknown): string | null => {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const record = data as Record<string, unknown>;
  return typeof record.id === "string" ? record.id : null;
};

export class ClerkWebhookService {
  public constructor(private readonly identityService: IdentityService) {}

  public async handle(
    input: VerifyClerkWebhookInput
  ): Promise<ClerkWebhookResult> {
    if (!input.signingSecret) {
      throw new AppError({
        code: "WEBHOOK_NOT_CONFIGURED",
        messageKey: "errors.webhooks.clerk_not_configured",
        statusCode: 503
      });
    }

    if (!input.rawBody) {
      throw new AppError({
        code: "WEBHOOK_INVALID_PAYLOAD",
        messageKey: "errors.webhooks.invalid_payload",
        statusCode: 400
      });
    }

    let event: Awaited<ReturnType<typeof verifyWebhook>>;

    try {
      event = await verifyWebhook(
        new Request("http://localhost/api/v1/webhooks/clerk", {
          method: "POST",
          headers: buildRequestHeaders(input.headers),
          body: input.rawBody
        }),
        {
          signingSecret: input.signingSecret
        }
      );
    } catch {
      throw new AppError({
        code: "WEBHOOK_VERIFICATION_FAILED",
        messageKey: "errors.webhooks.signature_verification_failed",
        statusCode: 400
      });
    }

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const email = getPrimaryEmailAddress(event.data);
        const clerkUserId = resolveClerkUserId(event.data);

        if (!email || !clerkUserId) {
          return {
            received: true,
            eventType: event.type,
            action: "skipped_missing_email"
          };
        }

        await this.identityService.syncUserFromClerk({
          clerkUserId,
          email
        });

        return {
          received: true,
          eventType: event.type,
          action: "synced"
        };
      }

      case "user.deleted": {
        const clerkUserId = resolveClerkUserId(event.data);

        if (!clerkUserId) {
          return {
            received: true,
            eventType: event.type,
            action: "ignored"
          };
        }

        await this.identityService.deleteUserSyncedFromClerk(clerkUserId);

        return {
          received: true,
          eventType: event.type,
          action: "deleted"
        };
      }

      default:
        return {
          received: true,
          eventType: event.type,
          action: "ignored"
        };
    }
  }
}
