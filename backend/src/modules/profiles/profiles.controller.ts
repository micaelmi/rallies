import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../shared/errors/app-error.js";
import type { ProfilesService } from "./profiles.service.js";
import type {
  CreateProfileInput,
  ProfileAuthenticatedHeaders,
  PublicProfileParams,
  UpdateProfileInput
} from "./profiles.types.js";

type AuthenticatedProfileRequest = FastifyRequest<{
  Headers: ProfileAuthenticatedHeaders;
}>;

type CreateProfileRequest = FastifyRequest<{
  Headers: ProfileAuthenticatedHeaders;
  Body: CreateProfileInput;
}>;

type UpdateOwnProfileRequest = FastifyRequest<{
  Headers: ProfileAuthenticatedHeaders;
  Body: UpdateProfileInput;
}>;

type PublicProfileRequest = FastifyRequest<{
  Params: PublicProfileParams;
}>;

const getAuthenticatedUserId = (
  request: AuthenticatedProfileRequest
): string => {
  const userId = request.headers["x-user-id"];

  if (!userId) {
    throw new AppError({
      code: "AUTHENTICATION_REQUIRED",
      messageKey: "errors.auth.authentication_required",
      statusCode: 401
    });
  }

  return userId;
};

export class ProfilesController {
  public constructor(private readonly profilesService: ProfilesService) {}

  public createProfile = async (
    request: CreateProfileRequest,
    reply: FastifyReply
  ) => {
    const result = await this.profilesService.createProfile(
      getAuthenticatedUserId(request),
      request.body,
      request.locale
    );

    return reply.status(201).send(result);
  };

  public updateOwnProfile = async (
    request: UpdateOwnProfileRequest,
    reply: FastifyReply
  ) => {
    const result = await this.profilesService.updateOwnProfile(
      getAuthenticatedUserId(request),
      request.body
    );

    return reply.status(200).send(result);
  };

  public getOwnProfile = async (
    request: AuthenticatedProfileRequest,
    reply: FastifyReply
  ) => {
    const result = await this.profilesService.getOwnProfile(
      getAuthenticatedUserId(request)
    );

    return reply.status(200).send(result);
  };

  public getPublicProfileByUsername = async (
    request: PublicProfileRequest,
    reply: FastifyReply
  ) => {
    const result = await this.profilesService.getPublicProfileByUsername(
      request.params.username
    );

    return reply.status(200).send(result);
  };
}
