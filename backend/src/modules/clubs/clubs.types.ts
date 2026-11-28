import type { z } from "zod";
import { AppError } from "../../shared/errors/app-error.js";
import type {
  clubDetailResponseSchema,
  clubMemberViewSchema,
  clubSummarySchema,
  createClubRequestSchema,
  searchClubsQuerySchema,
  searchClubsResponseSchema,
  updateClubMemberBodySchema
} from "./clubs.schemas.js";

export const CLUB_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type ClubStatus = (typeof CLUB_STATUSES)[number];

export const CLUB_MEMBER_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
export type ClubMemberRole = (typeof CLUB_MEMBER_ROLES)[number];

export const CLUB_MEMBER_STATUSES = [
  "ACTIVE",
  "INVITED",
  "REQUESTED",
  "REMOVED"
] as const;
export type ClubMemberStatus = (typeof CLUB_MEMBER_STATUSES)[number];

export const CLUB_MEMBERSHIP_ACTIONS = ["ACCEPT", "REJECT"] as const;
export type ClubMembershipAction = (typeof CLUB_MEMBERSHIP_ACTIONS)[number];

export const CLUB_CREATE_COST = 50;

export class UnauthorizedClubActionError extends AppError {
  public constructor(details?: Record<string, unknown>) {
    super({
      code: "UNAUTHORIZED_CLUB_ACTION",
      messageKey: "errors.clubs.unauthorized_action",
      statusCode: 403,
      ...(details ? { details } : {})
    });
    this.name = "UnauthorizedClubActionError";
  }
}

export class ClubNotFoundError extends AppError {
  public constructor(clubId: string) {
    super({
      code: "CLUB_NOT_FOUND",
      messageKey: "errors.clubs.not_found",
      statusCode: 404,
      details: { clubId }
    });
    this.name = "ClubNotFoundError";
  }
}

export type CreateClubInput = z.infer<typeof createClubRequestSchema>;
export type SearchClubsFilters = z.infer<typeof searchClubsQuerySchema>;
export type UpdateClubMemberInput = z.infer<typeof updateClubMemberBodySchema>;

export type ClubSummary = z.infer<typeof clubSummarySchema>;
export type ClubMemberView = z.infer<typeof clubMemberViewSchema>;
export type ClubDetailResponse = z.infer<typeof clubDetailResponseSchema>;
export type SearchClubsResponse = z.infer<typeof searchClubsResponseSchema>;

export type CreateClubPersistenceInput = Omit<
  CreateClubInput,
  "idempotencyKey" | "slug"
> & {
  slug: string;
};

export interface ClubsRepository {
  createClub(
    ownerId: string,
    data: CreateClubPersistenceInput
  ): Promise<ClubDetailResponse>;
  findClubById(clubId: string): Promise<ClubDetailResponse | null>;
  searchClubs(filters: SearchClubsFilters): Promise<SearchClubsResponse>;
  getClubMember(
    clubId: string,
    userId: string
  ): Promise<ClubMemberView | null>;
  upsertClubMember(
    clubId: string,
    userId: string,
    status: ClubMemberStatus,
    role: ClubMemberRole,
    joinedAt: Date | null
  ): Promise<ClubMemberView>;
  updateMemberStatus(
    clubId: string,
    userId: string,
    status: ClubMemberStatus,
    role: ClubMemberRole,
    joinedAt: Date | null
  ): Promise<ClubMemberView>;
}
