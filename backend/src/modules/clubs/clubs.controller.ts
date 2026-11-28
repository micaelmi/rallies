import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../shared/errors/app-error.js";
import type { ClubsService } from "./clubs.service.js";
import type {
  CreateClubInput,
  SearchClubsFilters,
  UpdateClubMemberInput
} from "./clubs.types.js";

type SearchClubsRequest = FastifyRequest<{
  Querystring: SearchClubsFilters;
}>;

type ClubIdRequest = FastifyRequest<{
  Params: { id: string };
}>;

type CreateClubRequest = FastifyRequest<{
  Body: CreateClubInput;
}>;

type UpdateClubMemberRequest = FastifyRequest<{
  Params: { id: string; userId: string };
  Body: UpdateClubMemberInput;
}>;

const getAuthenticatedUserId = (request: FastifyRequest): string => {
  const userId = request.authUser?.userId;

  if (!userId) {
    throw new AppError({
      code: "AUTHENTICATION_REQUIRED",
      messageKey: "errors.auth.authentication_required",
      statusCode: 401
    });
  }

  return userId;
};

export class ClubsController {
  public constructor(private readonly clubsService: ClubsService) {}

  public searchClubs = async (
    request: SearchClubsRequest,
    reply: FastifyReply
  ) => {
    const result = await this.clubsService.searchClubs(request.query);
    return reply.status(200).send(result);
  };

  public getClubById = async (request: ClubIdRequest, reply: FastifyReply) => {
    const result = await this.clubsService.getClubById(request.params.id);
    return reply.status(200).send(result);
  };

  public createClub = async (
    request: CreateClubRequest,
    reply: FastifyReply
  ) => {
    const result = await this.clubsService.createClub(
      getAuthenticatedUserId(request),
      request.body
    );

    return reply.status(201).send(result);
  };

  public requestMembership = async (
    request: ClubIdRequest,
    reply: FastifyReply
  ) => {
    const result = await this.clubsService.requestMembership(
      request.params.id,
      getAuthenticatedUserId(request)
    );

    return reply.status(200).send(result);
  };

  public updateMember = async (
    request: UpdateClubMemberRequest,
    reply: FastifyReply
  ) => {
    const result = await this.clubsService.respondToMembership(
      request.params.id,
      request.params.userId,
      request.body,
      getAuthenticatedUserId(request)
    );

    return reply.status(200).send(result);
  };
}
