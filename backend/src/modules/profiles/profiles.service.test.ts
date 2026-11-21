import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../shared/errors/app-error.js";
import { ProfilesService } from "./profiles.service.js";
import type {
  OwnProfile,
  ProfilesRepository,
  PublicProfile
} from "./profiles.types.js";

const now = new Date("2026-07-21T12:00:00.000Z");

const makeOwnProfile = (overrides: Partial<OwnProfile> = {}): OwnProfile => ({
  userId: "user_1",
  username: "hugo_tt",
  city: "Rio de Janeiro",
  state: "RJ",
  country: "Brazil",
  instagramUrl: "https://www.instagram.com/hugo_tt",
  description: "Shakehand attacker",
  preferredLocale: "pt-BR",
  status: "ACTIVE",
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const makePublicProfile = (
  overrides: Partial<PublicProfile> = {}
): PublicProfile => ({
  username: "hugo_tt",
  city: "Rio de Janeiro",
  state: "RJ",
  country: "Brazil",
  instagramUrl: "https://www.instagram.com/hugo_tt",
  description: "Shakehand attacker",
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const createMockRepository = (): {
  [K in keyof ProfilesRepository]: ReturnType<typeof vi.fn<ProfilesRepository[K]>>;
} => ({
  findUserById: vi.fn(),
  findOwnProfileByUserId: vi.fn(),
  findProfileByUsername: vi.fn(),
  findPublicProfileByUsername: vi.fn(),
  createProfile: vi.fn(),
  updateProfile: vi.fn()
});

describe("ProfilesService", () => {
  describe("createProfile", () => {
    it("creates an ACTIVE profile, trims fields, and falls back to request locale", async () => {
      const repo = createMockRepository();
      const expected = makeOwnProfile({ preferredLocale: "pt-BR" });

      repo.findUserById.mockResolvedValue({ userId: "user_1", hasProfile: false });
      repo.findProfileByUsername.mockResolvedValue(null);
      repo.createProfile.mockResolvedValue(expected);

      const service = new ProfilesService(repo);
      const result = await service.createProfile(
        "user_1",
        {
          username: "  hugo_tt  ",
          city: "  Rio de Janeiro ",
          state: " RJ ",
          country: " Brazil ",
          instagramUrl: " https://www.instagram.com/hugo_tt ",
          description: " Shakehand attacker "
        },
        "pt-BR"
      );

      expect(result).toEqual(expected);
      expect(repo.findProfileByUsername).toHaveBeenCalledWith("hugo_tt");
      expect(repo.createProfile).toHaveBeenCalledWith("user_1", {
        username: "hugo_tt",
        city: "Rio de Janeiro",
        state: "RJ",
        country: "Brazil",
        instagramUrl: "https://www.instagram.com/hugo_tt",
        description: "Shakehand attacker",
        preferredLocale: "pt-BR",
        status: "ACTIVE"
      });
    });

    it("preserves explicit preferredLocale and handles omitted optional fields", async () => {
      const repo = createMockRepository();
      const expected = makeOwnProfile({
        city: null,
        state: null,
        instagramUrl: null,
        description: null,
        preferredLocale: "en"
      });

      repo.findUserById.mockResolvedValue({ userId: "user_1", hasProfile: false });
      repo.findProfileByUsername.mockResolvedValue(null);
      repo.createProfile.mockResolvedValue(expected);

      const service = new ProfilesService(repo);
      await service.createProfile(
        "user_1",
        {
          username: "hugo_tt",
          country: "Brazil",
          preferredLocale: "en"
        },
        "pt-BR"
      );

      expect(repo.createProfile).toHaveBeenCalledWith("user_1", {
        username: "hugo_tt",
        city: undefined,
        state: undefined,
        country: "Brazil",
        instagramUrl: undefined,
        description: undefined,
        preferredLocale: "en",
        status: "ACTIVE"
      });
    });

    it("throws 404 PROFILE_OWNER_NOT_FOUND when user does not exist", async () => {
      const repo = createMockRepository();
      repo.findUserById.mockResolvedValue(null);

      const service = new ProfilesService(repo);

      await expect(
        service.createProfile(
          "missing_user",
          { username: "hugo_tt", country: "Brazil" },
          "en"
        )
      ).rejects.toMatchObject({
        code: "PROFILE_OWNER_NOT_FOUND",
        messageKey: "errors.profiles.owner_not_found",
        statusCode: 404
      });
      expect(repo.createProfile).not.toHaveBeenCalled();
    });

    it("throws 409 PROFILE_ALREADY_EXISTS when user already has a profile", async () => {
      const repo = createMockRepository();
      repo.findUserById.mockResolvedValue({ userId: "user_1", hasProfile: true });

      const service = new ProfilesService(repo);

      await expect(
        service.createProfile(
          "user_1",
          { username: "hugo_tt", country: "Brazil" },
          "en"
        )
      ).rejects.toMatchObject({
        code: "PROFILE_ALREADY_EXISTS",
        messageKey: "errors.profiles.profile_already_exists",
        statusCode: 409
      });
      expect(repo.createProfile).not.toHaveBeenCalled();
    });

    it("throws 409 PROFILE_USERNAME_ALREADY_EXISTS on username collision", async () => {
      const repo = createMockRepository();
      repo.findUserById.mockResolvedValue({ userId: "user_2", hasProfile: false });
      repo.findProfileByUsername.mockResolvedValue(makeOwnProfile({ userId: "user_1" }));

      const service = new ProfilesService(repo);

      await expect(
        service.createProfile(
          "user_2",
          { username: "hugo_tt", country: "Brazil" },
          "en"
        )
      ).rejects.toMatchObject({
        code: "PROFILE_USERNAME_ALREADY_EXISTS",
        messageKey: "errors.profiles.username_conflict",
        statusCode: 409
      });
      expect(repo.createProfile).not.toHaveBeenCalled();
    });
  });

  describe("updateOwnProfile", () => {
    it("activates a PENDING profile, trims strings, and preserves explicit null clears", async () => {
      const repo = createMockRepository();
      const current = makeOwnProfile({ status: "PENDING" });
      const updated = makeOwnProfile({
        status: "ACTIVE",
        city: null,
        country: "Portugal",
        description: "Updated bio"
      });

      repo.findOwnProfileByUserId.mockResolvedValue(current);
      repo.updateProfile.mockResolvedValue(updated);

      const service = new ProfilesService(repo);
      const result = await service.updateOwnProfile("user_1", {
        city: null,
        state: " Lisbon ",
        country: " Portugal ",
        instagramUrl: null,
        description: " Updated bio "
      });

      expect(result).toEqual(updated);
      expect(repo.findProfileByUsername).not.toHaveBeenCalled();
      expect(repo.updateProfile).toHaveBeenCalledWith("user_1", {
        username: undefined,
        city: null,
        state: "Lisbon",
        country: "Portugal",
        instagramUrl: null,
        description: "Updated bio",
        status: "ACTIVE"
      });
    });

    it("does not re-set status when profile is already ACTIVE and skips conflict check when username is unchanged", async () => {
      const repo = createMockRepository();
      const current = makeOwnProfile({ status: "ACTIVE", username: "hugo_tt" });
      repo.findOwnProfileByUserId.mockResolvedValue(current);
      repo.updateProfile.mockResolvedValue(current);

      const service = new ProfilesService(repo);
      await service.updateOwnProfile("user_1", {
        username: " hugo_tt ",
        description: "Same handle"
      });

      expect(repo.findProfileByUsername).not.toHaveBeenCalled();
      expect(repo.updateProfile).toHaveBeenCalledWith("user_1", {
        username: "hugo_tt",
        city: undefined,
        state: undefined,
        country: undefined,
        instagramUrl: undefined,
        description: "Same handle",
        status: undefined
      });
    });

    it("updates username when new handle is available", async () => {
      const repo = createMockRepository();
      const current = makeOwnProfile({ username: "hugo_tt" });
      const updated = makeOwnProfile({ username: "calderano_br" });

      repo.findOwnProfileByUserId.mockResolvedValue(current);
      repo.findProfileByUsername.mockResolvedValue(null);
      repo.updateProfile.mockResolvedValue(updated);

      const service = new ProfilesService(repo);
      const result = await service.updateOwnProfile("user_1", {
        username: "calderano_br"
      });

      expect(result.username).toBe("calderano_br");
      expect(repo.findProfileByUsername).toHaveBeenCalledWith("calderano_br");
    });

    it("throws 404 PROFILE_NOT_FOUND when caller has no profile", async () => {
      const repo = createMockRepository();
      repo.findOwnProfileByUserId.mockResolvedValue(null);

      const service = new ProfilesService(repo);

      await expect(
        service.updateOwnProfile("user_1", { country: "Japan" })
      ).rejects.toMatchObject({
        code: "PROFILE_NOT_FOUND",
        messageKey: "errors.profiles.profile_not_found",
        statusCode: 404
      });
    });

    it("throws 409 PROFILE_USERNAME_ALREADY_EXISTS when updating to another user's username", async () => {
      const repo = createMockRepository();
      repo.findOwnProfileByUserId.mockResolvedValue(
        makeOwnProfile({ userId: "user_1", username: "old_handle" })
      );
      repo.findProfileByUsername.mockResolvedValue(
        makeOwnProfile({ userId: "user_2", username: "taken_handle" })
      );

      const service = new ProfilesService(repo);

      await expect(
        service.updateOwnProfile("user_1", { username: "taken_handle" })
      ).rejects.toMatchObject({
        code: "PROFILE_USERNAME_ALREADY_EXISTS",
        messageKey: "errors.profiles.username_conflict",
        statusCode: 409
      });
      expect(repo.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe("getOwnProfile", () => {
    it("returns own profile when found", async () => {
      const repo = createMockRepository();
      const own = makeOwnProfile();
      repo.findOwnProfileByUserId.mockResolvedValue(own);

      const service = new ProfilesService(repo);
      await expect(service.getOwnProfile("user_1")).resolves.toEqual(own);
    });

    it("throws 404 PROFILE_NOT_FOUND when missing", async () => {
      const repo = createMockRepository();
      repo.findOwnProfileByUserId.mockResolvedValue(null);

      const service = new ProfilesService(repo);
      await expect(service.getOwnProfile("user_1")).rejects.toBeInstanceOf(AppError);
      await expect(service.getOwnProfile("user_1")).rejects.toMatchObject({
        code: "PROFILE_NOT_FOUND",
        statusCode: 404
      });
    });
  });

  describe("getPublicProfileByUsername", () => {
    it("returns privacy-safe public profile without internal fields", async () => {
      const repo = createMockRepository();
      const publicProfile = makePublicProfile();
      repo.findPublicProfileByUsername.mockResolvedValue(publicProfile);

      const service = new ProfilesService(repo);
      const result = await service.getPublicProfileByUsername("hugo_tt");

      expect(result).toEqual(publicProfile);
      expect(result).not.toHaveProperty("userId");
      expect(result).not.toHaveProperty("preferredLocale");
      expect(result).not.toHaveProperty("status");
    });

    it("throws 404 PROFILE_NOT_FOUND when profile does not exist or is not active", async () => {
      const repo = createMockRepository();
      repo.findPublicProfileByUsername.mockResolvedValue(null);

      const service = new ProfilesService(repo);
      await expect(
        service.getPublicProfileByUsername("hidden_player")
      ).rejects.toMatchObject({
        code: "PROFILE_NOT_FOUND",
        messageKey: "errors.profiles.profile_not_found",
        statusCode: 404
      });
    });
  });
});
