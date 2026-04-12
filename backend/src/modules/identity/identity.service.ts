import { AppError } from "../../shared/errors/app-error.js";
import { mapPrismaError } from "../../infra/database/prisma-errors.js";
import type {
  ClerkSyncUserInput,
  CreateIdentityProfileInput,
  IdentityProfileListQuery,
  IdentityRepository,
  UpdateIdentityProfileInput
} from "./identity.types.js";

export class IdentityService {
  public constructor(private readonly identityRepository: IdentityRepository) {}

  public async createProfile(input: CreateIdentityProfileInput) {
    const existingClerkUser =
      await this.identityRepository.findUserByClerkUserId(input.clerkUserId);
    const emailConflictUser = await this.identityRepository.findUserByEmail(
      input.email
    );
    const conflicts = await this.identityRepository.findConflicts({
      email: input.email,
      ...(existingClerkUser ? {} : { clerkUserId: input.clerkUserId }),
      username: input.username,
      ...(existingClerkUser?.userId
        ? { excludeUserId: existingClerkUser.userId }
        : {})
    });

    if (existingClerkUser) {
      if (existingClerkUser.hasProfile) {
        throw new AppError({
          code: "IDENTITY_ALREADY_EXISTS",
          messageKey: "errors.identity.user_or_profile_conflict",
          statusCode: 409,
          details: {
            email: false,
            clerkUserId: true,
            username: false
          }
        });
      }

      if (
        emailConflictUser &&
        emailConflictUser.userId !== existingClerkUser.userId
      ) {
        conflicts.email = true;
      }

      if (conflicts.email || conflicts.username) {
        throw new AppError({
          code: "IDENTITY_ALREADY_EXISTS",
          messageKey: "errors.identity.user_or_profile_conflict",
          statusCode: 409,
          details: conflicts
        });
      }

      try {
        return await this.identityRepository.createProfileForExistingUser(
          existingClerkUser.userId,
          input
        );
      } catch (error) {
        mapPrismaError(error);
      }
    }

    if (conflicts.email || conflicts.clerkUserId || conflicts.username) {
      throw new AppError({
        code: "IDENTITY_ALREADY_EXISTS",
        messageKey: "errors.identity.user_or_profile_conflict",
        statusCode: 409,
        details: conflicts
      });
    }

    try {
      return await this.identityRepository.createUserWithProfile(input);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  public async listProfiles(input: IdentityProfileListQuery) {
    return this.identityRepository.listProfiles(input);
  }

  public async getProfileByUserId(userId: string) {
    const profile = await this.identityRepository.findProfileByUserId(userId);

    if (!profile) {
      throw new AppError({
        code: "IDENTITY_NOT_FOUND",
        messageKey: "errors.identity.profile_not_found",
        statusCode: 404,
        details: { userId }
      });
    }

    return profile;
  }

  public async updateProfile(
    userId: string,
    input: UpdateIdentityProfileInput
  ) {
    await this.getProfileByUserId(userId);

    const conflicts = await this.identityRepository.findConflicts({
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.username !== undefined ? { username: input.username } : {}),
      excludeUserId: userId
    });

    if (conflicts.email || conflicts.username) {
      throw new AppError({
        code: "IDENTITY_ALREADY_EXISTS",
        messageKey: "errors.identity.user_or_profile_conflict",
        statusCode: 409,
        details: conflicts
      });
    }

    try {
      return await this.identityRepository.updateProfile(userId, input);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  public async deleteIdentity(userId: string) {
    const existingUser = await this.identityRepository.findUserById(userId);

    if (!existingUser) {
      throw new AppError({
        code: "IDENTITY_NOT_FOUND",
        messageKey: "errors.identity.profile_not_found",
        statusCode: 404,
        details: { userId }
      });
    }

    try {
      await this.identityRepository.deleteIdentity(userId);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  public async syncUserFromClerk(input: ClerkSyncUserInput) {
    try {
      await this.identityRepository.upsertUserFromClerk(input);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  public async deleteUserSyncedFromClerk(clerkUserId: string) {
    const existingUser =
      await this.identityRepository.findUserByClerkUserId(clerkUserId);

    if (!existingUser) {
      return;
    }

    try {
      await this.identityRepository.deleteUserByClerkUserId(clerkUserId);
    } catch (error) {
      mapPrismaError(error);
    }
  }
}
