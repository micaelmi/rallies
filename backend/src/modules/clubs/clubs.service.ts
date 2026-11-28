import { AppError } from "../../shared/errors/app-error.js";
import type { WalletService } from "../wallet/wallet.service.js";
import {
  CLUB_CREATE_COST,
  ClubNotFoundError,
  UnauthorizedClubActionError,
  type ClubDetailResponse,
  type ClubMemberRole,
  type ClubMemberStatus,
  type ClubMemberView,
  type ClubsRepository,
  type CreateClubInput,
  type SearchClubsFilters,
  type SearchClubsResponse,
  type UpdateClubMemberInput
} from "./clubs.types.js";

const slugifyClubName = (name: string): string => {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return base || "club";
};

export class ClubsService {
  public constructor(
    private readonly clubsRepository: ClubsRepository,
    private readonly walletService: WalletService
  ) {}

  public async createClub(
    ownerId: string,
    input: CreateClubInput
  ): Promise<ClubDetailResponse> {
    const slug =
      input.slug ?? `${slugifyClubName(input.name)}-${Date.now().toString(36)}`;

    await this.walletService.consumeCredits(
      ownerId,
      CLUB_CREATE_COST,
      "CREATE_CLUB",
      input.idempotencyKey,
      `Create club ${input.name}`
    );

    const { idempotencyKey: _idempotencyKey, slug: _slug, ...rest } = input;
    return this.clubsRepository.createClub(ownerId, {
      ...rest,
      slug
    });
  }

  public async searchClubs(
    filters: SearchClubsFilters
  ): Promise<SearchClubsResponse> {
    return this.clubsRepository.searchClubs(filters);
  }

  public async getClubById(clubId: string): Promise<ClubDetailResponse> {
    const club = await this.clubsRepository.findClubById(clubId);

    if (!club) {
      throw new ClubNotFoundError(clubId);
    }

    return club;
  }

  public async requestMembership(
    clubId: string,
    userId: string
  ): Promise<ClubMemberView> {
    const club = await this.clubsRepository.findClubById(clubId);

    if (!club || club.status !== "ACTIVE") {
      throw new ClubNotFoundError(clubId);
    }

    const existing = await this.clubsRepository.getClubMember(clubId, userId);

    if (existing?.status === "ACTIVE") {
      throw new AppError({
        code: "ALREADY_CLUB_MEMBER",
        messageKey: "errors.clubs.already_member",
        statusCode: 409,
        details: { clubId }
      });
    }

    if (existing?.status === "REQUESTED") {
      return existing;
    }

    return this.clubsRepository.upsertClubMember(
      clubId,
      userId,
      "REQUESTED",
      "MEMBER",
      null
    );
  }

  public async respondToMembership(
    clubId: string,
    targetUserId: string,
    input: UpdateClubMemberInput,
    actorUserId: string
  ): Promise<ClubMemberView> {
    const club = await this.clubsRepository.findClubById(clubId);

    if (!club) {
      throw new ClubNotFoundError(clubId);
    }

    const actor = await this.clubsRepository.getClubMember(clubId, actorUserId);

    if (
      !actor ||
      actor.status !== "ACTIVE" ||
      (actor.role !== "OWNER" && actor.role !== "ADMIN")
    ) {
      throw new UnauthorizedClubActionError({ clubId, actorUserId });
    }

    const target = await this.clubsRepository.getClubMember(
      clubId,
      targetUserId
    );

    if (!target) {
      throw new AppError({
        code: "CLUB_MEMBER_NOT_FOUND",
        messageKey: "errors.clubs.member_not_found",
        statusCode: 404,
        details: { clubId, userId: targetUserId }
      });
    }

    if (target.role === "OWNER" && actor.role !== "OWNER") {
      throw new UnauthorizedClubActionError({ clubId, targetUserId });
    }

    if (input.role === "OWNER" && actor.role !== "OWNER") {
      throw new UnauthorizedClubActionError({ clubId, targetUserId });
    }

    if (
      actor.role === "ADMIN" &&
      target.role === "ADMIN" &&
      target.userId !== actorUserId
    ) {
      throw new UnauthorizedClubActionError({ clubId, targetUserId });
    }

    let nextStatus: ClubMemberStatus = input.status ?? target.status;
    let nextRole: ClubMemberRole = input.role ?? target.role;
    let nextJoinedAt: Date | null = target.joinedAt;

    if (input.action === "ACCEPT") {
      nextStatus = "ACTIVE";
      nextJoinedAt = target.joinedAt ?? new Date();
    } else if (input.action === "REJECT") {
      nextStatus = "REMOVED";
      nextRole = "MEMBER";
      nextJoinedAt = null;
    } else if (nextStatus === "ACTIVE" && !nextJoinedAt) {
      nextJoinedAt = new Date();
    } else if (nextStatus === "REMOVED") {
      nextJoinedAt = null;
    }

    return this.clubsRepository.updateMemberStatus(
      clubId,
      targetUserId,
      nextStatus,
      nextRole,
      nextJoinedAt
    );
  }
}
