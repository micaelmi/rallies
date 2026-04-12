import type { FastifyReply, FastifyRequest } from "fastify";
import type { IdentityService } from "./identity.service.js";
import type {
  CreateIdentityProfileInput,
  IdentityProfileListQuery,
  UpdateIdentityProfileInput
} from "./identity.types.js";

type IdentityProfileParams = {
  userId: string;
};

type CreateIdentityProfileRequest = FastifyRequest<{
  Body: CreateIdentityProfileInput;
}>;

type ListIdentityProfilesRequest = FastifyRequest<{
  Querystring: IdentityProfileListQuery;
}>;

type IdentityProfileByIdRequest = FastifyRequest<{
  Params: IdentityProfileParams;
}>;

type UpdateIdentityProfileRequest = FastifyRequest<{
  Params: IdentityProfileParams;
  Body: UpdateIdentityProfileInput;
}>;

export class IdentityController {
  public constructor(private readonly identityService: IdentityService) {}

  public createProfile = async (
    request: CreateIdentityProfileRequest,
    reply: FastifyReply
  ) => {
    const result = await this.identityService.createProfile(request.body);
    return reply.status(201).send(result);
  };

  public listProfiles = async (
    request: ListIdentityProfilesRequest,
    reply: FastifyReply
  ) => {
    const result = await this.identityService.listProfiles(request.query);
    return reply.status(200).send(result);
  };

  public getProfileByUserId = async (
    request: IdentityProfileByIdRequest,
    reply: FastifyReply
  ) => {
    const result = await this.identityService.getProfileByUserId(request.params.userId);
    return reply.status(200).send(result);
  };

  public updateProfile = async (
    request: UpdateIdentityProfileRequest,
    reply: FastifyReply
  ) => {
    const result = await this.identityService.updateProfile(request.params.userId, request.body);
    return reply.status(200).send(result);
  };

  public deleteIdentity = async (
    request: IdentityProfileByIdRequest,
    reply: FastifyReply
  ) => {
    await this.identityService.deleteIdentity(request.params.userId);
    return reply.status(204).send(null);
  };
}
