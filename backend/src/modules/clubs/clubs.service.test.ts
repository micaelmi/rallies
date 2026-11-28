import { describe, expect, it, vi } from "vitest";
import { InsufficientBalanceError } from "../wallet/wallet.types.js";
import type { WalletService } from "../wallet/wallet.service.js";
import { ClubsService } from "./clubs.service.js";
import {
  CLUB_CREATE_COST,
  ClubNotFoundError,
  UnauthorizedClubActionError,
  type ClubDetailResponse,
  type ClubMemberView,
  type ClubsRepository
} from "./clubs.types.js";

const now = new Date("2026-11-28T11:00:00.000Z");

const makeMember = (
  overrides: Partial<ClubMemberView> = {}
): ClubMemberView => ({
  id: "member_1",
  clubId: "club_1",
  userId: "user_owner",
  role: "OWNER",
  status: "ACTIVE",
  joinedAt: now,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const makeClub = (
  overrides: Partial<ClubDetailResponse> = {}
): ClubDetailResponse => ({
  id: "club_1",
  name: "Pinheiros Table Tennis",
  slug: "pinheiros-table-tennis",
  description: "Competitive and social club in Sao Paulo.",
  email: "club@pinheiros.example.com",
  phone: null,
  instagramUrl: null,
  country: "Brazil",
  state: "SP",
  city: "Sao Paulo",
  address: "Rua Hans Nobiling, 100",
  mapsUrl: null,
  maxMembers: 100,
  ownerId: "user_owner",
  status: "ACTIVE",
  memberCount: 1,
  members: [makeMember()],
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const createMockClubsRepository = (): {
  [K in keyof ClubsRepository]: ReturnType<typeof vi.fn<ClubsRepository[K]>>;
} => ({
  createClub: vi.fn(),
  findClubById: vi.fn(),
  searchClubs: vi.fn(),
  getClubMember: vi.fn(),
  upsertClubMember: vi.fn(),
  updateMemberStatus: vi.fn()
});

const createMockWalletService = () =>
  ({
    consumeCredits: vi.fn()
  }) as unknown as WalletService & {
    consumeCredits: ReturnType<typeof vi.fn>;
  };

describe("ClubsService", () => {
  const validKey = "550e8400-e29b-41d4-a716-446655440301";

  it("consumes CLUB_CREATE_COST credits before persisting a new club", async () => {
    const repo = createMockClubsRepository();
    const wallet = createMockWalletService();
    const club = makeClub();
    wallet.consumeCredits.mockResolvedValue({
      wallet: { balance: 50 },
      alreadyProcessed: false
    });
    repo.createClub.mockResolvedValue(club);

    const service = new ClubsService(repo, wallet);
    const result = await service.createClub("user_owner", {
      name: "Pinheiros Table Tennis",
      slug: "pinheiros-table-tennis",
      description: "Competitive and social club in Sao Paulo.",
      email: "club@pinheiros.example.com",
      country: "Brazil",
      state: "SP",
      city: "Sao Paulo",
      address: "Rua Hans Nobiling, 100",
      maxMembers: 100,
      idempotencyKey: validKey
    });

    expect(result.id).toBe("club_1");
    expect(wallet.consumeCredits).toHaveBeenCalledWith(
      "user_owner",
      CLUB_CREATE_COST,
      "CREATE_CLUB",
      validKey,
      "Create club Pinheiros Table Tennis"
    );
    expect(repo.createClub).toHaveBeenCalledWith(
      "user_owner",
      expect.objectContaining({
        name: "Pinheiros Table Tennis",
        slug: "pinheiros-table-tennis"
      })
    );
  });

  it("aborts club creation when wallet balance is insufficient", async () => {
    const repo = createMockClubsRepository();
    const wallet = createMockWalletService();
    wallet.consumeCredits.mockRejectedValue(
      new InsufficientBalanceError(10, CLUB_CREATE_COST)
    );

    const service = new ClubsService(repo, wallet);

    await expect(
      service.createClub("user_owner", {
        name: "Pinheiros Table Tennis",
        description: "Competitive club",
        email: "club@pinheiros.example.com",
        country: "Brazil",
        address: "Rua Hans Nobiling, 100",
        idempotencyKey: validKey
      })
    ).rejects.toBeInstanceOf(InsufficientBalanceError);

    expect(repo.createClub).not.toHaveBeenCalled();
  });

  it("allows OWNER to promote an active MEMBER to ADMIN", async () => {
    const repo = createMockClubsRepository();
    const wallet = createMockWalletService();
    repo.findClubById.mockResolvedValue(makeClub());
    repo.getClubMember
      .mockResolvedValueOnce(makeMember({ userId: "user_owner", role: "OWNER" }))
      .mockResolvedValueOnce(
        makeMember({ id: "member_2", userId: "user_2", role: "MEMBER" })
      );
    repo.updateMemberStatus.mockResolvedValue(
      makeMember({ id: "member_2", userId: "user_2", role: "ADMIN" })
    );

    const service = new ClubsService(repo, wallet);
    const updated = await service.respondToMembership(
      "club_1",
      "user_2",
      { role: "ADMIN" },
      "user_owner"
    );

    expect(updated.role).toBe("ADMIN");
    expect(repo.updateMemberStatus).toHaveBeenCalledWith(
      "club_1",
      "user_2",
      "ACTIVE",
      "ADMIN",
      now
    );
  });

  it("throws UnauthorizedClubActionError when a MEMBER attempts to remove or update another MEMBER", async () => {
    const repo = createMockClubsRepository();
    const wallet = createMockWalletService();
    repo.findClubById.mockResolvedValue(makeClub());
    repo.getClubMember.mockResolvedValueOnce(
      makeMember({ id: "member_2", userId: "user_2", role: "MEMBER" })
    );

    const service = new ClubsService(repo, wallet);

    await expect(
      service.respondToMembership(
        "club_1",
        "user_3",
        { status: "REMOVED" },
        "user_2"
      )
    ).rejects.toBeInstanceOf(UnauthorizedClubActionError);

    expect(repo.updateMemberStatus).not.toHaveBeenCalled();
  });

  it("allows ADMIN to accept a REQUESTED membership, but blocks ADMIN from modifying OWNER", async () => {
    const repo = createMockClubsRepository();
    const wallet = createMockWalletService();
    repo.findClubById.mockResolvedValue(makeClub());
    repo.getClubMember
      .mockResolvedValueOnce(makeMember({ userId: "user_admin", role: "ADMIN" }))
      .mockResolvedValueOnce(
        makeMember({
          id: "member_3",
          userId: "user_3",
          role: "MEMBER",
          status: "REQUESTED",
          joinedAt: null
        })
      );
    repo.updateMemberStatus.mockResolvedValue(
      makeMember({
        id: "member_3",
        userId: "user_3",
        role: "MEMBER",
        status: "ACTIVE"
      })
    );

    const service = new ClubsService(repo, wallet);
    const accepted = await service.respondToMembership(
      "club_1",
      "user_3",
      { action: "ACCEPT" },
      "user_admin"
    );

    expect(accepted.status).toBe("ACTIVE");

    repo.getClubMember
      .mockResolvedValueOnce(makeMember({ userId: "user_admin", role: "ADMIN" }))
      .mockResolvedValueOnce(
        makeMember({ userId: "user_owner", role: "OWNER" })
      );

    await expect(
      service.respondToMembership(
        "club_1",
        "user_owner",
        { status: "REMOVED" },
        "user_admin"
      )
    ).rejects.toBeInstanceOf(UnauthorizedClubActionError);
  });

  it("throws ClubNotFoundError when requesting membership for a missing club", async () => {
    const repo = createMockClubsRepository();
    const wallet = createMockWalletService();
    repo.findClubById.mockResolvedValue(null);

    const service = new ClubsService(repo, wallet);

    await expect(
      service.requestMembership("club_missing", "user_2")
    ).rejects.toBeInstanceOf(ClubNotFoundError);
  });
});
