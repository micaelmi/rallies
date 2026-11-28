import { createClerkClient, verifyToken } from "@clerk/backend";
import type { FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { PrismaIdentityRepository } from "../modules/identity/identity.repository.js";
import { IdentityService } from "../modules/identity/identity.service.js";
import { AppError } from "../shared/errors/app-error.js";

export type VerifyAuthTokenFn = (
  token: string,
  options: { secretKey?: string | undefined; jwtKey?: string | undefined }
) => Promise<{ sub?: string | undefined }>;

export type FetchClerkUserEmailFn = (
  clerkUserId: string
) => Promise<string | null>;

export type AuthPluginOptions = {
  verifyAuthToken?: VerifyAuthTokenFn;
  fetchClerkUserEmail?: FetchClerkUserEmailFn;
};

const extractBearerToken = (
  authorizationHeader?: string | string[]
): string | null => {
  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const [scheme, token, ...rest] = authorizationHeader.trim().split(/\s+/);

  if (
    !scheme ||
    scheme.toLowerCase() !== "bearer" ||
    !token ||
    rest.length > 0
  ) {
    return null;
  }

  return token;
};

const defaultVerifyAuthToken: VerifyAuthTokenFn = async (token, options) => {
  return verifyToken(token, {
    ...(options.secretKey ? { secretKey: options.secretKey } : {}),
    ...(options.jwtKey ? { jwtKey: options.jwtKey } : {})
  });
};

export const authPlugin = fp<AuthPluginOptions>(async (app, opts) => {
  const identityRepository = new PrismaIdentityRepository(app.prisma);
  const identityService = new IdentityService(identityRepository);
  const verifyAuthToken = opts.verifyAuthToken ?? defaultVerifyAuthToken;

  const fetchClerkUserEmail: FetchClerkUserEmailFn =
    opts.fetchClerkUserEmail ??
    (async (clerkUserId: string) => {
      const secretKey = app.config?.CLERK_SECRET_KEY;
      if (!secretKey) {
        return null;
      }

      const clerk = createClerkClient({ secretKey });
      const user = await clerk.users.getUser(clerkUserId);
      const primary =
        user.emailAddresses.find(
          (entry) => entry.id === user.primaryEmailAddressId
        ) ?? user.emailAddresses[0];

      return primary?.emailAddress ?? null;
    });

  app.decorate("requireAuth", async (request: FastifyRequest) => {
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new AppError({
        code: "AUTHENTICATION_REQUIRED",
        messageKey: "errors.auth.authentication_required",
        statusCode: 401
      });
    }

    const secretKey = app.config?.CLERK_SECRET_KEY;
    const jwtKey = app.config?.CLERK_JWT_KEY;

    if (!opts.verifyAuthToken && !secretKey && !jwtKey) {
      throw new AppError({
        code: "AUTH_NOT_CONFIGURED",
        messageKey: "errors.auth.not_configured",
        statusCode: 503
      });
    }

    let clerkUserId: string | undefined;

    try {
      const claims = await verifyAuthToken(token, { secretKey, jwtKey });
      clerkUserId = claims.sub;
    } catch (error) {
      request.log.warn({ err: error }, "auth_token_verification_failed");
      throw new AppError({
        code: "INVALID_AUTH_TOKEN",
        messageKey: "errors.auth.invalid_token",
        statusCode: 401
      });
    }

    if (!clerkUserId) {
      throw new AppError({
        code: "INVALID_AUTH_TOKEN",
        messageKey: "errors.auth.invalid_token",
        statusCode: 401
      });
    }

    request.authUser = await identityService.getOrSyncUserByClerkId(
      clerkUserId,
      () => fetchClerkUserEmail(clerkUserId)
    );
  });
});
