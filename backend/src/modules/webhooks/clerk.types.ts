export type ClerkWebhookResult = {
  received: true;
  eventType: string;
  action: "synced" | "deleted" | "ignored" | "skipped_missing_email";
};
