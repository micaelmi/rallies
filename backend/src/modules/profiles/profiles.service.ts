import { ProfileStatus } from "@prisma/client";
import { AppError } from "../../shared/errors/app-error.js";
import { mapPrismaError } from "../../infra/database/prisma-errors.js";
import type {
  CreateProfileInput,
  ProfilesRepository,
  UpdateProfileInput
} from "./profiles.types.js";

const trimOptional = (value?: string | null): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value.trim();
};

export class ProfilesService {
  public constructor(private readonly profilesRepository: ProfilesRepository) {}

  public async createProfile(
    userId: string,
    input: CreateProfileInput,
    fallbackLocale: string
  ) {
    const user = await this.profilesRepository.findUserById(userId);

    if (!user) {
      throw new AppError({
        code: "PROFILE_OWNER_NOT_FOUND",
        messageKey: "errors.profiles.owner_not_found",
        statusCode: 404,
        details: { userId }
      });
    }

    if (user.hasProfile) {
      throw new AppError({
        code: "PROFILE_ALREADY_EXISTS",
        messageKey: "errors.profiles.profile_already_exists",
        statusCode: 409,
        details: { userId }
      });
    }

    const trimmedUsername = input.username.trim();
    const existingProfile = await this.profilesRepository.findProfileByUsername(
      trimmedUsername
    );

    if (existingProfile) {
      throw new AppError({
        code: "PROFILE_USERNAME_ALREADY_EXISTS",
        messageKey: "errors.profiles.username_conflict",
        statusCode: 409,
        details: { username: trimmedUsername }
      });
    }

    try {
      return await this.profilesRepository.createProfile(userId, {
        ...input,
        username: trimmedUsername,
        city: input.city ? input.city.trim() : undefined,
        state: input.state ? input.state.trim() : undefined,
        country: input.country.trim(),
        instagramUrl: input.instagramUrl ? input.instagramUrl.trim() : undefined,
        description: input.description ? input.description.trim() : undefined,
        preferredLocale: input.preferredLocale ?? fallbackLocale,
        status: ProfileStatus.ACTIVE
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  public async updateOwnProfile(userId: string, input: UpdateProfileInput) {
    const currentProfile = await this.profilesRepository.findOwnProfileByUserId(
      userId
    );

    if (!currentProfile) {
      throw new AppError({
        code: "PROFILE_NOT_FOUND",
        messageKey: "errors.profiles.profile_not_found",
        statusCode: 404,
        details: { userId }
      });
    }

    const trimmedUsername = input.username !== undefined ? input.username.trim() : undefined;

    if (
      trimmedUsername !== undefined &&
      trimmedUsername !== currentProfile.username
    ) {
      const conflictingProfile =
        await this.profilesRepository.findProfileByUsername(trimmedUsername);

      if (conflictingProfile && conflictingProfile.userId !== userId) {
        throw new AppError({
          code: "PROFILE_USERNAME_ALREADY_EXISTS",
          messageKey: "errors.profiles.username_conflict",
          statusCode: 409,
          details: { username: trimmedUsername }
        });
      }
    }

    try {
      return await this.profilesRepository.updateProfile(userId, {
        ...input,
        username: trimmedUsername,
        city: trimOptional(input.city),
        state: trimOptional(input.state),
        country: input.country !== undefined ? input.country.trim() : undefined,
        instagramUrl: trimOptional(input.instagramUrl),
        description: trimOptional(input.description),
        status:
          currentProfile.status === ProfileStatus.PENDING
            ? ProfileStatus.ACTIVE
            : undefined
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  public async getOwnProfile(userId: string) {
    const profile = await this.profilesRepository.findOwnProfileByUserId(userId);

    if (!profile) {
      throw new AppError({
        code: "PROFILE_NOT_FOUND",
        messageKey: "errors.profiles.profile_not_found",
        statusCode: 404,
        details: { userId }
      });
    }

    return profile;
  }

  public async getPublicProfileByUsername(username: string) {
    const profile = await this.profilesRepository.findPublicProfileByUsername(
      username
    );

    if (!profile) {
      throw new AppError({
        code: "PROFILE_NOT_FOUND",
        messageKey: "errors.profiles.profile_not_found",
        statusCode: 404,
        details: { username }
      });
    }

    return profile;
  }
}
